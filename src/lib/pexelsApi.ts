/**
 * Pexels API Service
 * https://api.pexels.com
 */

const PEXELS_API_KEY = "RPx8cqUIZfKQe3mSphCQCEnfxawpVyK2eXZ3QTOaRU893Ev4GC8Lnfty";
const PEXELS_BASE_URL = "https://api.pexels.com";

// ============ Photo Types ============

export interface PexelsPhotoSrc {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsPhotoSrc;
  alt: string;
}

// ============ Video Types ============

export interface PexelsVideoFile {
  id: number;
  quality: "sd" | "hd" | "uhd";
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideoUser {
  id: number;
  name: string;
  url: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string; // thumbnail
  duration: number;
  user: PexelsVideoUser;
  video_files: PexelsVideoFile[];
}

// ============ Response Types ============

interface PexelsPhotosResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

interface PexelsVideosResponse {
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  total_results: number;
  next_page?: string;
}

// ============ Helper Functions ============

export function getPhotoThumbnail(photo: PexelsPhoto): string {
  return photo.src.medium || photo.src.small || photo.src.tiny;
}

export function getPhotoFullSize(photo: PexelsPhoto): string {
  return photo.src.large2x || photo.src.large || photo.src.original;
}

export function getVideoThumbnail(video: PexelsVideo): string {
  return video.image;
}

export function getVideoUrl(video: PexelsVideo): string {
  // Sort by quality preference: hd > sd, prefer mp4
  const sortedFiles = [...video.video_files].sort((a, b) => {
    // Prefer mp4
    if (a.file_type === "video/mp4" && b.file_type !== "video/mp4") return -1;
    if (b.file_type === "video/mp4" && a.file_type !== "video/mp4") return 1;
    
    // Then by quality
    const qualityOrder = { hd: 0, sd: 1, uhd: 2 };
    return (qualityOrder[a.quality] || 99) - (qualityOrder[b.quality] || 99);
  });

  // Return the best option
  const bestFile = sortedFiles.find(f => f.file_type === "video/mp4") || sortedFiles[0];
  return bestFile?.link || "";
}

// ============ Orientation Types ============

export type PexelsOrientation = "all" | "landscape" | "portrait" | "square";

// ============ Client-side Orientation Filtering ============

const SQUARE_TOLERANCE = 0.15; // Allow 15% tolerance for "square" detection

function getPhotoOrientation(photo: PexelsPhoto): "landscape" | "portrait" | "square" {
  const ratio = photo.width / photo.height;
  if (ratio >= 1 - SQUARE_TOLERANCE && ratio <= 1 + SQUARE_TOLERANCE) {
    return "square";
  }
  return ratio > 1 ? "landscape" : "portrait";
}

function getVideoOrientation(video: PexelsVideo): "landscape" | "portrait" | "square" {
  const ratio = video.width / video.height;
  if (ratio >= 1 - SQUARE_TOLERANCE && ratio <= 1 + SQUARE_TOLERANCE) {
    return "square";
  }
  return ratio > 1 ? "landscape" : "portrait";
}

function filterPhotosByOrientation(photos: PexelsPhoto[], orientation: PexelsOrientation): PexelsPhoto[] {
  if (orientation === "all") return photos;
  return photos.filter(photo => getPhotoOrientation(photo) === orientation);
}

function filterVideosByOrientation(videos: PexelsVideo[], orientation: PexelsOrientation): PexelsVideo[] {
  if (orientation === "all") return videos;
  return videos.filter(video => getVideoOrientation(video) === orientation);
}

// ============ Photos API ============

export async function fetchCuratedPhotos(
  page = 1,
  perPage = 24,
  orientation: PexelsOrientation = "all"
): Promise<PexelsPhoto[]> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PEXELS_BASE_URL}/v1/curated?${params}`;
    console.log("Pexels curated photos URL:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsPhotosResponse = await response.json();
    console.log("Pexels curated photos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.photos || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pexels photos fetch error:", error);
    return [];
  }
}

export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 24,
  orientation: PexelsOrientation = "all"
): Promise<PexelsPhoto[]> {
  if (!query.trim()) {
    return fetchCuratedPhotos(page, perPage, orientation);
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
    
    const url = `${PEXELS_BASE_URL}/v1/search?${params}`;
    console.log("Pexels search photos URL:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsPhotosResponse = await response.json();
    console.log("Pexels search photos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const photos = data.photos || [];
    return filterPhotosByOrientation(photos, orientation);
  } catch (error) {
    console.error("Pexels photos search error:", error);
    return [];
  }
}

// ============ Videos API ============

export async function fetchPopularVideos(
  page = 1,
  perPage = 24,
  orientation: PexelsOrientation = "all"
): Promise<PexelsVideo[]> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (orientation !== "all") {
      params.set("orientation", orientation);
    }
    
    const url = `${PEXELS_BASE_URL}/videos/popular?${params}`;
    console.log("Pexels popular videos URL:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsVideosResponse = await response.json();
    console.log("Pexels popular videos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const videos = data.videos || [];
    return filterVideosByOrientation(videos, orientation);
  } catch (error) {
    console.error("Pexels videos fetch error:", error);
    return [];
  }
}

export async function searchVideos(
  query: string,
  page = 1,
  perPage = 24,
  orientation: PexelsOrientation = "all"
): Promise<PexelsVideo[]> {
  if (!query.trim()) {
    return fetchPopularVideos(page, perPage, orientation);
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
    
    const url = `${PEXELS_BASE_URL}/videos/search?${params}`;
    console.log("Pexels search videos URL:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsVideosResponse = await response.json();
    console.log("Pexels search videos response:", data);
    
    // Apply client-side filtering for 100% accuracy
    const videos = data.videos || [];
    return filterVideosByOrientation(videos, orientation);
  } catch (error) {
    console.error("Pexels videos search error:", error);
    return [];
  }
}
