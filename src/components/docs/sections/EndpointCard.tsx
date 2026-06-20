import { cn } from "@/lib/utils";
import { GradientRingCard } from "@/components/fx";
import type { GradientKey } from "@/components/fx/gradients";

const METHOD_STYLE: Record<string, { variant: GradientKey; chip: string }> = {
  GET: { variant: "sky", chip: "bg-gradient-to-r from-sky-500/20 to-blue-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40" },
  POST: { variant: "emerald", chip: "bg-gradient-to-r from-emerald-500/20 to-cyan-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40" },
  PUT: { variant: "amber", chip: "bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40" },
  PATCH: { variant: "amber", chip: "bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40" },
  DELETE: { variant: "rose", chip: "bg-gradient-to-r from-rose-500/20 to-pink-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40" },
};

interface EndpointCardProps {
  method: string;
  path: string;
  desc?: string;
  className?: string;
}

export function EndpointCard({ method, path, desc, className }: EndpointCardProps) {
  const s = METHOD_STYLE[method.toUpperCase()] ?? METHOD_STYLE.GET;
  return (
    <GradientRingCard
      variant={s.variant}
      hoverLift={false}
      ringIntensity="subtle"
      innerClassName={cn("p-4", className)}
    >
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border",
            s.chip,
          )}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </GradientRingCard>
  );
}

export default EndpointCard;