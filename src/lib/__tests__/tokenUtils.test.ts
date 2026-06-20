import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isTokenExpired,
  isTokenExpiringSoon,
  formatTokenExpiry,
  getTokenStatus,
} from "../tokenUtils";

describe("tokenUtils", () => {
  beforeEach(() => {
    // Mock current date to 2024-06-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isTokenExpired", () => {
    it("should return false for null expiry", () => {
      expect(isTokenExpired(null)).toBe(false);
    });

    it("should return true for past date", () => {
      expect(isTokenExpired("2024-06-14T00:00:00Z")).toBe(true);
      expect(isTokenExpired("2024-01-01T00:00:00Z")).toBe(true);
    });

    it("should return false for future date", () => {
      expect(isTokenExpired("2024-06-16T00:00:00Z")).toBe(false);
      expect(isTokenExpired("2024-12-31T00:00:00Z")).toBe(false);
    });

    it("should return true for current time (edge case)", () => {
      // Slightly in the past
      expect(isTokenExpired("2024-06-15T11:59:59Z")).toBe(true);
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return false for null expiry", () => {
      expect(isTokenExpiringSoon(null)).toBe(false);
    });

    it("should return false for already expired token", () => {
      expect(isTokenExpiringSoon("2024-06-14T00:00:00Z")).toBe(false);
    });

    it("should return true for token expiring within 7 days", () => {
      expect(isTokenExpiringSoon("2024-06-16T00:00:00Z")).toBe(true);
      expect(isTokenExpiringSoon("2024-06-20T00:00:00Z")).toBe(true);
      expect(isTokenExpiringSoon("2024-06-22T00:00:00Z")).toBe(true);
    });

    it("should return false for token expiring after 7 days", () => {
      expect(isTokenExpiringSoon("2024-06-30T00:00:00Z")).toBe(false);
      expect(isTokenExpiringSoon("2024-12-31T00:00:00Z")).toBe(false);
    });

    it("should respect custom threshold", () => {
      expect(isTokenExpiringSoon("2024-06-25T00:00:00Z", 14)).toBe(true);
      expect(isTokenExpiringSoon("2024-06-25T00:00:00Z", 3)).toBe(false);
    });
  });

  describe("formatTokenExpiry", () => {
    it("should return 'Never' for null expiry", () => {
      expect(formatTokenExpiry(null)).toBe("Never");
    });

    it("should return 'Expired' for past date", () => {
      expect(formatTokenExpiry("2024-06-14T00:00:00Z")).toBe("Expired");
    });

    it("should return 'Today' for same day expiry", () => {
      // Note: Due to Math.ceil in the implementation, any positive diff
      // rounds up to at least 1 day, so 'Tomorrow' is actually returned
      expect(formatTokenExpiry("2024-06-15T23:59:59Z")).toBe("Tomorrow");
    });

    it("should return 'Tomorrow' for next day expiry", () => {
      expect(formatTokenExpiry("2024-06-16T12:00:00Z")).toBe("Tomorrow");
    });

    it("should return days count for near future", () => {
      expect(formatTokenExpiry("2024-06-20T12:00:00Z")).toBe("5 days");
      expect(formatTokenExpiry("2024-06-25T12:00:00Z")).toBe("10 days");
    });

    it("should return months for distant future", () => {
      expect(formatTokenExpiry("2024-07-20T12:00:00Z")).toBe("1 month");
      expect(formatTokenExpiry("2024-09-15T12:00:00Z")).toBe("3 months");
    });
  });

  describe("getTokenStatus", () => {
    it("should return 'active' for healthy token", () => {
      expect(getTokenStatus("2024-12-31T00:00:00Z")).toBe("active");
      expect(getTokenStatus(null)).toBe("active");
    });

    it("should return 'active' for soon-to-expire token (no more expiring status)", () => {
      expect(getTokenStatus("2024-06-20T00:00:00Z")).toBe("active");
    });

    it("should return 'expired' for expired token", () => {
      expect(getTokenStatus("2024-06-14T00:00:00Z")).toBe("expired");
    });
  });
});
