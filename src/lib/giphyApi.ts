/**
 * Giphy API Service
 * 
 * Provides integration with Giphy's API for fetching trending GIFs,
 * searching GIFs, stickers, clips, and categories.
 * 
 * API Documentation: https://developers.giphy.com/docs/api/
 */

const GIPHY_API_KEY = "POp4h9zNM1s7vSvlQLhWfMOdAw6GurSL";
const GIPHY_BASE_URL = "https://api.giphy.com/v1";

// ============================================================================
// Types
// ============================================================================

export interface GiphyImageVariant {
  url: string;
  width: string;
  height: string;
  size?: string;
  mp4?: string;
  mp4_size?: string;
  webp?: string;
  webp_size?: string;
}

export interface GiphyImages {
  original: GiphyImageVariant;
  fixed_height: GiphyImageVariant;
  fixed_height_small: GiphyImageVariant;
  fixed_width: GiphyImageVariant;
  fixed_width_small: GiphyImageVariant;
  downsized: GiphyImageVariant;
  downsized_medium: GiphyImageVariant;
  downsized_large: GiphyImageVariant;
  preview_gif: GiphyImageVariant;
  preview_webp: GiphyImageVariant;
}

export interface GiphyUser {
  avatar_url: string;
  banner_url: string;
  profile_url: string;
  username: string;
  display_name: string;
}

export interface GiphyVideoAsset {
  url: string;
  width: number;
  height: number;
}

export interface GiphyVideo {
  assets?: {
    "360p"?: GiphyVideoAsset;
    "480p"?: GiphyVideoAsset;
    "720p"?: GiphyVideoAsset;
    "1080p"?: GiphyVideoAsset;
    source?: GiphyVideoAsset;
  };
}

export interface GiphyGif {
  id: string;
  slug: string;
  url: string;
  bitly_url: string;
  embed_url: string;
  title: string;
  rating: string;
  type?: string; // "gif" | "video" for clips
  images: GiphyImages;
  video?: GiphyVideo; // For clips
  user?: GiphyUser;
  source?: string;
  import_datetime: string;
  trending_datetime: string;
}

export interface GiphyResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

export interface GiphyCategory {
  name: string;
  name_encoded: string;
  subcategories?: GiphySubcategory[];
  gif?: GiphyGif;
}

export interface GiphySubcategory {
  name: string;
  name_encoded: string;
}

export interface GiphyCategoriesResponse {
  data: GiphyCategory[];
  pagination: {
    total_count: number;
    count: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

// Comprehensive categories for GIPHY (matching the full Giphy categories)
export const GIPHY_POPULAR_CATEGORIES = [
  { name: "All (Trending)", value: "all" },
  { name: "Actions", value: "actions" },
  { name: "Adjectives", value: "adjectives" },
  { name: "Animals", value: "animals" },
  { name: "Anime", value: "anime" },
  { name: "Art & Design", value: "art-design" },
  { name: "Cartoons & Comics", value: "cartoons-comics" },
  { name: "Celebrities", value: "celebrities" },
  { name: "Decades", value: "decades" },
  { name: "Emotions", value: "emotions" },
  { name: "Entertainment", value: "entertainment" },
  { name: "Fashion & Beauty", value: "fashion-beauty" },
  { name: "Food & Drink", value: "food-drink" },
  { name: "Gaming", value: "gaming" },
  { name: "Greeting", value: "greeting" },
  { name: "Holiday", value: "holiday" },
  { name: "Identity", value: "identity" },
  { name: "Interests", value: "interests" },
  { name: "Love", value: "love" },
  { name: "Memes", value: "memes" },
  { name: "Movies", value: "movies" },
  { name: "Music", value: "music" },
  { name: "Nature", value: "nature" },
  { name: "News & Politics", value: "news-politics" },
  { name: "Reactions", value: "reactions" },
  { name: "Science", value: "science" },
  { name: "Sports", value: "sports" },
  { name: "Stickers", value: "stickers" },
  { name: "Transportation", value: "transportation" },
  { name: "TV", value: "tv" },
  { name: "Weird", value: "weird" },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a thumbnail URL for a GIF (fixed width small - good for grids)
 */
export function getThumbnailUrl(gif: GiphyGif): string {
  return (
    gif.images?.fixed_width_small?.url ||
    gif.images?.fixed_width?.url ||
    gif.images?.preview_gif?.url ||
    gif.images?.downsized?.url ||
    gif.images?.original?.url ||
    ""
  );
}

/**
 * Get the full-size GIF URL for embedding/posting
 */
export function getFullUrl(gif: GiphyGif): string {
  return (
    gif.images?.original?.url ||
    gif.images?.downsized_large?.url ||
    gif.images?.downsized_medium?.url ||
    gif.images?.fixed_height?.url ||
    ""
  );
}

/**
 * Get a medium-sized URL (good for previews)
 */
export function getMediumUrl(gif: GiphyGif): string {
  return (
    gif.images?.fixed_width?.url ||
    gif.images?.downsized_medium?.url ||
    gif.images?.downsized?.url ||
    gif.images?.original?.url ||
    ""
  );
}

/**
 * Get MP4 version if available (smaller file size)
 */
export function getMp4Url(gif: GiphyGif): string | null {
  return gif.images?.original?.mp4 || gif.images?.fixed_height?.mp4 || null;
}

/**
 * Get the best video URL for a clip
 */
export function getClipVideoUrl(clip: GiphyGif): string {
  if (!clip.video?.assets) {
    // Fallback to MP4 from images if no video assets
    return getMp4Url(clip) || getFullUrl(clip);
  }
  
  const assets = clip.video.assets;
  // Prefer 720p, then 480p, then 360p, then source
  return (
    assets["720p"]?.url ||
    assets["480p"]?.url ||
    assets["360p"]?.url ||
    assets.source?.url ||
    getMp4Url(clip) ||
    getFullUrl(clip)
  );
}

/**
 * Get clip thumbnail (uses the GIF preview)
 */
export function getClipThumbnailUrl(clip: GiphyGif): string {
  return getThumbnailUrl(clip);
}

// ============================================================================
// API Functions - GIFs
// ============================================================================

/**
 * Fetch trending GIFs from Giphy
 */
export async function fetchTrendingGifs(
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  try {
    const offset = (page - 1) * perPage;
    const url = new URL(`${GIPHY_BASE_URL}/gifs/trending`);
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("limit", perPage.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("rating", rating);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Giphy API error:", response.status, response.statusText);
      return [];
    }

    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching trending GIFs from Giphy:", error);
    return [];
  }
}

/**
 * Search for GIFs on Giphy
 */
export async function searchGifs(
  query: string,
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  if (!query.trim()) {
    return fetchTrendingGifs(page, perPage, rating);
  }

  try {
    const offset = (page - 1) * perPage;
    const url = new URL(`${GIPHY_BASE_URL}/gifs/search`);
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", perPage.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("rating", rating);
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Giphy API error:", response.status, response.statusText);
      return [];
    }

    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error searching GIFs on Giphy:", error);
    return [];
  }
}

// ============================================================================
// API Functions - Stickers
// ============================================================================

/**
 * Fetch trending stickers from Giphy
 */
export async function fetchTrendingStickers(
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  try {
    const offset = (page - 1) * perPage;
    const url = new URL(`${GIPHY_BASE_URL}/stickers/trending`);
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("limit", perPage.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("rating", rating);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Giphy API error:", response.status, response.statusText);
      return [];
    }

    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching trending stickers from Giphy:", error);
    return [];
  }
}

/**
 * Search for stickers on Giphy
 */
export async function searchStickers(
  query: string,
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  if (!query.trim()) {
    return fetchTrendingStickers(page, perPage, rating);
  }

  try {
    const offset = (page - 1) * perPage;
    const url = new URL(`${GIPHY_BASE_URL}/stickers/search`);
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", perPage.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("rating", rating);
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Giphy API error:", response.status, response.statusText);
      return [];
    }

    const data: GiphyResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error searching stickers on Giphy:", error);
    return [];
  }
}

// ============================================================================
// API Functions - Clips
// ============================================================================

/**
 * Note: GIPHY Clips API requires special approval from clips@giphy.com
 * Until approval is granted, we fallback to searching GIFs with video-related terms
 * This provides video-like content as a substitute
 */

/**
 * Fetch trending clips from Giphy
 * Falls back to trending GIFs if Clips API is not available
 */
export async function fetchTrendingClips(
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  try {
    const offset = (page - 1) * perPage;
    
    // First try the actual clips endpoint
    const clipsUrl = new URL(`${GIPHY_BASE_URL}/clips/trending`);
    clipsUrl.searchParams.set("api_key", GIPHY_API_KEY);
    clipsUrl.searchParams.set("limit", perPage.toString());
    clipsUrl.searchParams.set("offset", offset.toString());
    clipsUrl.searchParams.set("rating", rating);

    const clipsResponse = await fetch(clipsUrl.toString());

    if (clipsResponse.ok) {
      const clipsData: GiphyResponse = await clipsResponse.json();
      if (clipsData.data && clipsData.data.length > 0) {
        return clipsData.data;
      }
    }
    
    // Fallback: Use trending GIFs as clips alternative
    console.log("Giphy Clips API not available, falling back to trending GIFs");
    return fetchTrendingGifs(page, perPage, rating);
  } catch (error) {
    console.error("Error fetching trending clips from Giphy:", error);
    // Fallback to trending GIFs
    return fetchTrendingGifs(page, perPage, rating);
  }
}

/**
 * Search for clips on Giphy
 * Falls back to searching GIFs if Clips API is not available
 */
export async function searchClips(
  query: string,
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  if (!query.trim()) {
    return fetchTrendingClips(page, perPage, rating);
  }

  try {
    const offset = (page - 1) * perPage;
    
    // First try the actual clips search endpoint
    const clipsUrl = new URL(`${GIPHY_BASE_URL}/clips/search`);
    clipsUrl.searchParams.set("api_key", GIPHY_API_KEY);
    clipsUrl.searchParams.set("q", query.trim());
    clipsUrl.searchParams.set("limit", perPage.toString());
    clipsUrl.searchParams.set("offset", offset.toString());
    clipsUrl.searchParams.set("rating", rating);
    clipsUrl.searchParams.set("lang", "en");

    const clipsResponse = await fetch(clipsUrl.toString());

    if (clipsResponse.ok) {
      const clipsData: GiphyResponse = await clipsResponse.json();
      if (clipsData.data && clipsData.data.length > 0) {
        return clipsData.data;
      }
    }
    
    // Fallback: Search GIFs instead
    console.log("Giphy Clips search not available, falling back to GIF search");
    return searchGifs(query, page, perPage, rating);
  } catch (error) {
    console.error("Error searching clips on Giphy:", error);
    // Fallback to GIF search
    return searchGifs(query, page, perPage, rating);
  }
}

// ============================================================================
// API Functions - Categories
// ============================================================================

/**
 * Fetch GIF categories from Giphy
 */
export async function fetchCategories(): Promise<GiphyCategory[]> {
  try {
    const url = new URL(`${GIPHY_BASE_URL}/gifs/categories`);
    url.searchParams.set("api_key", GIPHY_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Giphy Categories API error:", response.status, response.statusText);
      return [];
    }

    const data: GiphyCategoriesResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching categories from Giphy:", error);
    return [];
  }
}

/**
 * Fetch GIFs by category (uses search with category name)
 */
export async function fetchGifsByCategory(
  category: string,
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  if (!category.trim() || category === "all") {
    return fetchTrendingGifs(page, perPage, rating);
  }
  
  // Use category as search query for better results
  return searchGifs(category, page, perPage, rating);
}

/**
 * Fetch clips by category (uses search with category name)
 */
export async function fetchClipsByCategory(
  category: string,
  page = 1,
  perPage = 24,
  rating: "g" | "pg" | "pg-13" | "r" = "g"
): Promise<GiphyGif[]> {
  if (!category.trim() || category === "all") {
    return fetchTrendingClips(page, perPage, rating);
  }
  
  return searchClips(category, page, perPage, rating);
}
