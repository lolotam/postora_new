import { describe, it, expect } from "vitest";
import { resolveMediaPublicUrl } from "../mediaUrl";

/**
 * Regression coverage for the broken-media-link incident (2026-06-20):
 * editing a scheduled post rebuilt Cloudinary URLs from `storage_bucket`
 * (the literal "cloudinary") + `cloudinary_public_id`, producing 404s.
 * The real cloud name, version segment, and extension live ONLY in the
 * `secure_url` already stored in `file_path`, which we now return verbatim.
 */
describe("resolveMediaPublicUrl", () => {
  describe("Cloudinary rows return file_path verbatim", () => {
    // Regression (Rule 6): each row is a real production record shape.
    // Before the fix these produced
    //   https://res.cloudinary.com/cloudinary/image/upload/<public_id>  (wrong cloud, no version, no ext)
    // and for video used /image/upload/ instead of /video/upload/.
    it.each([
      [
        "image",
        {
          file_path:
            "https://res.cloudinary.com/dur1soa8n/image/upload/v1781951136/media/user/2026-06-20/postora-logo.png",
          storage_bucket: "cloudinary",
          cloudinary_public_id: "media/user/2026-06-20/postora-logo",
        },
      ],
      [
        "video",
        {
          file_path:
            "https://res.cloudinary.com/dur1soa8n/video/upload/v1781356757/media/user/2026-06-13/clip.mp4",
          storage_bucket: "cloudinary",
          cloudinary_public_id: "media/user/2026-06-13/clip",
        },
      ],
      [
        "image detected by URL even when bucket is missing",
        {
          file_path:
            "https://res.cloudinary.com/dur1soa8n/image/upload/v1781133761/media/user/photo.jpg",
          storage_bucket: null,
          cloudinary_public_id: "media/user/photo",
        },
      ],
    ])("returns the full secure_url for a %s row without rebuilding it", (_label, row) => {
      const result = resolveMediaPublicUrl(row);

      // Returns file_path exactly — never reconstructed.
      expect(result).toBe(row.file_path);
      // Must carry the real cloud name, version segment, and extension
      // (all three were missing in the buggy rebuild).
      expect(result).toContain("/dur1soa8n/");
      expect(result).toMatch(/\/v\d+\//);
      expect(result).toMatch(/\.(png|jpg|mp4)$/i);
    });
  });

  describe("Supabase Storage paths go through the injected resolver", () => {
    it("resolves an object path using storage_bucket and falls back to 'media'", () => {
      const seen: Array<{ bucket: string; path: string }> = [];
      const resolver = (bucket: string, path: string) => {
        seen.push({ bucket, path });
        return `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`;
      };

      // Explicit bucket
      const explicit = resolveMediaPublicUrl(
        { file_path: "uploads/img.png", storage_bucket: "user-media" },
        resolver,
      );
      expect(explicit).toBe(
        "https://example.supabase.co/storage/v1/object/public/user-media/uploads/img.png",
      );

      // Missing bucket -> default "media"
      const defaulted = resolveMediaPublicUrl({ file_path: "uploads/img.png" }, resolver);
      expect(defaulted).toBe(
        "https://example.supabase.co/storage/v1/object/public/media/uploads/img.png",
      );
      expect(seen[1].bucket).toBe("media");
    });

    it("returns the raw path when no resolver is provided", () => {
      const result = resolveMediaPublicUrl({ file_path: "uploads/img.png" });
      expect(result).toBe("uploads/img.png");
    });
  });

  describe("null guards", () => {
    it("returns empty string when file_path is null and no resolver applies", () => {
      expect(resolveMediaPublicUrl({ file_path: null })).toBe("");
    });

    it("treats a full non-Cloudinary http URL as already resolved", () => {
      const external = "https://cdn.example.com/some-other-cdn/asset.jpg";
      expect(resolveMediaPublicUrl({ file_path: external })).toBe(external);
    });
  });
});
