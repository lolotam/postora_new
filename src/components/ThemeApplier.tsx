import { useDarkTheme } from "@/hooks/useDarkTheme";

/**
 * This component applies the dark theme variant based on admin settings.
 * It doesn't render anything visible - it just sets the data-dark-theme attribute.
 */
export function ThemeApplier() {
  useDarkTheme();
  return null;
}
