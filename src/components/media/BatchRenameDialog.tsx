import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileEdit, Hash, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaFile {
  id: string;
  file_path: string;
  cloudinary_public_id?: string;
  storage_bucket: string;
}

interface BatchRenameDialogProps {
  open: boolean;
  onClose: () => void;
  files: MediaFile[];
  onRenameComplete?: () => void;
}

type NumberingStyle = "numeric" | "padded" | "alpha";

const NUMBERING_STYLES = {
  numeric: { label: "1, 2, 3...", example: "image-1, image-2, image-3" },
  padded: { label: "001, 002, 003...", example: "image-001, image-002, image-003" },
  alpha: { label: "a, b, c...", example: "image-a, image-b, image-c" },
};

function getNumberSuffix(index: number, style: NumberingStyle, padLength: number = 3): string {
  switch (style) {
    case "numeric":
      return String(index + 1);
    case "padded":
      return String(index + 1).padStart(padLength, "0");
    case "alpha":
      // Convert to a, b, c... z, aa, ab, etc.
      let result = "";
      let n = index;
      do {
        result = String.fromCharCode(97 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return result;
    default:
      return String(index + 1);
  }
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot !== -1 ? filename.slice(lastDot) : "";
}

function getBaseName(filePath: string): string {
  const filename = filePath.split("/").pop() || "";
  const lastDot = filename.lastIndexOf(".");
  return lastDot !== -1 ? filename.slice(0, lastDot) : filename;
}

export function BatchRenameDialog({
  open,
  onClose,
  files,
  onRenameComplete,
}: BatchRenameDialogProps) {
  const [baseName, setBaseName] = useState("image");
  const [separator, setSeparator] = useState("-");
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyle>("padded");
  const [startNumber, setStartNumber] = useState(1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (open && files.length > 0) {
      // Try to use the first file's base name as default
      const firstFileBaseName = getBaseName(files[0].file_path);
      // Remove any existing numbering pattern
      const cleanName = firstFileBaseName.replace(/[-_]?\d+$/, "").replace(/[-_]?[a-z]$/, "");
      setBaseName(cleanName || "image");
      setStartNumber(1);
      setProgress({ current: 0, total: 0 });
    }
  }, [open, files]);

  const generateNewName = (index: number, originalPath: string): string => {
    const ext = getExtension(originalPath.split("/").pop() || "");
    const suffix = getNumberSuffix(index + startNumber - 1, numberingStyle);
    const actualSeparator = separator === "none" ? "" : separator;
    return `${baseName}${actualSeparator}${suffix}${ext}`;
  };

  const previewNames = files.slice(0, 5).map((file, index) => ({
    original: file.file_path.split("/").pop() || "",
    new: generateNewName(index, file.file_path),
  }));

  const handleBatchRename = async () => {
    if (files.length === 0) return;

    setIsRenaming(true);
    setProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const newName = generateNewName(i, file.file_path);

      try {
        // For Cloudinary files, use the rename edge function
        if (file.storage_bucket === "cloudinary" && file.cloudinary_public_id) {
          const { data, error } = await supabase.functions.invoke("cloudinary-rename", {
            body: {
              fileId: file.id,
              newName: newName.replace(/\.[^/.]+$/, ""), // Remove extension for Cloudinary
            },
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Rename failed");
        } else {
          // For non-Cloudinary files, just update the file_path in database
          const pathParts = file.file_path.split("/");
          pathParts[pathParts.length - 1] = newName;
          const newPath = pathParts.join("/");

          const { error } = await supabase
            .from("media_files")
            .update({ file_path: newPath })
            .eq("id", file.id);

          if (error) throw error;
        }

        successCount++;
      } catch (error) {
        console.error(`Failed to rename file ${file.id}:`, error);
        failCount++;
      }

      setProgress({ current: i + 1, total: files.length });
    }

    setIsRenaming(false);

    if (failCount === 0) {
      toast({
        title: "Batch rename complete",
        description: `Successfully renamed ${successCount} files`,
      });
    } else {
      toast({
        title: "Batch rename completed with errors",
        description: `${successCount} succeeded, ${failCount} failed`,
        variant: "destructive",
      });
    }

    onRenameComplete?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Batch Rename
          </DialogTitle>
          <DialogDescription>
            Rename {files.length} selected files with a pattern
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pattern Settings */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Base Name</Label>
              <Input
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="image"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Separator</Label>
                <Select value={separator} onValueChange={setSeparator}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">Hyphen (-)</SelectItem>
                    <SelectItem value="_">Underscore (_)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Numbering Style</Label>
                <Select
                  value={numberingStyle}
                  onValueChange={(v) => setNumberingStyle(v as NumberingStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NUMBERING_STYLES).map(([key, style]) => (
                      <SelectItem key={key} value={key}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Start Number</Label>
              <Input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                min={1}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Preview
            </Label>
            <ScrollArea className="h-[140px] rounded-md border p-3">
              <div className="space-y-2">
                {previewNames.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm font-mono"
                  >
                    <span className="text-muted-foreground truncate max-w-[140px]">
                      {item.original}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-primary truncate max-w-[140px]">
                      {item.new}
                    </span>
                  </div>
                ))}
                {files.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ... and {files.length - 5} more files
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Progress */}
          {isRenaming && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Renaming files...</span>
                <span className="text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRenaming}>
            Cancel
          </Button>
          <Button
            onClick={handleBatchRename}
            disabled={isRenaming || !baseName.trim() || files.length === 0}
          >
            {isRenaming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Renaming...
              </>
            ) : (
              <>
                <FileEdit className="w-4 h-4 mr-2" />
                Rename {files.length} Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
