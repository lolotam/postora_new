/**
 * Pixabay API Service
 * https://pixabay.com/api
 */

const PIXABAY_API_KEY = "27387066-491dd6042921322a18c39d6bf";
const PIXABAY_BASE_URL = "https://pixabay.com/api";

// ============ Photo Types ============

export interface PixabayPhoto {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

// ============ Video Types ============

export interface PixabayVideoSize {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail?: string;
}

export interface PixabayVideoSizes {
  large?: PixabayVideoSize;
  medium: PixabayVideoSize;
  small: PixabayVideoSize;
  tiny: PixabayVideoSize;
}

export interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  // Older typings referenced picture_id, but the current API returns thumbnails per size.
  picture_id?: string;
  videos: PixabayVideoSizes;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

// ============ Response Types ============

interface PixabayPhotosResponse {
  total: number;
  totalHits: number;
  hits: PixabayPhoto[];
}

interface PixabayVideosResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

// ============ Helper Functions ============

export function getPhotoThumbnail(photo: PixabayPhoto): string {
  return photo.webformatURL || photo.previewURL;
}

export function getPhotoFullSize(photo: PixabayPhoto): string {
  return photo.largeImageURL || photo.webformatURL;
}

export function getVideoThumbnail(video: PixabayVideo): string {
  // Pixabay video API returns thumbnails per size (preferred)
  return (
    video.videos.medium.thumbnail ||
    video.videos.small.thumbnail ||
    video.videos.tiny.thumbnail ||
    // last-resort fallback: try to derive from mp4 url
    (video.videos.tiny?.url
      ? video.videos.tiny.url.replace(".mp4", ".jpg").replace("_tiny", "_medium")
      : "")
  );
}

export function getVideoUrl(video: PixabayVideo): string {
  // Prefer medium or large quality
  return video.videos.large?.url || video.videos.medium.url || video.videos.small.url;
}

// ============ Orientation & Image Types ============

export type PixabayOrientation = "all" | "horizontal" | "vertical";
export type PixabayImageType = "all" | "photo" | "illustration" | "vector";

// ============ Client-side Orientation Filtering ============

const SQUARE_TOLERANCE = 0.15; // Allow 15% tolerance for "square" detection

function getPhotoOrientation(photo: PixabayPhoto): "horizontal" | "vertical" | "square" {
  const ratio = photo.imageWidth / photo.imageHeight;
  if (ratio >= 1 - SQUARE_TOLERANCE && ratio <= 1 + SQUARE_TOLERANCE) {
    return "square";
  }
  return ratio > 1 ? "horizontal" : "vertical";
}

function getVideoOrientation(video: PixabayVideo): "horizontal" | "vertical" | "square" {
  // Use medium video size for dimensions
  const videoSize = video.videos.medium || video.videos.small || video.videos.tiny;
  const ratio = videoSize.width / videoSize.height;
  if (ratio >= 1 - SQUARE_TOLERANCE && ratio <= 1 + SQUARE_TOLERANCE) {
    return "square";
  }
  return ratio > 1 ? "horizontal" : "vertical";
}

function filterPhotosByOrientation(photos: PixabayPhoto[], orientation: PixabayOrientation): PixabayPhoto[] {
  if (orientation === "all") return photos;
  return photos.filter(photo => getPhotoOrientation(photo) === orientation);
}

function filterVideosByOrientation(videos: PixabayVideo[], orientation: PixabayOrientation): PixabayVideo[] {
  if (orientation === "all") return videos;
  return videos.filter(video => getVideoOrientation(video) === orientation);
}

// ============ Photos API ============

export async function fetchPopularPhotos(
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayPhoto[]> {
  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      image_type: "photo",
      order: "popular",
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/?${params}`;
    console.log("Pixabay popular photos URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayPhotosResponse = await response.json();
    console.log("Pixabay popular photos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.hits || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pixabay photos fetch error:", error);
    return [];
  }
}

export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayPhoto[]> {
  if (!query.trim()) {
    return fetchPopularPhotos(page, perPage, orientation);
  }

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      image_type: "photo",
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/?${params}`;
    console.log("Pixabay search photos URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayPhotosResponse = await response.json();
    console.log("Pixabay search photos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.hits || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pixabay photos search error:", error);
    return [];
  }
}

// ============ GIFs API ============

export async function fetchPopularGifs(
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayPhoto[]> {
  try {
    // Pixabay treats animated GIFs as type "animation" or we can filter for .gif extension
    // Using category approach with "animation" type filter
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      order: "popular",
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
      // Search for GIF-related content
      q: "animated gif",
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/?${params}`;
    console.log("Pixabay popular GIFs URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayPhotosResponse = await response.json();
    console.log("Pixabay popular GIFs response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.hits || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pixabay GIFs fetch error:", error);
    return [];
  }
}

export async function searchGifs(
  query: string,
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayPhoto[]> {
  if (!query.trim()) {
    return fetchPopularGifs(page, perPage, orientation);
  }

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: `${query} gif animated`,
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/?${params}`;
    console.log("Pixabay search GIFs URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayPhotosResponse = await response.json();
    console.log("Pixabay search GIFs response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.hits || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pixabay GIFs search error:", error);
    return [];
  }
}

// ============ Videos API ============

export async function fetchPopularVideos(
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayVideo[]> {
  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      order: "popular",
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
    });
    if (orientation !== "all") {
      // Pixabay videos use "horizontal"/"vertical" same as photos
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/videos/?${params}`;
    console.log("Pixabay popular videos URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayVideosResponse = await response.json();
    console.log("Pixabay popular videos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const videos = data.hits || [];
    return filterVideosByOrientation(videos, orientation);
  } catch (error) {
    console.error("Pixabay videos fetch error:", error);
    return [];
  }
}

export async function searchVideos(
  query: string,
  page = 1,
  perPage = 24,
  orientation: PixabayOrientation = "all"
): Promise<PixabayVideo[]> {
  if (!query.trim()) {
    return fetchPopularVideos(page, perPage, orientation);
  }

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      per_page: perPage.toString(),
      page: page.toString(),
      safesearch: "true",
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PIXABAY_BASE_URL}/videos/?${params}`;
    console.log("Pixabay search videos URL:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return [];
    }

    const data: PixabayVideosResponse = await response.json();
    console.log("Pixabay search videos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const videos = data.hits || [];
    return filterVideosByOrientation(videos, orientation);
  } catch (error) {
    console.error("Pixabay videos search error:", error);
    return [];
  }
}
