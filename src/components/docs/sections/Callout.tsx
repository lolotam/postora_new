import { type LucideIcon, Info, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon3D } from "@/components/fx";
import type { GradientKey } from "@/components/fx/gradients";

type Tone = "info" | "warning" | "success" | "tip";

const TONE_MAP: Record<Tone, { variant: GradientKey; icon: LucideIcon; ring: string; bg: string; text: string }> = {
  info: {
    variant: "sky",
    icon: Info,
    ring: "ring-sky-400/40",
    bg: "from-sky-500/10 via-blue-500/5 to-transparent",
    text: "text-sky-700 dark:text-sky-300",
  },
  warning: {
    variant: "amber",
    icon: AlertTriangle,
    ring: "ring-amber-400/40",
    bg: "from-amber-500/10 via-orange-500/5 to-transparent",
    text: "text-amber-700 dark:text-amber-300",
  },
  success: {
    variant: "emerald",
    icon: CheckCircle2,
    ring: "ring-emerald-400/40",
    bg: "from-emerald-500/10 via-teal-500/5 to-transparent",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  tip: {
    variant: "violet",
    icon: Sparkles,
    ring: "ring-violet-400/40",
    bg: "from-violet-500/10 via-fuchsia-500/5 to-transparent",
    text: "text-violet-700 dark:text-violet-300",
  },
};

interface CalloutProps {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({ tone = "info", title, children, className }: CalloutProps) {
  const t = TONE_MAP[tone];
  return (
    <div
      className={cn(
        "group/callout relative rounded-2xl border bg-gradient-to-br backdrop-blur-md p-4 ring-1",
        t.bg,
        t.ring,
        "border-transparent",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <Icon3D icon={t.icon} variant={t.variant} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          {title && <h4 className={cn("font-semibold mb-1", t.text)}>{title}</h4>}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Callout;