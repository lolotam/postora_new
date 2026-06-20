// Token expiry utility functions

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Check if a token is expiring within the next N days
 * @deprecated Use getTokenStatus() which now only returns "active" | "expired"
 */
export function isTokenExpiringSoon(expiresAt: string | null, daysThreshold = 7): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return expiryDate > new Date() && expiryDate < thresholdDate;
}

/**
 * Format token expiry as a human-readable string
 */
export function formatTokenExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 30) return `${diffDays} days`;
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? "s" : ""}`;
}

/**
 * Get token status for display — only "active" or "expired"
 */
export function getTokenStatus(expiresAt: string | null): "active" | "expired" {
  if (isTokenExpired(expiresAt)) return "expired";
  return "active";
}
