import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Scissors, Maximize2, ZoomIn, Palette, Sparkles } from "lucide-react";

interface FeatureTogglesProps {
  enableBgRemoval: boolean;
  enableResize: boolean;
  enableUpscale: boolean;
  enableFilters: boolean;
  enableQuality: boolean;
  onToggleBgRemoval: (enabled: boolean) => void;
  onToggleResize: (enabled: boolean) => void;
  onToggleUpscale: (enabled: boolean) => void;
  onToggleFilters: (enabled: boolean) => void;
  onToggleQuality: (enabled: boolean) => void;
}

export function FeatureToggles({
  enableBgRemoval,
  enableResize,
  enableUpscale,
  enableFilters,
  enableQuality,
  onToggleBgRemoval,
  onToggleResize,
  onToggleUpscale,
  onToggleFilters,
  onToggleQuality,
}: FeatureTogglesProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between p-2 border rounded-md bg-background">
        <div className="flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-primary" />
          <Label className="text-[11px] font-medium">BG Remove</Label>
        </div>
        <Switch
          checked={enableBgRemoval}
          onCheckedChange={onToggleBgRemoval}
          className="scale-75"
        />
      </div>

      <div className="flex items-center justify-between p-2 border rounded-md bg-background">
        <div className="flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-primary" />
          <Label className="text-[11px] font-medium">Resize</Label>
        </div>
        <Switch
          checked={enableResize}
          onCheckedChange={onToggleResize}
          className="scale-75"
        />
      </div>
      
      <div className="flex items-center justify-between p-2 border rounded-md bg-background">
        <div className="flex items-center gap-1.5">
          <ZoomIn className="w-3.5 h-3.5 text-primary" />
          <Label className="text-[11px] font-medium">Upscale</Label>
        </div>
        <Switch
          checked={enableUpscale}
          onCheckedChange={onToggleUpscale}
          className="scale-75"
        />
      </div>
      
      <div className="flex items-center justify-between p-2 border rounded-md bg-background">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-primary" />
          <Label className="text-[11px] font-medium">Filters</Label>
        </div>
        <Switch
          checked={enableFilters}
          onCheckedChange={onToggleFilters}
          className="scale-75"
        />
      </div>
      
      <div className="flex items-center justify-between p-2 border rounded-md bg-background">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <Label className="text-[11px] font-medium">Quality</Label>
        </div>
        <Switch
          checked={enableQuality}
          onCheckedChange={onToggleQuality}
          className="scale-75"
        />
      </div>
    </div>
  );
}
