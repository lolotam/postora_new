import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export type TransitionType = "default" | "fade" | "slideUp" | "scale";

interface PageTransitionWithTypeProps extends PageTransitionProps {
  type?: TransitionType;
}

export function PageTransition({ 
  children, 
  className = "",
}: PageTransitionWithTypeProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

// Staggered children wrapper — CSS-only version
export function StaggerContainer({ 
  children, 
  className = "",
}: PageTransitionProps & { delay?: number }) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

// Individual stagger item — CSS-only version
export function StaggerItem({ 
  children, 
  className = "" 
}: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
