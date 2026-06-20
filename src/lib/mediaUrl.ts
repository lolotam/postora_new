/**
 * Resolve the public URL for a stored media-file row.
 *
 * Why this exists: when editing a scheduled post, the previous code rebuilt the
 * Cloudinary URL from `storage_bucket` + `cloudinary_public_id`. That produced
 * broken links because `storage_bucket` holds the literal string "cloudinary"
 * (NOT a cloud name) and `cloudinary_public_id` lacks the version segment and
 * file extension. The complete, correct URL is already stored in `file_path`
 * (Cloudinary's `secure_url`), so we return it verbatim.
 */

/** Minimal view of a `media_files` row needed to resolve a URL. */
export interface MediaFileUrlRow {
  file_path: string | null | undefined;
  storage_bucket?: string | null | undefined;
  cloudinary_public_id?: string | null | undefined;
}

/**
 * Function that turns a Supabase-Storage object path into a public URL.
 * Injected so this module stays pure and testable (no Supabase import required).
 */
export type StorageUrlResolver = (bucket: string, path: string) => string;

/**
 * Resolve a media-file row to its public URL.
 *
 * Rules, in order:
 *  1. Cloudinary rows (`storage_bucket === "cloudinary"` or the path is a
 *     `res.cloudinary.com` URL): return `file_path` verbatim — it already is
 *     the full `secure_url` (cloud name + version + extension).
 *  2. Any other full HTTP(S) URL: return it verbatim (other CDNs, legacy URLs).
 *  3. Supabase-Storage object paths: resolve via the injected resolver, using
 *     `storage_bucket` (or "media" as a fallback default).
 *
 * @returns the resolved public URL, or the raw `file_path` (possibly null) when
 *          no better option is available — callers should null-check.
 */
export function resolveMediaPublicUrl(
  row: MediaFileUrlRow,
  storageResolver?: StorageUrlResolver,
): string {
  const filePath = row?.file_path;

  // 1. Cloudinary — file_path IS the complete secure_url.
  const isCloudinary =
    row?.storage_bucket === "cloudinary" ||
    (typeof filePath === "string" && filePath.includes("res.cloudinary.com"));
  if (isCloudinary && typeof filePath === "string") {
    return filePath;
  }

  // 2. Any other full URL.
  if (typeof filePath === "string" && /^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  // 3. Supabase-Storage object path.
  const bucket = row?.storage_bucket || "media";
  if (typeof filePath === "string" && storageResolver) {
    return storageResolver(bucket, filePath);
  }

  // Nothing better available — surface the raw value for the caller to handle.
  return filePath ?? "";
}
