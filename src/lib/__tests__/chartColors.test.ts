import { describe, it, expect } from "vitest";
import {
  CHART_COLORS,
  PLATFORM_COLORS,
  STATUS_COLORS,
  getPlatformColor,
  getStatusColor,
} from "../chartColors";

describe("chartColors", () => {
  describe("CHART_COLORS", () => {
    it("should have 6 colors defined", () => {
      expect(CHART_COLORS).toHaveLength(6);
    });

    it("should have valid HSL color strings", () => {
      CHART_COLORS.forEach((color) => {
        expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
      });
    });
  });

  describe("PLATFORM_COLORS", () => {
    it("should have colors for all major platforms", () => {
      const expectedPlatforms = [
        "instagram",
        "facebook",
        "tiktok",
        "twitter",
        "linkedin",
        "pinterest",
        "youtube",
      ];

      expectedPlatforms.forEach((platform) => {
        expect(PLATFORM_COLORS[platform]).toBeDefined();
      });
    });

    it("should have valid HSL color strings", () => {
      Object.values(PLATFORM_COLORS).forEach((color) => {
        expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
      });
    });
  });

  describe("STATUS_COLORS", () => {
    it("should have colors for all statuses", () => {
      const expectedStatuses = [
        "completed",
        "published",
        "scheduled",
        "pending",
        "failed",
        "processing",
      ];

      expectedStatuses.forEach((status) => {
        expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBeDefined();
      });
    });
  });

  describe("getPlatformColor", () => {
    it("should return correct color for known platform", () => {
      expect(getPlatformColor("instagram")).toBe(PLATFORM_COLORS.instagram);
      expect(getPlatformColor("facebook")).toBe(PLATFORM_COLORS.facebook);
      expect(getPlatformColor("youtube")).toBe(PLATFORM_COLORS.youtube);
    });

    it("should return fallback color for unknown platform", () => {
      expect(getPlatformColor("unknown")).toBe(CHART_COLORS[0]);
      expect(getPlatformColor("unknown", 2)).toBe(CHART_COLORS[2]);
    });

    it("should cycle through chart colors for unknown platforms", () => {
      expect(getPlatformColor("unknown", 6)).toBe(CHART_COLORS[0]);
      expect(getPlatformColor("unknown", 7)).toBe(CHART_COLORS[1]);
    });
  });

  describe("getStatusColor", () => {
    it("should return correct color for known status", () => {
      expect(getStatusColor("completed")).toBe(STATUS_COLORS.completed);
      expect(getStatusColor("failed")).toBe(STATUS_COLORS.failed);
      expect(getStatusColor("scheduled")).toBe(STATUS_COLORS.scheduled);
    });

    it("should return pending color for unknown status", () => {
      expect(getStatusColor("unknown")).toBe(STATUS_COLORS.pending);
      expect(getStatusColor("")).toBe(STATUS_COLORS.pending);
    });
  });
});
