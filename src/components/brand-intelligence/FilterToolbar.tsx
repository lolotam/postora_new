import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Image, Film, GalleryHorizontal, Clapperboard } from "lucide-react";
import type { BrandScrapeFilters } from "@/types/brand-intelligence";

interface FilterToolbarProps {
  filters: BrandScrapeFilters;
  onChange: (filters: BrandScrapeFilters) => void;
  maxEngagement: number;
}

const DEFAULT_FILTERS: BrandScrapeFilters = {
  sortBy: "engagement",
  mediaType: "all",
  period: "all",
  minEngagement: 0,
};

export function FilterToolbar({ filters, onChange, maxEngagement }: FilterToolbarProps) {
  const activeCount = [
    filters.sortBy !== "engagement",
    filters.mediaType !== "all",
    filters.period !== "all",
    filters.minEngagement > 0,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.sortBy}
        onValueChange={(v) => onChange({ ...filters, sortBy: v as BrandScrapeFilters["sortBy"] })}
      >
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="engagement">🔥 Engagement Score</SelectItem>
          <SelectItem value="likes">❤️ Most Liked</SelectItem>
          <SelectItem value="comments">💬 Most Commented</SelectItem>
          <SelectItem value="views">▶️ Most Viewed</SelectItem>
          <SelectItem value="shares">🔄 Most Shared</SelectItem>
          <SelectItem value="saves">🔖 Most Saved</SelectItem>
          <SelectItem value="newest">🆕 Newest</SelectItem>
          <SelectItem value="oldest">📅 Oldest</SelectItem>
        </SelectContent>
      </Select>

      <ToggleGroup
        type="single"
        value={filters.mediaType}
        onValueChange={(v) => v && onChange({ ...filters, mediaType: v as BrandScrapeFilters["mediaType"] })}
        className="gap-0.5"
      >
        <ToggleGroupItem value="all" className="text-xs h-9 px-3">All</ToggleGroupItem>
        <ToggleGroupItem value="image" className="text-xs h-9 px-3 gap-1">
          <Image className="w-3 h-3" /> Image
        </ToggleGroupItem>
        <ToggleGroupItem value="video" className="text-xs h-9 px-3 gap-1">
          <Film className="w-3 h-3" /> Video
        </ToggleGroupItem>
      </ToggleGroup>

      <Select
        value={filters.period}
        onValueChange={(v) => onChange({ ...filters, period: v as BrandScrapeFilters["period"] })}
      >
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="3m">3 months</SelectItem>
          <SelectItem value="6m">6 months</SelectItem>
          <SelectItem value="1y">1 year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      <div className="hidden md:flex items-center gap-2 min-w-[180px]">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Min 🔥</span>
        <Slider
          value={[filters.minEngagement]}
          onValueChange={([v]) => onChange({ ...filters, minEngagement: v })}
          max={maxEngagement || 100000}
          step={100}
          className="flex-1"
        />
        <span className="text-xs font-mono w-12 text-right">
          {filters.minEngagement > 0 ? filters.minEngagement.toLocaleString() : "0"}
        </span>
      </div>

      {activeCount > 0 && (
        <>
          <Badge variant="secondary" className="text-xs">
            {activeCount} filter{activeCount > 1 ? "s" : ""} active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        </>
      )}
    </div>
  );
}
