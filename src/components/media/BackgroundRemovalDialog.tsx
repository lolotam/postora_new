import { useState, useRef, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Download,
  RefreshCw,
  Scissors,
  SlidersHorizontal,
  Maximize2,
  Upload,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface BackgroundRemovalDialogProps {
  open: boolean;
  onClose: () => void;
  file: {
    id: string;
    publicUrl: string;
    cloudinary_public_id?: string;
    storage_bucket: string;
    folder_path?: string;
    file_path: string;
  } | null;
  cloudName: string;
  onProcessComplete?: () => void;
}

type EdgeMode = "none" | "fine";
type ResizeMode = "original" | "square" | "portrait" | "landscape" | "custom";

const RESIZE_PRESETS = {
  original: { label: "Original", width: null, height: null },
  square: { label: "Square (1:1)", width: 1024, height: 1024 },
  portrait: { label: "Portrait (4:5)", width: 1080, height: 1350 },
  landscape: { label: "Landscape (16:9)", width: 1920, height: 1080 },
  custom: { label: "Custom", width: null, height: null },
};

export function BackgroundRemovalDialog({
  open,
  onClose,
  file,
  cloudName,
  onProcessComplete,
}: BackgroundRemovalDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [comparePosition, setComparePosition] = useState(50);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("none");
  const [resizeMode, setResizeMode] = useState<ResizeMode>("original");
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tempCloudinaryData, setTempCloudinaryData] = useState<{
    publicId: string;
    cloudName: string;
    url: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isCloudinaryFile = file?.storage_bucket === "cloudinary" && !!file?.cloudinary_public_id;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setProcessedUrl(null);
      setComparePosition(50);
      setEdgeMode("none");
      setResizeMode("original");
      setTempCloudinaryData(null);
      setUploading(false);
    }
  }, [open]);

  const buildCloudinaryUrl = (publicId: string, targetCloudName: string) => {
    let transformations = [];

    // Add background removal
    if (edgeMode === "fine") {
      transformations.push("e_background_removal:fineedges_y");
    } else {
      transformations.push("e_background_removal");
    }

    // Add resize if needed
    if (resizeMode !== "original") {
      const preset = RESIZE_PRESETS[resizeMode];
      let width = preset.width;
      let height = preset.height;

      if (resizeMode === "custom") {
        width = customWidth;
        height = customHeight;
      }

      if (width && height) {
        transformations.push(`w_${width},h_${height},c_fill`);
      }
    }

    const transformString = transformations.join("/");
    return `https://res.cloudinary.com/${targetCloudName}/image/upload/${transformString}/${publicId}`;
  };

  // Upload non-Cloudinary file to Cloudinary first
  const uploadToCloudinary = async (): Promise<{ publicId: string; cloudName: string; url: string }> => {
    if (!file) throw new Error("No file selected");

    setUploading(true);

    try {
      // Fetch the image
      const response = await fetch(file.publicUrl);
      const blob = await response.blob();

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      // Get filename from path
      const fileName = file.file_path.split("/").pop() || `image-${Date.now()}`;

      // Upload to Cloudinary
      const { data, error } = await supabase.functions.invoke("cloudinary-upload", {
        body: {
          fileData: base64Data,
          fileName: fileName,
          fileType: "image",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      // Extract cloud name from returned URL
      const urlMatch = data.url.match(/res\.cloudinary\.com\/([^\/]+)/);
      const extractedCloudName = urlMatch ? urlMatch[1] : "";

      return {
        publicId: data.publicId,
        cloudName: extractedCloudName,
        url: data.url,
      };
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);

    try {
      let publicId: string;
      let targetCloudName: string;

      // If not a Cloudinary file, upload it first
      if (!isCloudinaryFile) {
        toast({
          title: "Uploading to Cloudinary",
          description: "The file needs to be uploaded to Cloudinary for background removal...",
        });

        const uploadResult = await uploadToCloudinary();
        publicId = uploadResult.publicId;
        targetCloudName = uploadResult.cloudName;
        setTempCloudinaryData(uploadResult);

        toast({
          title: "Upload complete",
          description: "Now processing background removal...",
        });
      } else {
        publicId = file.cloudinary_public_id!;
        targetCloudName = cloudName;
      }

      if (!targetCloudName) {
        throw new Error("Could not determine Cloudinary cloud name");
      }

      const url = buildCloudinaryUrl(publicId, targetCloudName);
      console.log("Background removal URL:", url);

      // Cloudinary may return 423 while processing, we poll until ready
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        const response = await fetch(url, { method: "HEAD" });

        if (response.ok) {
          setProcessedUrl(url);
          toast({
            title: "Background removed",
            description: "Use the slider to compare before and after",
          });
          break;
        } else if (response.status === 423) {
          // Still processing, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
          attempts++;
        } else if (response.status === 404) {
          throw new Error("Image not found in Cloudinary. It may have been deleted or the public ID is incorrect.");
        } else {
          throw new Error(`Cloudinary returned error: ${response.status}`);
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error("Processing timed out. Please try again.");
      }
    } catch (error) {
      console.error("Background removal error:", error);
      toast({
        title: "Processing failed",
        description:
          error instanceof Error ? error.message : "Failed to remove background",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!processedUrl) return;

    try {
      const response = await fetch(processedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bg-removed-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your processed image is downloading",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsNew = async () => {
    if (!processedUrl || !file) return;

    setSaving(true);

    try {
      // Download the processed image
      const response = await fetch(processedUrl);
      const blob = await response.blob();

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      // Generate filename based on original
      const originalName = file.file_path.split("/").pop() || "image";
      const baseName = originalName.replace(/\.[^/.]+$/, "");
      const newFileName = `${baseName}_bg-removed`;

      // Upload to Cloudinary via edge function
      const { data, error } = await supabase.functions.invoke(
        "cloudinary-upload",
        {
          body: {
            fileData: base64Data,
            fileName: newFileName,
            fileType: "image",
          },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      // Update the folder_path to match the original file's folder
      if (file.folder_path && data.mediaFileId) {
        await supabase
          .from("media_files")
          .update({ folder_path: file.folder_path })
          .eq("id", data.mediaFileId);
      }

      toast({
        title: "Saved to library",
        description: `The processed image has been saved${file.folder_path && file.folder_path !== "/" ? ` to ${file.folder_path}` : ""}`,
      });

      onProcessComplete?.();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save the image to your library",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setComparePosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setComparePosition(percentage);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Remove Background
          </DialogTitle>
          <DialogDescription>
            Remove the background from your image using AI. Use the slider to
            compare before and after.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Non-Cloudinary file notice */}
          {!isCloudinaryFile && !tempCloudinaryData && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                This file will be automatically uploaded to Cloudinary for background removal processing.
              </AlertDescription>
            </Alert>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Edge Quality
              </Label>
              <Select
                value={edgeMode}
                onValueChange={(v) => setEdgeMode(v as EdgeMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standard</SelectItem>
                  <SelectItem value="fine">Fine Edges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                Resize Output
              </Label>
              <Select
                value={resizeMode}
                onValueChange={(v) => setResizeMode(v as ResizeMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESIZE_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resizeMode === "custom" && (
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (px)</Label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    min={100}
                    max={4096}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    min={100}
                    max={4096}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image Comparison */}
          <div
            ref={containerRef}
            className="relative w-full aspect-video bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlMGUwZTAiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] rounded-lg overflow-hidden cursor-ew-resize select-none"
            onMouseMove={handleMouseMove}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
          >
            {file && (
              <>
                {/* Original Image (full width, clipped) */}
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                >
                  <img
                    src={file.publicUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur rounded text-xs font-medium">
                    Original
                  </div>
                </div>

                {/* Processed Image (full width, clipped from left) */}
                {processedUrl && (
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
                  >
                    <img
                      src={processedUrl}
                      alt="Processed"
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur rounded text-xs font-medium">
                      Removed
                    </div>
                  </div>
                )}

                {/* Slider Handle */}
                {processedUrl && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                    style={{ left: `${comparePosition}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary-foreground rounded" />
                        <div className="w-0.5 h-3 bg-primary-foreground rounded" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing/Uploading Overlay */}
                {(processing || uploading) && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm font-medium">
                        {uploading ? "Uploading to Cloudinary..." : "Removing background..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This may take a moment
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Slider for fine control */}
          {processedUrl && (
            <div className="space-y-2">
              <Label>Compare Position</Label>
              <Slider
                value={[comparePosition]}
                onValueChange={([v]) => setComparePosition(v)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!processedUrl ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                disabled={processing || uploading || !file}
              >
                {processing || uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploading ? "Uploading..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Remove Background
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setProcessedUrl(null);
                  setComparePosition(50);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="secondary" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleSaveAsNew} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to Library"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
