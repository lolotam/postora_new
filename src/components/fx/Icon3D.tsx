import { cn } from "@/lib/utils";
import { GRADIENTS, type GradientKey, type IconLike } from "./gradients";

/** 3D-style colored icon badge with glossy sheen and hover rotate/scale. */
export function Icon3D({
  icon: Icon,
  variant,
  size = "md",
  className,
}: {
  icon: IconLike;
  variant: GradientKey;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const g = GRADIENTS[variant];
  const dims =
    size === "lg" ? "h-20 w-20" : size === "md" ? "h-16 w-16" : "h-12 w-12";
  const iconSize =
    size === "lg" ? "h-10 w-10" : size === "md" ? "h-8 w-8" : "h-6 w-6";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl",
        "bg-gradient-to-br ring-1 ring-white/30 shadow-xl",
        "transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110",
        dims,
        g.from,
        g.via,
        g.to,
        g.shadow,
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-1 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/50 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
      />
      <Icon className={cn("relative text-white drop-shadow-md", iconSize)} strokeWidth={2.25} />
    </span>
  );
}

export default Icon3D;