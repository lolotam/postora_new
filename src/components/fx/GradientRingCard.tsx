import { cn } from "@/lib/utils";
import { GRADIENTS, type GradientKey } from "./gradients";

/**
 * Glass card with an animated gradient "halo" that lights up on hover.
 * Wrap any content. Pair with <Icon3D variant={variant} /> inside for
 * the full Cure Med /about look.
 */
export function GradientRingCard({
  variant,
  children,
  className,
  innerClassName,
  hoverLift = true,
  ringIntensity = "normal",
  active = false,
  padded = true,
}: {
  variant: GradientKey;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  hoverLift?: boolean;
  /** opacity of the gradient halo on hover */
  ringIntensity?: "subtle" | "normal" | "strong";
  /** Force the gradient halo permanently visible (for selected state). */
  active?: boolean;
  /** When false, do not apply default p-6 md:p-8 padding (caller controls). */
  padded?: boolean;
}) {
  const g = GRADIENTS[variant];
  const opacityHover =
    ringIntensity === "strong"
      ? "group-hover:opacity-90"
      : ringIntensity === "subtle"
        ? "group-hover:opacity-50"
        : "group-hover:opacity-70";

  return (
    <div className={cn("group relative h-full", className)}>
      <div
        aria-hidden
        className={cn(
          "absolute -inset-0.5 rounded-3xl opacity-0 blur transition-opacity duration-500 bg-gradient-to-br",
          g.from,
          g.via,
          g.to,
          opacityHover,
          active && "opacity-80",
        )}
      />
      <div
        className={cn(
          "relative h-full rounded-3xl border border-border/60 bg-card/85 backdrop-blur-md shadow-md",
          "transition-all duration-500",
          hoverLift && "group-hover:-translate-y-2 group-hover:shadow-2xl",
          padded && "p-6 md:p-8",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default GradientRingCard;