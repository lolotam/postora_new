import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Meh, Frown, HelpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadsMentionSentiment } from "@/hooks/useThreadsMentions";

const OPTIONS: {
  value: ThreadsMentionSentiment;
  label: string;
  icon: typeof Smile;
  className: string;
}[] = [
  {
    value: "positive",
    label: "Positive",
    icon: Smile,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    value: "neutral",
    label: "Neutral",
    icon: Meh,
    className: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  {
    value: "negative",
    label: "Negative",
    icon: Frown,
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  {
    value: "unknown",
    label: "Unknown",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
];

interface Props {
  value: ThreadsMentionSentiment;
  disabled?: boolean;
  onChange: (value: ThreadsMentionSentiment) => void;
}

export function ThreadsSentimentBadge({ value, disabled, onChange }: Props) {
  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[3];
  const Icon = current.icon;
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-60",
            current.className,
          )}
          disabled={disabled}
          aria-label={`Sentiment: ${current.label}. Click to change.`}
        >
          <Icon className="h-3 w-3" />
          <span className="capitalize">{current.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <div className="space-y-0.5">
          {OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const active = opt.value === value;
            return (
              <Button
                key={opt.value}
                size="sm"
                variant="ghost"
                className="w-full justify-start font-normal h-8"
                onClick={() => onChange(opt.value)}
              >
                <OptIcon className="h-3.5 w-3.5 mr-2" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
