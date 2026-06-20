import { cn } from "@/lib/utils";

/** Soft horizontal gradient hairline for separating sections. */
export function GradientDivider({
  className,
  tone = "primary",
}: {
  className?: string;
  tone?: "primary" | "sky" | "violet" | "emerald" | "rose";
}) {
  const via =
    tone === "sky"
      ? "via-sky-500/40"
      : tone === "violet"
        ? "via-violet-500/40"
        : tone === "emerald"
          ? "via-emerald-500/40"
          : tone === "rose"
            ? "via-rose-500/40"
            : "via-primary/40";
  return (
    <div className={cn("h-px w-full bg-gradient-to-r from-transparent to-transparent", via, className)} />
  );
}

export default GradientDivider;