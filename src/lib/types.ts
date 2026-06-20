export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'pinterest' | 'youtube' | 'threads' | 'bluesky' | 'reddit' | 'whatsapp';

export type IgAuthType = 'facebook_page' | 'business_login';

export interface SocialAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
  platformUserId: string;
  avatarUrl?: string;
  isActive: boolean;
  connectedAt: string;
}

export interface MediaFile {
  id: string;
  filePath: string;
  fileType: 'image' | 'video';
  fileSize: number;
  mimeType: string;
  previewUrl: string;
}

export interface Post {
  id: string;
  caption: string;
  platforms: Platform[];
  mediaFiles: MediaFile[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'scheduled';
  scheduledAt?: string;
  postedAt?: string;
  createdAt: string;
}

export interface PlatformPost {
  id: string;
  postId: string;
  platform: Platform;
  platformPostId?: string;
  platformPostUrl?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  postedAt?: string;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}
