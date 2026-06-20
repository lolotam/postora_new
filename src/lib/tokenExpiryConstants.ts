/**
 * Token Expiry Constants for Social Media Platforms
 * 
 * This file documents the official token expiry durations for all supported platforms.
 * Use these constants to determine when tokens need to be refreshed.
 * 
 * Last updated: January 2026
 */

export interface PlatformTokenInfo {
  platform: string;
  accessTokenExpiry: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpiry: string;
  refreshTokenExpirySeconds: number | null;
  refreshWindowSeconds: number; // How long before expiry to trigger refresh
  notes: string;
  documentationUrl: string;
}

// Time constants in seconds
export const TIME_CONSTANTS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH_30: 2592000, // 30 days
  MONTH_60: 5184000, // 60 days
  YEAR: 31536000,    // 365 days
} as const;

/**
 * Platform-specific token expiry information
 */
export const PLATFORM_TOKEN_INFO: Record<string, PlatformTokenInfo> = {
  // TikTok: Access token 24 hours, Refresh token 365 days
  tiktok: {
    platform: 'TikTok',
    accessTokenExpiry: '24 hours',
    accessTokenExpirySeconds: TIME_CONSTANTS.DAY,
    refreshTokenExpiry: '365 days',
    refreshTokenExpirySeconds: TIME_CONSTANTS.YEAR,
    refreshWindowSeconds: TIME_CONSTANTS.HOUR * 6, // Refresh 6 hours before expiry
    notes: 'Refresh token is rolling (resets on each use). Must refresh before expiry or user needs to reauth.',
    documentationUrl: 'https://developers.tiktok.com/doc/oauth-user-access-token-management',
  },

  // Pinterest: Access token 1 day, Refresh token continuous
  pinterest: {
    platform: 'Pinterest',
    accessTokenExpiry: '1 day',
    accessTokenExpirySeconds: TIME_CONSTANTS.DAY,
    refreshTokenExpiry: 'Continuous (resets on use)',
    refreshTokenExpirySeconds: null, // Continuous refresh
    refreshWindowSeconds: TIME_CONSTANTS.HOUR * 6, // Refresh 6 hours before expiry
    notes: 'Continuous refresh tokens - each refresh resets the expiry. Old system had 365 day refresh tokens.',
    documentationUrl: 'https://developers.pinterest.com/docs/getting-started/authentication/',
  },

  // Facebook: Access token 60 days, Long-lived tokens
  facebook: {
    platform: 'Facebook',
    accessTokenExpiry: '60 days',
    accessTokenExpirySeconds: TIME_CONSTANTS.MONTH_60,
    refreshTokenExpiry: 'N/A (uses long-lived tokens)',
    refreshTokenExpirySeconds: null,
    refreshWindowSeconds: TIME_CONSTANTS.WEEK, // Refresh 7 days before expiry
    notes: 'Facebook uses long-lived access tokens that last ~60 days. Exchange short-lived for long-lived on OAuth.',
    documentationUrl: 'https://developers.facebook.com/docs/facebook-login/access-tokens/',
  },

  // Instagram: Same as Facebook (Graph API)
  instagram: {
    platform: 'Instagram',
    accessTokenExpiry: '60 days',
    accessTokenExpirySeconds: TIME_CONSTANTS.MONTH_60,
    refreshTokenExpiry: 'N/A (uses long-lived tokens)',
    refreshTokenExpirySeconds: null,
    refreshWindowSeconds: TIME_CONSTANTS.WEEK, // Refresh 7 days before expiry
    notes: 'Instagram uses Facebook Graph API. Long-lived tokens last ~60 days.',
    documentationUrl: 'https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens/',
  },

  // Threads: Same as Instagram/Facebook
  threads: {
    platform: 'Threads',
    accessTokenExpiry: '60 days',
    accessTokenExpirySeconds: TIME_CONSTANTS.MONTH_60,
    refreshTokenExpiry: 'N/A (uses long-lived tokens)',
    refreshTokenExpirySeconds: null,
    refreshWindowSeconds: TIME_CONSTANTS.WEEK, // Refresh 7 days before expiry
    notes: 'Threads uses the same token system as Instagram via Meta. Long-lived tokens.',
    documentationUrl: 'https://developers.facebook.com/docs/threads/',
  },

  // LinkedIn: Access token 60 days (2 months), Refresh token 365 days
  linkedin: {
    platform: 'LinkedIn',
    accessTokenExpiry: '60 days',
    accessTokenExpirySeconds: TIME_CONSTANTS.MONTH_60,
    refreshTokenExpiry: '365 days',
    refreshTokenExpirySeconds: TIME_CONSTANTS.YEAR,
    refreshWindowSeconds: TIME_CONSTANTS.WEEK, // Refresh 7 days before expiry
    notes: 'LinkedIn 3-legged OAuth tokens. Refresh extends both access and refresh tokens.',
    documentationUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens',
  },

  // Twitter/X: Access token 2 hours, Refresh token 6 months
  twitter: {
    platform: 'Twitter/X',
    accessTokenExpiry: '2 hours',
    accessTokenExpirySeconds: TIME_CONSTANTS.HOUR * 2,
    refreshTokenExpiry: '6 months',
    refreshTokenExpirySeconds: TIME_CONSTANTS.MONTH_30 * 6,
    refreshWindowSeconds: TIME_CONSTANTS.HOUR, // Refresh 1 hour before expiry (critical!)
    notes: 'Very short-lived access tokens! Must refresh frequently. Hourly cron recommended.',
    documentationUrl: 'https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code',
  },

  // YouTube/Google: Access token 1 hour, Refresh token indefinite (with conditions)
  youtube: {
    platform: 'YouTube/Google',
    accessTokenExpiry: '1 hour',
    accessTokenExpirySeconds: TIME_CONSTANTS.HOUR,
    refreshTokenExpiry: 'Indefinite (with conditions)',
    refreshTokenExpirySeconds: null, // Indefinite but can expire
    refreshWindowSeconds: TIME_CONSTANTS.MINUTE * 30, // Refresh 30 mins before expiry (critical!)
    notes: 'Access tokens expire in 1 hour. Refresh tokens last indefinitely unless revoked, unused for 6 months, or user changes password.',
    documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
  },

  // Reddit: Access token 1 hour, Refresh token indefinite
  reddit: {
    platform: 'Reddit',
    accessTokenExpiry: '1 hour',
    accessTokenExpirySeconds: TIME_CONSTANTS.HOUR,
    refreshTokenExpiry: 'Indefinite',
    refreshTokenExpirySeconds: null,
    refreshWindowSeconds: TIME_CONSTANTS.MINUTE * 30, // Refresh 30 mins before expiry (critical!)
    notes: 'Very short access token (1 hour). Refresh token lasts indefinitely. Must use "permanent" duration on OAuth.',
    documentationUrl: 'https://github.com/reddit-archive/reddit/wiki/OAuth2',
  },

  // Bluesky: Access token ~2 hours (JWT), Refresh token session-based
  bluesky: {
    platform: 'Bluesky',
    accessTokenExpiry: '~2 hours',
    accessTokenExpirySeconds: TIME_CONSTANTS.HOUR * 2,
    refreshTokenExpiry: 'Session-based (variable)',
    refreshTokenExpirySeconds: null,
    refreshWindowSeconds: TIME_CONSTANTS.HOUR, // Refresh 1 hour before expiry
    notes: 'Bluesky uses AT Protocol with JWT access tokens. Session management via refreshSession endpoint.',
    documentationUrl: 'https://atproto.com/specs/xrpc#authentication',
  },
} as const;

/**
 * Platforms that need frequent refresh (hourly cron required)
 */
export const SHORT_LIVED_TOKEN_PLATFORMS = ['twitter', 'reddit', 'bluesky'] as const; // YouTube removed: uses JIT refresh only

/**
 * Platforms with medium token expiry (daily cron sufficient)
 */
export const MEDIUM_LIVED_TOKEN_PLATFORMS = ['tiktok', 'pinterest'] as const;

/**
 * Platforms with long token expiry (weekly check sufficient)
 */
export const LONG_LIVED_TOKEN_PLATFORMS = ['facebook', 'instagram', 'threads', 'linkedin'] as const;

/**
 * Get the refresh window for a platform in seconds
 */
export function getRefreshWindowSeconds(platform: string): number {
  const normalizedPlatform = platform.toLowerCase();
  return PLATFORM_TOKEN_INFO[normalizedPlatform]?.refreshWindowSeconds ?? TIME_CONSTANTS.WEEK;
}

/**
 * Check if a platform needs frequent refresh (hourly)
 */
export function needsFrequentRefresh(platform: string): boolean {
  const normalizedPlatform = platform.toLowerCase();
  return SHORT_LIVED_TOKEN_PLATFORMS.includes(normalizedPlatform as typeof SHORT_LIVED_TOKEN_PLATFORMS[number]);
}

/**
 * Get all platforms as a formatted reference table
 */
export function getTokenExpiryTable(): string {
  const rows = Object.entries(PLATFORM_TOKEN_INFO).map(([key, info]) => {
    return `| ${info.platform} | ${info.accessTokenExpiry} | ${info.refreshTokenExpiry} | ${Math.round(info.refreshWindowSeconds / 3600)}h |`;
  });

  return `
| Platform | Access Token | Refresh Token | Refresh Window |
|----------|--------------|---------------|----------------|
${rows.join('\n')}
`;
}
