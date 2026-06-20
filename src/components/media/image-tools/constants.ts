import { ResizeMode, CropMode, ArtisticFilter, QualityPreset } from "./types";

export const RESIZE_PRESETS: Record<ResizeMode, { label: string; width: number | null; height: number | null }> = {
  original: { label: "Original", width: null, height: null },
  square: { label: "Square (1:1)", width: 1024, height: 1024 },
  portrait: { label: "Portrait (4:5)", width: 1080, height: 1350 },
  landscape: { label: "Landscape (16:9)", width: 1920, height: 1080 },
  custom: { label: "Custom", width: null, height: null },
};

export const CROP_MODES: Record<CropMode, { label: string; description: string }> = {
  fill: { label: "Fill (crop to fit)", description: "Crops image to exact dimensions" },
  fit: { label: "Fit (contain)", description: "Fits within dimensions, may add padding" },
  scale: { label: "Scale", description: "Scales to dimensions, may distort" },
  crop: { label: "Crop (center)", description: "Crops from center" },
  pad: { label: "Pad", description: "Adds padding to fit dimensions" },
};

export const ARTISTIC_FILTERS: Record<ArtisticFilter, string> = {
  none: "None",
  al_dente: "Al Dente",
  athena: "Athena",
  audrey: "Audrey",
  aurora: "Aurora",
  daguerre: "Daguerre",
  eucalyptus: "Eucalyptus",
  fes: "Fes",
  frost: "Frost",
  hairspray: "Hairspray",
  hokusai: "Hokusai",
  incognito: "Incognito",
  linen: "Linen",
  peacock: "Peacock",
  primavera: "Primavera",
  quartz: "Quartz",
  red_rock: "Red Rock",
  refresh: "Refresh",
  sizzle: "Sizzle",
  sonnet: "Sonnet",
  ukulele: "Ukulele",
  zorro: "Zorro",
};

export const QUALITY_PRESETS: Record<QualityPreset, { label: string; value: string }> = {
  auto: { label: "Auto (recommended)", value: "auto" },
  best: { label: "Best Quality", value: "100" },
  high: { label: "High (80%)", value: "80" },
  medium: { label: "Medium (60%)", value: "60" },
  low: { label: "Low (40%)", value: "40" },
  eco: { label: "Eco (20%)", value: "20" },
};
