const COMMON_RATIOS: { label: string; ratio: number }[] = [
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "2:3", ratio: 2 / 3 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:5", ratio: 4 / 5 },
];

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function getAspectRatioLabel(
  width?: number | null,
  height?: number | null
): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;

  const ratio = width / height;
  const TOLERANCE = 0.05;

  for (const common of COMMON_RATIOS) {
    if (Math.abs(ratio - common.ratio) / common.ratio <= TOLERANCE) {
      return common.label;
    }
  }

  // Fallback: simplify with GCD
  const divisor = gcd(width, height);
  const sw = Math.round(width / divisor);
  const sh = Math.round(height / divisor);

  // If simplified ratio is too large, just show decimal
  if (sw > 30 || sh > 30) {
    return `${ratio.toFixed(1)}:1`;
  }

  return `${sw}:${sh}`;
}
