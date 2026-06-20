export type BrandPlatform = 'instagram' | 'threads' | 'facebook' | 'tiktok';
export type MediaType = 'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL' | 'TEXT';
export type ContentTone = 'professional' | 'casual' | 'inspirational' | 'educational' | 'humorous';
export type ContentLanguage = 'arabic' | 'english' | 'both';

export interface BrandProfile {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  website?: string;
  platform: BrandPlatform;
  totalHearts?: number;
}

export interface BrandPost {
  id: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  mediaUrl?: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  videoViewCount?: number;
  sharesCount?: number;
  savesCount?: number;
  bookmarksCount?: number;
  engagementScore: number;
  timestamp: string;
  permalink: string;
  // TikTok-specific
  hashtags?: string[];
  songTitle?: string;
  duration?: number;
}

export interface BrandScrapeFilters {
  sortBy: 'engagement' | 'likes' | 'comments' | 'views' | 'newest' | 'oldest' | 'shares' | 'saves';
  mediaType: 'all' | 'image' | 'video' | 'carousel' | 'reel';
  period: '30d' | '3m' | '6m' | '1y' | 'all';
  minEngagement: number;
}

export interface BrandScrapeSession {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  profile_data: BrandProfile | null;
  posts_data: BrandPost[] | null;
  total_posts_fetched: number | null;
  strategy_used: string | null;
  api_endpoint: string | null;
  scraped_at: string | null;
  created_at: string | null;
}

export interface GeneratedContent {
  captions: string[];
  imagePrompts: string[];
  videoPrompts: string[];
}
