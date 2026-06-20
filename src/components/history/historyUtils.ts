import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
} from "lucide-react";

export const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-emerald-400 bg-emerald-400/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-destructive bg-destructive/10",
  },
  pending: {
    icon: AlertCircle,
    label: "Pending",
    className: "text-amber-400 bg-amber-400/10",
  },
  pending_inbox: {
    icon: Inbox,
    label: "Check Inbox",
    className: "text-blue-400 bg-blue-400/10",
  },
  processing: {
    icon: AlertCircle,
    label: "Processing",
    className: "text-blue-400 bg-blue-400/10",
  },
};

// Helper function to build post URL for each platform
export const buildPostUrl = (
  platform: string,
  platformPostId: string | null | undefined,
  platformPostUrl: string | null | undefined,
  username: string | null | undefined,
  tiktokUsername?: string | null // The actual TikTok handle from account_metadata
): string | null => {
  // Remove @ symbol from username if present
  const cleanUsername = username?.replace(/^@/, '') || null;

  // FACEBOOK: Prefer stored URL (canonical link from Graph API), fall back to constructed URL
  if (platform === "facebook") {
    if (platformPostUrl) return platformPostUrl;
    if (platformPostId) return `https://www.facebook.com/photo/?fbid=${platformPostId}`;
    return null;
  }

  // INSTAGRAM: Always prefer the stored permalink (returned by Graph API).
  // platform_post_id is the numeric media ID and CANNOT be used to build a
  // working /p/<id>/ URL — Instagram permalinks require the shortcode
  // (e.g. "DXh5eB_Dl9r"). The numeric-ID fallback below is only kept for
  // legacy rows that somehow lack a stored URL.
  if (platform === "instagram") {
    if (platformPostUrl) return platformPostUrl;
    if (platformPostId) return `https://www.instagram.com/p/${platformPostId}/`;
    return null;
  }

  // TIKTOK: Always prefer stored URL (set by background polling after video finishes processing)
  // The platform_post_url is set by pollTikTokPublishStatus when TikTok confirms PUBLISH_COMPLETE
  if (platform === "tiktok") {
    // If we have a stored platform_post_url from the webhook/polling, use it directly
    if (platformPostUrl) {
      return platformPostUrl;
    }
    // Build URL from username and the publicly_available_post_id (stored in platform_post_id)
    // Prefer tiktokUsername (the actual handle like "nonywaleed.tam201") over display name
    const effectiveUsername = tiktokUsername || cleanUsername;
    if (effectiveUsername && platformPostId) {
      // Clean the effective username too (remove @ if present)
      const cleanEffectiveUsername = effectiveUsername.replace(/^@/, '');
      return `https://www.tiktok.com/@${cleanEffectiveUsername}/video/${platformPostId}`;
    }
    // If we only have post ID (video ID), we can't build a URL without username
    return null;
  }

  // For other platforms, use stored URL if available
  if (platformPostUrl && platform !== "facebook") {
    return platformPostUrl;
  }

  // If no post ID, we can't build a URL
  if (!platformPostId) return null;

  switch (platform) {
    case "pinterest":
      return `https://www.pinterest.com/pin/${platformPostId}/`;

    case "twitter":
      if (cleanUsername) {
        return `https://twitter.com/${cleanUsername}/status/${platformPostId}`;
      }
      return null;

    case "youtube":
      return `https://www.youtube.com/watch?v=${platformPostId}`;

    case "linkedin":
      return `https://www.linkedin.com/feed/update/${platformPostId}`;

    case "threads":
      // Prefer stored permalink (shortcode URL) over numeric ID construction
      if (platformPostUrl) return platformPostUrl;
      if (cleanUsername) {
        return `https://www.threads.com/@${cleanUsername}`;
      }
      return null;

    case "bluesky":
      if (cleanUsername && platformPostId) {
        return `https://bsky.app/profile/${cleanUsername}/post/${platformPostId}`;
      }
      return null;

    case "reddit":
      // Reddit post URLs typically come from the API directly
      return platformPostUrl || null;

    default:
      return null;
  }
};
