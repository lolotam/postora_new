// Chart color constants for analytics and visualizations

export const CHART_COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 76%, 36%)",
  "hsl(340, 75%, 54%)",
  "hsl(201, 100%, 35%)",
  "hsl(32, 95%, 44%)",
];

export const PLATFORM_COLORS: Record<string, string> = {
  instagram: "hsl(340, 75%, 54%)",
  facebook: "hsl(221, 44%, 41%)",
  tiktok: "hsl(180, 2%, 10%)",
  twitter: "hsl(203, 89%, 53%)",
  linkedin: "hsl(201, 100%, 35%)",
  pinterest: "hsl(0, 78%, 51%)",
  youtube: "hsl(0, 100%, 50%)",
};

export const STATUS_COLORS = {
  completed: "hsl(142, 76%, 36%)",
  published: "hsl(142, 76%, 36%)",
  scheduled: "hsl(199, 89%, 48%)",
  pending: "hsl(215, 20%, 55%)",
  failed: "hsl(0, 72%, 51%)",
  processing: "hsl(45, 93%, 47%)",
};

// Get platform color with fallback
export function getPlatformColor(platform: string, fallbackIndex = 0): string {
  return PLATFORM_COLORS[platform] || CHART_COLORS[fallbackIndex % CHART_COLORS.length];
}

// Get status color
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
}
