import { Platform } from "@/lib/types";

// Extended platform type - now all platforms are in core Platform type
export type ExtendedPlatform = Platform;

// Platform configuration for UI display
export interface PlatformConfig {
  platform: Platform;
  name: string;
  available: boolean;
}

// All supported platforms with availability status
export const allPlatforms: PlatformConfig[] = [
  { platform: "facebook", name: "Facebook", available: true },
  { platform: "instagram", name: "Instagram", available: true },
  { platform: "threads", name: "Threads", available: true },
  { platform: "tiktok", name: "TikTok", available: true },
  { platform: "youtube", name: "YouTube", available: true },
  { platform: "linkedin", name: "LinkedIn", available: true },
  { platform: "twitter", name: "X", available: true },
  { platform: "pinterest", name: "Pinterest", available: true },
  { platform: "bluesky", name: "Bluesky", available: true },
  { platform: "reddit", name: "Reddit", available: true },
];

// Get available platforms only
export const availablePlatforms = allPlatforms.filter((p) => p.available);

// Check if a platform is a core Platform type
export function isPlatformType(platform: ExtendedPlatform): platform is Platform {
  return ["facebook", "instagram", "tiktok", "twitter", "linkedin", "pinterest", "youtube", "threads", "bluesky", "reddit", "whatsapp"].includes(platform);
}

// Platform character limits
export const platformCharLimits: Record<Platform, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 4000,
  twitter: 280,
  linkedin: 3000,
  pinterest: 500,
  youtube: 5000,
  threads: 500,
  bluesky: 300,
  reddit: 40000,
  whatsapp: 4096,
};

// Platform-specific warnings
export const platformWarnings: Partial<Record<Platform, { title: string; message: string }>> = {
  pinterest: {
    title: "Pinterest Standard Access Required",
    message: "Posting to Pinterest requires Standard Access approval. If you haven't upgraded your Pinterest app, posts will fail with a permission error. Make sure you've requested 'pins:write' scope in the Pinterest Developer Console.",
  },
};

// TikTok photo restriction warning
export const TIKTOK_PHOTO_WARNING = {
  title: "TikTok يدعم الفيديو فقط حالياً",
  message: "TikTok يتطلب توثيق دومين خاص لنشر الصور. حالياً يمكنك نشر الفيديو فقط على TikTok، أو اختيار منصات أخرى للصور.",
};

// Platforms that require media (don't support text-only posts)
export const MEDIA_REQUIRED_PLATFORMS: Platform[] = ["instagram", "tiktok", "pinterest", "youtube"];

// YouTube categories
export const youtubeCategories = [
  { id: "1", name: "Film & Animation" },
  { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" },
  { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" },
  { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" },
  { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" },
  { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" },
  { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" },
  { id: "28", name: "Science & Technology" },
];

// Privacy level options for TikTok
export const tiktokPrivacyOptions = [
  { value: "PUBLIC_TO_EVERYONE", label: "Everyone" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends only" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
  { value: "SELF_ONLY", label: "Only me" },
];

// Twitter reply settings
// Twitter reply settings
export const twitterReplyOptions = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "People you follow" },
  { value: "mentioned", label: "Only people you mention" },
];
