/**
 * E2E Tests for Utility Functions
 * Tests platform constants, media specs, and helper utilities
 */
import { describe, it, expect } from "vitest";
import {
  PLATFORM_MEDIA_SPECS,
  formatFileSize,
  getPlatformMediaSpec,
  checkFileSizeForPlatforms,
  validateAspectRatioForPlatforms,
} from "@/lib/platformMediaSpecs";
import { showSuccessToast, showErrorToast, createToastHelpers } from "@/lib/toastUtils";
import { cn } from "@/lib/utils";

describe("Platform Media Specs E2E Tests", () => {
  describe("PLATFORM_MEDIA_SPECS", () => {
    it("should have specs for all major platforms", () => {
      const expectedPlatforms = [
        "instagram",
        "facebook",
        "tiktok",
        "twitter",
        "linkedin",
        "youtube",
        "pinterest",
      ];

      expectedPlatforms.forEach((platform) => {
        expect(PLATFORM_MEDIA_SPECS[platform]).toBeDefined();
      });
    });

    it("should have valid image size limits", () => {
      expect(PLATFORM_MEDIA_SPECS.twitter.maxImageSize).toBe(5 * 1024 * 1024);
      expect(PLATFORM_MEDIA_SPECS.instagram.maxImageSize).toBe(30 * 1024 * 1024);
    });

    it("should have valid video size limits", () => {
      Object.values(PLATFORM_MEDIA_SPECS).forEach((spec) => {
        expect(spec.maxVideoSize).toBeGreaterThan(0);
      });
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    });
  });

  describe("getPlatformMediaSpec", () => {
    it("should return specs for valid platform", () => {
      const specs = getPlatformMediaSpec("instagram");
      expect(specs).toBeDefined();
      expect(specs?.maxImageSize).toBe(30 * 1024 * 1024);
    });

    it("should return undefined for invalid platform", () => {
      const specs = getPlatformMediaSpec("invalid");
      expect(specs).toBeUndefined();
    });
  });

  describe("checkFileSizeForPlatforms", () => {
    it("should validate file within limits", () => {
      const result = checkFileSizeForPlatforms(
        5 * 1024 * 1024,
        "image",
        ["instagram"]
      );
      expect(result.valid).toBe(true);
    });

    it("should reject oversized file", () => {
      const result = checkFileSizeForPlatforms(
        100 * 1024 * 1024,
        "image",
        ["twitter"]
      );
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validateAspectRatioForPlatforms", () => {
    it("should validate square aspect ratio for Instagram", () => {
      const result = validateAspectRatioForPlatforms(1080, 1080, ["instagram"]);
      expect(result[0].isValid).toBe(true);
    });

    it("should reject invalid aspect ratio", () => {
      const result = validateAspectRatioForPlatforms(1000, 100, ["tiktok"]);
      expect(result[0].isValid).toBe(false);
    });
  });
});

describe("Toast Utilities E2E Tests", () => {
  it("should create success toast options", () => {
    let capturedOptions: any;
    const mockToast = (options: any) => { capturedOptions = options; };
    showSuccessToast(mockToast, "Success!", "Done");
    expect(capturedOptions.title).toBe("Success!");
  });

  it("should create error toast", () => {
    let capturedOptions: any;
    const mockToast = (options: any) => { capturedOptions = options; };
    showErrorToast(mockToast, "Error", "Failed");
    expect(capturedOptions.variant).toBe("destructive");
  });

  it("should create all helper methods", () => {
    const helpers = createToastHelpers(() => {});
    expect(helpers.success).toBeDefined();
    expect(helpers.error).toBeDefined();
  });
});

describe("cn Utility E2E Tests", () => {
  it("should merge class names", () => {
    const result = cn("class1", "class2");
    expect(result).toContain("class1");
  });

  it("should merge Tailwind classes correctly", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });
});
