/**
 * Unsplash API Service
 * https://unsplash.com/documentation
 * Uses edge function proxy to protect API key
 */

const UNSPLASH_BASE_URL = "https://api.unsplash.com";

// ============ Photo Types ============

export interface UnsplashPhotoUrls {
  raw: string;
  full: string;
  regular: string;
  small: string;
  thumb: string;
  small_s3: string;
}

export interface UnsplashUser {
  id: string;
  username: string;
  name: string;
  portfolio_url: string | null;
  bio: string | null;
  location: string | null;
  profile_image: {
    small: string;
    medium: string;
    large: string;
  };
  links: {
    html: string;
  };
}

export interface UnsplashPhoto {
  id: string;
  slug: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: UnsplashPhotoUrls;
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: UnsplashUser;
}

// ============ Response Types ============

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// ============ Helper Functions ============

export function getPhotoThumbnail(photo: UnsplashPhoto): string {
  return photo.urls.small || photo.urls.thumb;
}

export function getPhotoFullSize(photo: UnsplashPhoto): string {
  return photo.urls.regular || photo.urls.full;
}

export function getPhotoAttribution(photo: UnsplashPhoto): string {
  return `Photo by ${photo.user.name} on Unsplash`;
}

export function getPhotographerUrl(photo: UnsplashPhoto): string {
  return photo.user.links.html + "?utm_source=postora&utm_medium=referral";
}

export function getUnsplashUrl(): string {
  return "https://unsplash.com?utm_source=postora&utm_medium=referral";
}

// ============ Orientation Types ============

export type UnsplashOrientation = "all" | "landscape" | "portrait" | "squarish";

// ============ Color filter ============

export type UnsplashColor =
  | "all"
  | "black_and_white"
  | "black"
  | "white"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "magenta"
  | "green"
  | "teal"
  | "blue";

// ============ API Functions ============

async function fetchFromUnsplash(endpoint: string): Promise<Response> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  // Use edge function proxy
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsplash-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ endpoint }),
    }
  );

  return response;
}

/**
 * Fetch popular/editorial photos from Unsplash
 */
export async function fetchEditorialPhotos(
  page = 1,
  perPage = 24,
  orderBy: "latest" | "popular" = "popular"
): Promise<UnsplashPhoto[]> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      order_by: orderBy,
    });

    const endpoint = `/photos?${params}`;
    console.log("Unsplash editorial photos endpoint:", endpoint);

    const response = await fetchFromUnsplash(endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Unsplash API error: ${response.status}`, errorText);
      return [];
    }

    const data: UnsplashPhoto[] = await response.json();
    console.log("Unsplash editorial photos response:", data?.length, "photos");
    return data || [];
  } catch (error) {
    console.error("Unsplash photos fetch error:", error);
    return [];
  }
}

/**
 * Search photos on Unsplash
 */
export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 24,
  orientation: UnsplashOrientation = "all",
  color: UnsplashColor = "all"
): Promise<UnsplashPhoto[]> {
  if (!query.trim()) {
    return fetchEditorialPhotos(page, perPage);
  }

  try {
    const params = new URLSearchParams({
      query: query,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (orientation !== "all") {
      params.set("orientation", orientation);
    }

    if (color !== "all") {
      params.set("color", color);
    }

    const endpoint = `/search/photos?${params}`;
    console.log("Unsplash search photos endpoint:", endpoint);

    const response = await fetchFromUnsplash(endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Unsplash API error: ${response.status}`, errorText);
      return [];
    }

    const data: UnsplashSearchResponse = await response.json();
    console.log("Unsplash search photos response:", data?.total, "total,", data?.results?.length, "returned");
    return data.results || [];
  } catch (error) {
    console.error("Unsplash photos search error:", error);
    return [];
  }
}

/**
 * Get random photos from Unsplash
 */
export async function getRandomPhotos(
  count = 12,
  orientation?: UnsplashOrientation,
  query?: string
): Promise<UnsplashPhoto[]> {
  try {
    const params = new URLSearchParams({
      count: Math.min(count, 30).toString(),
    });

    if (orientation && orientation !== "all") {
      params.set("orientation", orientation);
    }

    if (query) {
      params.set("query", query);
    }

    const endpoint = `/photos/random?${params}`;
    console.log("Unsplash random photos endpoint:", endpoint);

    const response = await fetchFromUnsplash(endpoint);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Unsplash API error: ${response.status}`, errorText);
      return [];
    }

    const data: UnsplashPhoto[] = await response.json();
    return data || [];
  } catch (error) {
    console.error("Unsplash random photos fetch error:", error);
    return [];
  }
}

/**
 * Track photo download (required by Unsplash API guidelines)
 * Call this when user selects a photo for use
 */
export async function trackDownload(photo: UnsplashPhoto): Promise<void> {
  try {
    // Extract download_location endpoint
    const downloadLocation = photo.links.download_location;
    if (!downloadLocation) return;

    // The download_location is a full URL, we need to extract the path
    const url = new URL(downloadLocation);
    const endpoint = url.pathname + url.search;

    await fetchFromUnsplash(endpoint);
    console.log("Unsplash download tracked for photo:", photo.id);
  } catch (error) {
    console.error("Failed to track Unsplash download:", error);
    // Non-critical, don't throw
  }
}

// ============ Orientation Filter Options ============

export const UNSPLASH_ORIENTATIONS: { value: UnsplashOrientation; label: string }[] = [
  { value: "all", label: "All" },
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
  { value: "squarish", label: "Square" },
];
