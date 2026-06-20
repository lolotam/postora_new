/**
 * KLIPY API Service
 * https://api.klipy.com
 */

const KLIPY_API_KEY = "R2UhycpKIk0sjk0wEpMIQ5SdPYB5ZzcC2iGdRcNAmcXAkUwftlSxWwSUtOILCefS";
const KLIPY_BASE_URL = "https://api.klipy.com/api/v1";

// ============ GIF Types ============

export interface KlipyFormat {
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface KlipyFileSize {
  gif?: KlipyFormat;
  webp?: KlipyFormat;
  mp4?: KlipyFormat;
  webm?: KlipyFormat;
  jpg?: KlipyFormat;
}

export interface KlipyFile {
  hd?: KlipyFileSize;
  md?: KlipyFileSize;
  sm?: KlipyFileSize;
  xs?: KlipyFileSize;
}

export interface KlipyGif {
  id: string;
  slug: string;
  title: string;
  file: KlipyFile;
}

// ============ Clip Types ============

export interface KlipyClipFile {
  mp4?: string;
  gif?: string;
  webp?: string;
}

export interface KlipyClipFileMeta {
  mp4?: { width: number; height: number };
  gif?: { width: number; height: number };
  webp?: { width: number; height: number };
}

export interface KlipyClip {
  title: string;
  slug: string;
  file: KlipyClipFile;
  file_meta: KlipyClipFileMeta;
  type: string;
}

// ============ Categories ============

// Comprehensive categories for KLIPY (based on common GIF/clip categories)
export const KLIPY_CATEGORIES = [
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
  { name: "Fashion & Beauty", value: "fashion-beauty" },
  { name: "Food & Drink", value: "food-drink" },
  { name: "Gaming", value: "gaming" },
  { name: "Greeting", value: "greeting" },
  { name: "Holiday", value: "holiday" },
  { name: "Identity", value: "identity" },
  { name: "Interests", value: "interests" },
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

// ============ Helper Functions ============

function getCustomerId(): string {
  let customerId = localStorage.getItem("klipy_customer_id");
  if (!customerId) {
    customerId = crypto.randomUUID();
    localStorage.setItem("klipy_customer_id", customerId);
  }
  return customerId;
}

// Get the best URL from a GIF (prefer webp/mp4 for performance, fallback to gif)
export function getBestGifUrl(gif: KlipyGif, size: "hd" | "md" | "sm" | "xs" = "md"): string {
  const fileSize = gif.file[size] || gif.file.md || gif.file.sm;
  if (!fileSize) return "";
  
  return fileSize.mp4?.url || fileSize.webp?.url || fileSize.gif?.url || "";
}

// Get thumbnail URL (smaller size for grid display)
export function getThumbnailUrl(gif: KlipyGif): string {
  const fileSize = gif.file.sm || gif.file.xs || gif.file.md;
  if (!fileSize) return "";
  
  return fileSize.webp?.url || fileSize.gif?.url || fileSize.jpg?.url || "";
}

// Get the GIF URL for embedding in posts - prefer gif format to preserve original
export function getEmbedUrl(gif: KlipyGif): string {
  // For GIFs, prefer the actual gif format to preserve animation and original dimensions
  const hdFile = gif.file.hd;
  const mdFile = gif.file.md;
  
  // Try to get GIF format first (preserves original dimensions)
  if (hdFile?.gif?.url) return hdFile.gif.url;
  if (mdFile?.gif?.url) return mdFile.gif.url;
  
  // Fallback to webp (also animated, good quality)
  if (hdFile?.webp?.url) return hdFile.webp.url;
  if (mdFile?.webp?.url) return mdFile.webp.url;
  
  // Last resort: mp4
  if (hdFile?.mp4?.url) return hdFile.mp4.url;
  if (mdFile?.mp4?.url) return mdFile.mp4.url;
  
  return "";
}

// Get the best URL from a Clip
export function getClipThumbnailUrl(clip: KlipyClip): string {
  return clip.file.gif || clip.file.webp || clip.file.mp4 || "";
}

export function getClipEmbedUrl(clip: KlipyClip): string {
  return clip.file.mp4 || clip.file.gif || clip.file.webp || "";
}

// ============ GIF API ============

export async function fetchTrendingGifs(
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyGif[]> {
  const customerId = getCustomerId();
  
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    customer_id: customerId,
    locale,
    content_filter: "medium",
  });

  try {
    const url = `${KLIPY_BASE_URL}/${KLIPY_API_KEY}/gifs/trending?${params}`;
    console.log("KLIPY GIF trending URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`KLIPY GIF API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log("KLIPY GIF trending response:", data);
    
    // Handle nested response: { result: true, data: { data: [...] } }
    if (data?.result && data?.data?.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    // Handle: { data: [...] }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle direct array
    if (Array.isArray(data)) {
      return data;
    }
    // Handle: { results: [...] }
    if (data?.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    console.warn("Unexpected KLIPY GIF response format:", data);
    return [];
  } catch (error) {
    console.error("KLIPY GIF fetch error:", error);
    return [];
  }
}

export async function searchGifs(
  query: string,
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyGif[]> {
  if (!query.trim()) {
    return fetchTrendingGifs(page, perPage, locale);
  }

  const customerId = getCustomerId();
  
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    per_page: perPage.toString(),
    customer_id: customerId,
    locale,
    content_filter: "medium",
  });

  try {
    const url = `${KLIPY_BASE_URL}/${KLIPY_API_KEY}/gifs/search?${params}`;
    console.log("KLIPY GIF search URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`KLIPY GIF API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log("KLIPY GIF search response:", data);
    
    // Handle nested response: { result: true, data: { data: [...] } }
    if (data?.result && data?.data?.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    // Handle: { data: [...] }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle direct array
    if (Array.isArray(data)) {
      return data;
    }
    // Handle: { results: [...] }
    if (data?.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    console.warn("Unexpected KLIPY GIF response format:", data);
    return [];
  } catch (error) {
    console.error("KLIPY GIF search error:", error);
    return [];
  }
}

// ============ Clips API ============

export async function fetchTrendingClips(
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyClip[]> {
  const customerId = getCustomerId();
  
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    customer_id: customerId,
    locale,
    content_filter: "medium",
  });

  try {
    const url = `${KLIPY_BASE_URL}/${KLIPY_API_KEY}/clips/trending?${params}`;
    console.log("KLIPY Clips trending URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`KLIPY Clips API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log("KLIPY Clips trending response:", data);
    
    // Handle nested response: { result: true, data: { data: [...] } }
    if (data?.result && data?.data?.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    // Handle: { data: [...] }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle direct array
    if (Array.isArray(data)) {
      return data;
    }
    
    console.warn("Unexpected KLIPY Clips response format:", data);
    return [];
  } catch (error) {
    console.error("KLIPY Clips fetch error:", error);
    return [];
  }
}

export async function searchClips(
  query: string,
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyClip[]> {
  if (!query.trim()) {
    return fetchTrendingClips(page, perPage, locale);
  }

  const customerId = getCustomerId();
  
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    per_page: perPage.toString(),
    customer_id: customerId,
    locale,
    content_filter: "medium",
  });

  try {
    const url = `${KLIPY_BASE_URL}/${KLIPY_API_KEY}/clips/search?${params}`;
    console.log("KLIPY Clips search URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`KLIPY Clips API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log("KLIPY Clips search response:", data);
    
    // Handle nested response: { result: true, data: { data: [...] } }
    if (data?.result && data?.data?.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    // Handle: { data: [...] }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    // Handle direct array
    if (Array.isArray(data)) {
      return data;
    }
    
    console.warn("Unexpected KLIPY Clips response format:", data);
    return [];
  } catch (error) {
    console.error("KLIPY Clips search error:", error);
    return [];
  }
}

// ============ Category-Based Fetching ============

/**
 * Fetch GIFs by category (uses search with category name)
 */
export async function fetchGifsByCategory(
  category: string,
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyGif[]> {
  if (!category.trim() || category === "all") {
    return fetchTrendingGifs(page, perPage, locale);
  }
  
  // Use category as search query
  return searchGifs(category.replace(/-/g, " "), page, perPage, locale);
}

/**
 * Fetch Clips by category (uses search with category name)
 */
export async function fetchClipsByCategory(
  category: string,
  page = 1,
  perPage = 24,
  locale = "us"
): Promise<KlipyClip[]> {
  if (!category.trim() || category === "all") {
    return fetchTrendingClips(page, perPage, locale);
  }
  
  return searchClips(category.replace(/-/g, " "), page, perPage, locale);
}
