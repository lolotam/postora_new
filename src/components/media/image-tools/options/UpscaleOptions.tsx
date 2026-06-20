import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, Cloud, Sparkles } from "lucide-react";
import { UpscaleMode, UpscalePlatform } from "../types";

interface UpscaleOptionsProps {
  upscaleMode: UpscaleMode;
  onUpscaleModeChange: (mode: UpscaleMode) => void;
  upscalePlatform?: UpscalePlatform;
  onUpscalePlatformChange?: (platform: UpscalePlatform) => void;
  showAtlasCloud?: boolean; // Feature flag - when false, hide AtlasCloud option
}

export function UpscaleOptions({ 
  upscaleMode, 
  onUpscaleModeChange,
  upscalePlatform = "cloudinary",
  onUpscalePlatformChange,
  showAtlasCloud = false
}: UpscaleOptionsProps) {
  // If AtlasCloud is hidden and currently selected, reset to cloudinary
  if (!showAtlasCloud && upscalePlatform === "atlascloud" && onUpscalePlatformChange) {
    onUpscalePlatformChange("cloudinary");
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <ZoomIn className="w-4 h-4" />
        AI Upscale Settings
      </Label>
      
      {/* Platform Selection - only show if AtlasCloud is enabled or if we want to show the selector */}
      {onUpscalePlatformChange && showAtlasCloud && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Upscale Platform</Label>
          <Select
            value={upscalePlatform}
            onValueChange={(v) => onUpscalePlatformChange(v as UpscalePlatform)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cloudinary">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <div>
                    <span>Cloudinary</span>
                    <p className="text-xs text-muted-foreground">Up to 4x upscale with AI enhancement</p>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="atlascloud">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <span>AtlasCloud 4K</span>
                    <p className="text-xs text-muted-foreground">Premium 4K upscaling with AI restoration</p>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mode Selection - only for Cloudinary */}
      {upscalePlatform === "cloudinary" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Upscale Mode</Label>
          <Select
            value={upscaleMode}
            onValueChange={(v) => onUpscaleModeChange(v as UpscaleMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">
                <div>
                  <span>Standard Upscale</span>
                  <p className="text-xs text-muted-foreground">AI Super Resolution for higher quality</p>
                </div>
              </SelectItem>
              <SelectItem value="enhance">
                <div>
                  <span>Upscale + Enhance</span>
                  <p className="text-xs text-muted-foreground">Also improves colors and lighting</p>
                </div>
              </SelectItem>
              <SelectItem value="restore">
                <div>
                  <span>Upscale + Restore</span>
                  <p className="text-xs text-muted-foreground">Best for old or damaged photos</p>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {upscalePlatform === "atlascloud" && "Uses AtlasCloud's premium AI to upscale images to 4K resolution with advanced detail restoration and enhancement."}
          {upscalePlatform === "cloudinary" && upscaleMode === "standard" && "Uses AI Super Resolution to increase image quality and prevent pixelation when enlarging."}
          {upscalePlatform === "cloudinary" && upscaleMode === "enhance" && "Upscales the image and automatically enhances colors, contrast, and lighting for a more vibrant result."}
          {upscalePlatform === "cloudinary" && upscaleMode === "restore" && "Upscales and uses AI to restore old, damaged, or low-quality photos by fixing artifacts and improving details."}
        </p>
      </div>
    </div>
  );
}
