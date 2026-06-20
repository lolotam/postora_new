import { 
  BookOpen, Zap, Key, Code, Upload, Image, Globe, Sparkles, 
  Calendar, AlertTriangle, HelpCircle, Terminal, Shield, Hash, Clock,
  Layers, Plug,
  LucideIcon
} from "lucide-react";
import { ExtendedPlatform } from "@/components/PlatformIcon";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isLink?: boolean;
  href?: string;
  subItems?: NavSubItem[];
}

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  platform?: ExtendedPlatform;
}

export const docsNavItems: NavItem[] = [
  { id: "introduction", label: "Introduction", icon: BookOpen },
  { id: "quickstart", label: "Quickstart", icon: Zap },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "api-reference", label: "API Reference", icon: Code },
  { id: "mcp-reference", label: "MCP Reference", icon: Plug },
  { id: "create-post", label: "Create Post", icon: Upload },
  { id: "upload-media", label: "Upload Media", icon: Image },
  { id: "platforms", label: "Platforms", icon: Globe },
  { id: "ai-features", label: "AI Features", icon: Sparkles },
  { id: "scheduling", label: "Scheduling", icon: Calendar },
  { id: "error-handling", label: "Error Handling", icon: AlertTriangle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "token-expiry", label: "Token Expiry", icon: Clock, isLink: true, href: "/docs/token-expiry" },
  { id: "media-matrix", label: "Media Support Matrix", icon: Layers, isLink: true, href: "/docs/media-matrix" },
  { 
    id: "playground", 
    label: "API Playground", 
    icon: Terminal, 
    isLink: true, 
    href: "/docs/playground"
  },
  {
    id: "n8n", 
    label: "n8n Integration", 
    icon: Zap, 
    isLink: true, 
    href: "/n8n",
    subItems: [
      { id: "instagram-api", label: "Instagram API", href: "/n8n/instagram", platform: "instagram" },
      { id: "facebook-api", label: "Facebook API", href: "/n8n/facebook", platform: "facebook" },
      { id: "tiktok-api", label: "TikTok API", href: "/docs/tiktok-api", platform: "tiktok" },
      { id: "twitter-api", label: "Twitter/X API", href: "/docs/twitter-api", platform: "twitter" },
      { id: "linkedin-api", label: "LinkedIn API", href: "/docs/linkedin-api", platform: "linkedin" },
      { id: "youtube-api", label: "YouTube API", href: "/docs/youtube-api", platform: "youtube" },
      { id: "pinterest-api", label: "Pinterest API", href: "/docs/pinterest-api", platform: "pinterest" },
      { id: "threads-api", label: "Threads API", href: "/docs/threads-api", platform: "threads" },
      { id: "bluesky-api", label: "Bluesky API", href: "/docs/bluesky-api", platform: "bluesky" },
      { id: "reddit-api", label: "Reddit API", href: "/docs/reddit-api", platform: "reddit" },
      { id: "remove-background", label: "Remove Background", href: "/docs/remove-background" },
      { id: "upscale", label: "Upscale Image", href: "/docs/upscale" },
      { id: "multi-platform", label: "Multi-Platform Guide", href: "/docs/multi-platform" },
      { id: "webhooks", label: "Webhooks", href: "/docs/webhooks" },
    ]
  },
];

export const supportedPlatforms: ExtendedPlatform[] = [
  "instagram", "facebook", "tiktok", "twitter", "linkedin", 
  "youtube", "pinterest", "threads", "bluesky", "reddit"
];

export const platformDescriptions: Record<string, string> = {
  instagram: "Photos, Reels, Carousels",
  facebook: "Posts, Photos, Videos",
  tiktok: "Videos, Direct Post",
  twitter: "Tweets, Threads, Media",
  linkedin: "Posts, Articles, Documents",
  youtube: "Videos, Shorts",
  pinterest: "Pins, Video Pins",
  threads: "Text, Images, Carousels",
  bluesky: "Posts, Images, Links",
  reddit: "Text, Link, Image Posts",
};

// Feature cards for introduction section
export const featureCards = [
  { icon: Zap, title: "Lightning Fast", desc: "Post to multiple platforms at once" },
  { icon: Shield, title: "Secure", desc: "Enterprise-grade OAuth & API security" },
  { icon: Globe, title: "Multi-Platform", desc: "10+ social networks supported" },
  { icon: Sparkles, title: "AI-Powered", desc: "Generate captions, hashtags & images" },
];

// Quickstart steps for documentation
export const quickstartSteps = [
  { step: 1, title: "Create Your Account", desc: "Sign up at Postora and complete your profile.", link: "https://postora.cloud/auth", linkText: "Create Account" },
  { step: 2, title: "Connect Social Accounts", desc: "Link your social media accounts via OAuth on the Profiles page.", link: "https://postora.cloud/profiles", linkText: "Connect Accounts" },
  { step: 3, title: "Get Your API Key", desc: "Navigate to API Keys page and copy your unique key.", link: "https://postora.cloud/api-keys", linkText: "Get API Key" },
];

// API endpoints for reference
export const apiEndpoints = [
  { method: "POST", path: "/api/v1/post", desc: "Create and publish a post", color: "emerald" },
  { method: "POST", path: "/api/v1/upload-media", desc: "Upload media files", color: "emerald" },
  { method: "GET", path: "/api/v1/posts", desc: "List all posts (paginated)", color: "primary" },
  { method: "GET", path: "/api/v1/accounts", desc: "List connected accounts", color: "primary" },
  { method: "GET", path: "/api/v1/post/:id", desc: "Get post details", color: "primary" },
];

// AI features for documentation
export const aiFeatures = [
  { icon: Sparkles, title: "Caption Generation", desc: "Generate engaging captions using Google's Gemini AI.", features: ["Platform-optimized content", "Multiple tone options", "Emoji suggestions"] },
  { icon: Hash, title: "Hashtag Suggestions", desc: "AI-powered hashtag recommendations based on your content.", features: ["Trending hashtags", "Niche-specific tags", "Platform optimization"] },
  { icon: Image, title: "Image Generation", desc: "Create stunning images with AI from text prompts.", features: ["Multiple aspect ratios", "Reference image support", "HD quality"] },
  { icon: Clock, title: "Best Time Suggestions", desc: "Optimal posting time recommendations.", features: ["Platform-specific timing", "Engagement optimization", "Audience analysis"] },
];

// HTTP status codes
export const httpStatusCodes = [
  { code: "200", desc: "Success" },
  { code: "400", desc: "Bad request (missing or invalid parameters)" },
  { code: "401", desc: "Invalid or expired API key" },
  { code: "429", desc: "Rate limit exceeded" },
  { code: "500", desc: "Server error" },
];

// FAQ items
export const faqItems = [
  { q: "How do I get my API key?", a: "After signing up and logging in, navigate to the API Keys page. Your key will be displayed there. You can regenerate it at any time." },
  { q: "How many platforms can I post to at once?", a: "You can post to all 10 supported platforms in a single API call. Simply include all desired platforms in the platforms array." },
  { q: "Is there a rate limit?", a: "Yes. Free accounts: 5 requests/minute, 50/day. Pro: 30/min, 500/day. Business: 100/min, unlimited daily." },
  { q: "How do I handle scheduling?", a: "Include the scheduled_at parameter with an ISO 8601 timestamp. The post will be queued and published at the specified time." },
  { q: "What video formats are supported?", a: "MP4 and MOV are universally supported. WebM, MPEG, and AVI work for most platforms. Always use H.264 codec for best compatibility." },
];
