import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/shared";
import { Copy, Check, Link2, Code, Share2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ShareEmbedDialogProps {
  open: boolean;
  onClose: () => void;
  file: {
    publicUrl: string;
    file_type: "image" | "video";
    file_path: string;
  } | null;
}

export function ShareEmbedDialog({
  open,
  onClose,
  file,
}: ShareEmbedDialogProps) {
  const { copiedId, copy } = useCopyToClipboard({ showToast: true, successMessage: "Link copied to clipboard" });

  if (!file) return null;

  const fileName = file.file_path.split("/").pop() || "media";

  const directUrl = file.publicUrl;

  const htmlEmbed =
    file.file_type === "image"
      ? `<img src="${file.publicUrl}" alt="${fileName}" />`
      : `<video src="${file.publicUrl}" controls></video>`;

  const markdownEmbed =
    file.file_type === "image"
      ? `![${fileName}](${file.publicUrl})`
      : `[${fileName}](${file.publicUrl})`;

  const bbCodeEmbed =
    file.file_type === "image"
      ? `[img]${file.publicUrl}[/img]`
      : `[video]${file.publicUrl}[/video]`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share & Embed
          </DialogTitle>
          <DialogDescription>
            Get links and embed codes for "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="w-4 h-4" />
              Direct Link
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-2">
              <Code className="w-4 h-4" />
              Embed Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Direct URL</Label>
              <div className="flex gap-2">
                <Input value={directUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(directUrl, "direct")}
                >
                  {copiedId === "direct" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Preview
              </Label>
              {file.file_type === "image" ? (
                <img
                  src={file.publicUrl}
                  alt=""
                  className="max-h-40 rounded object-contain mx-auto"
                />
              ) : (
                <video
                  src={file.publicUrl}
                  controls
                  className="max-h-40 rounded mx-auto"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>HTML Embed</Label>
              <div className="flex gap-2">
                <Textarea
                  value={htmlEmbed}
                  readOnly
                  className="font-mono text-sm resize-none"
                  rows={2}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copy(htmlEmbed, "html")}
                >
                  {copiedId === "html" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Markdown</Label>
              <div className="flex gap-2">
                <Input
                  value={markdownEmbed}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(markdownEmbed, "markdown")}
                >
                  {copiedId === "markdown" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>BBCode</Label>
              <div className="flex gap-2">
                <Input
                  value={bbCodeEmbed}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(bbCodeEmbed, "bbcode")}
                >
                  {copiedId === "bbcode" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
