import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Maximize2 } from "lucide-react";
import { ResizeMode, CropMode } from "../types";
import { RESIZE_PRESETS, CROP_MODES } from "../constants";

interface ResizeOptionsProps {
  resizeMode: ResizeMode;
  cropMode: CropMode;
  customWidth: number;
  customHeight: number;
  onResizeModeChange: (mode: ResizeMode) => void;
  onCropModeChange: (mode: CropMode) => void;
  onCustomWidthChange: (width: number) => void;
  onCustomHeightChange: (height: number) => void;
}

export function ResizeOptions({
  resizeMode,
  cropMode,
  customWidth,
  customHeight,
  onResizeModeChange,
  onCropModeChange,
  onCustomWidthChange,
  onCustomHeightChange,
}: ResizeOptionsProps) {
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Maximize2 className="w-4 h-4" />
          Size Preset
        </Label>
        <Select
          value={resizeMode}
          onValueChange={(v) => onResizeModeChange(v as ResizeMode)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RESIZE_PRESETS).map(([key, preset]) => (
              <SelectItem key={key} value={key}>
                {preset.label}
                {preset.width && preset.height && (
                  <span className="text-muted-foreground ml-2">
                    ({preset.width}×{preset.height})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resizeMode === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Width (px)</Label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => onCustomWidthChange(Number(e.target.value))}
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
              onChange={(e) => onCustomHeightChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              min={100}
              max={4096}
            />
          </div>
        </div>
      )}

      {resizeMode !== "original" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Crop Mode</Label>
          <Select
            value={cropMode}
            onValueChange={(v) => onCropModeChange(v as CropMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CROP_MODES).map(([key, mode]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <span>{mode.label}</span>
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
