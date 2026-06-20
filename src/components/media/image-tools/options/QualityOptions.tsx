import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { QualityPreset, OutputFormat } from "../types";
import { QUALITY_PRESETS } from "../constants";

interface QualityOptionsProps {
  qualityPreset: QualityPreset;
  outputFormat: OutputFormat;
  onQualityPresetChange: (preset: QualityPreset) => void;
  onOutputFormatChange: (format: OutputFormat) => void;
}

export function QualityOptions({
  qualityPreset,
  outputFormat,
  onQualityPresetChange,
  onOutputFormatChange,
}: QualityOptionsProps) {
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4" />
        Quality & Compression
      </Label>
      
      {/* Quality Preset */}
      <div className="space-y-2">
        <Label className="text-xs">Quality Level</Label>
        <Select
          value={qualityPreset}
          onValueChange={(v) => onQualityPresetChange(v as QualityPreset)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUALITY_PRESETS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Output Format */}
      <div className="space-y-2">
        <Label className="text-xs">Output Format</Label>
        <Select
          value={outputFormat}
          onValueChange={(v) => onOutputFormatChange(v as OutputFormat)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (recommended)</SelectItem>
            <SelectItem value="jpg">JPG - Smaller size</SelectItem>
            <SelectItem value="png">PNG - Best for transparency</SelectItem>
            <SelectItem value="webp">WebP - Modern, efficient</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Quality indicator */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {qualityPreset === "auto" && "Cloudinary will automatically optimize quality and format for best balance."}
          {qualityPreset === "best" && "Maximum quality, larger file size. Best for print or archiving."}
          {qualityPreset === "high" && "High quality with good compression. Suitable for most uses."}
          {qualityPreset === "medium" && "Balanced quality and file size. Good for web use."}
          {qualityPreset === "low" && "Smaller file size with noticeable quality reduction."}
          {qualityPreset === "eco" && "Minimum file size. Only use when size is critical."}
        </p>
      </div>
    </div>
  );
}
