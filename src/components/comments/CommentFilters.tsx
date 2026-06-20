import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CommentFiltersProps {
  sentimentFilter: string;
  onSentimentChange: (value: string) => void;
  hiddenFilter: string;
  onHiddenChange: (value: string) => void;
}

export function CommentFilters({
  sentimentFilter,
  onSentimentChange,
  hiddenFilter,
  onHiddenChange,
}: CommentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Visibility</Label>
        <Select value={hiddenFilter} onValueChange={onHiddenChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Sentiment</Label>
        <Select value={sentimentFilter} onValueChange={onSentimentChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
