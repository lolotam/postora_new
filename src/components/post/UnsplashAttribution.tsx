import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnsplashAttributionProps {
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
  className?: string;
  variant?: "inline" | "overlay" | "card";
}

/**
 * Unsplash Attribution Component
 * Displays proper attribution as required by Unsplash API guidelines:
 * "Photo by [Photographer Name] on Unsplash"
 * with clickable links including UTM parameters
 */
export function UnsplashAttribution({
  photographerName,
  photographerUrl,
  unsplashUrl,
  className,
  variant = "inline",
}: UnsplashAttributionProps) {
  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent",
          className
        )}
      >
        <p className="text-[10px] text-white/90 flex items-center gap-1">
          <Camera className="w-3 h-3" />
          Photo by{" "}
          <a
            href={photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {photographerName}
          </a>
          {" "}on{" "}
          <a
            href={unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Unsplash
          </a>
        </p>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1",
          className
        )}
      >
        <Camera className="w-3 h-3" />
        <span>
          Photo by{" "}
          <a
            href={photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground font-medium"
          >
            {photographerName}
          </a>
          {" "}on{" "}
          <a
            href={unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground font-medium"
          >
            Unsplash
          </a>
        </span>
      </div>
    );
  }

  // Default inline variant
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Photo by{" "}
      <a
        href={photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        {photographerName}
      </a>
      {" "}on{" "}
      <a
        href={unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Unsplash
      </a>
    </span>
  );
}
