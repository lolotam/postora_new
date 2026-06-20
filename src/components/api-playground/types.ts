import { ExtendedPlatform } from "@/components/PlatformIcon";

export interface Account {
  id: string;
  platform: string;
  platform_username: string;
  platform_user_id?: string;
  avatar_url?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  status?: number;
  duration?: number;
}

export interface RequestHistoryItem {
  id: string;
  timestamp: Date;
  request: {
    operation: string;
    platforms: string[];
    user_identifier: string;
    account_ids?: string[];
    caption?: string;
    media_urls?: string;
  };
  response: ApiResponse;
}

export interface SelectedPlatformAccount {
  platform: ExtendedPlatform;
  accountId: string;
  accountUsername: string;
}

export const API_BASE = "https://api.postora.cloud/functions/v1/n8n-api";
export const HISTORY_STORAGE_KEY = "api_playground_history";
export const MAX_HISTORY_ITEMS = 10;

export const PLATFORMS: ExtendedPlatform[] = [
  "instagram", "facebook", "tiktok", "twitter", "linkedin", "youtube", "pinterest"
];
