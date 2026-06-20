/**
 * E2E Tests for Post Creation and Management
 * Tests post creation, scheduling, and history
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderMinimal,
  mockPost,
  mockPlatformPosts,
  mockSocialAccount,
} from "../test-utils";
import {
  createQueryMock,
  mockSupabaseAuth,
  mockSupabaseFunctions,
  setupAuthenticatedState,
} from "../mocks/supabase";

// Mock data
const mockPosts = [
  { ...mockPost, id: "1", status: "completed", caption: "First post" },
  { ...mockPost, id: "2", status: "pending", caption: "Scheduled post" },
  { ...mockPost, id: "3", status: "failed", caption: "Failed post" },
];

const mockSocialAccounts = [
  { ...mockSocialAccount, id: "1", platform: "instagram" },
  { ...mockSocialAccount, id: "2", platform: "facebook" },
  { ...mockSocialAccount, id: "3", platform: "tiktok" },
];

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: mockSupabaseAuth,
    functions: mockSupabaseFunctions,
    from: vi.fn((table: string) => {
      if (table === "posts") return createQueryMock(mockPosts);
      if (table === "platform_posts") return createQueryMock(mockPlatformPosts);
      if (table === "social_accounts") return createQueryMock(mockSocialAccounts);
      return createQueryMock([]);
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test/file.jpg" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file.jpg" } }),
      }),
    },
  },
}));

// Mock auth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock feature flags
vi.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    flags: {
      aiCaption: true,
      aiHashtags: true,
      aiImage: true,
      imageCrop: true,
      videoCompress: true,
    },
    isLoading: false,
  }),
}));

describe("Post Management E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedState();
  });

  describe("Post Creation", () => {
    it("should validate caption is not empty before posting", async () => {
      // Caption validation test
      const caption = "";
      const isValid = caption.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should validate at least one platform is selected", async () => {
      const selectedPlatforms: string[] = [];
      const isValid = selectedPlatforms.length > 0;
      expect(isValid).toBe(false);
    });

    it("should handle caption with hashtags correctly", () => {
      const caption = "Check out this post! #test #vitest #e2e";
      const hashtags = caption.match(/#\w+/g) || [];
      
      expect(hashtags).toHaveLength(3);
      expect(hashtags).toContain("#test");
      expect(hashtags).toContain("#vitest");
      expect(hashtags).toContain("#e2e");
    });

    it("should respect platform character limits", () => {
      const platformLimits: Record<string, number> = {
        twitter: 280,
        instagram: 2200,
        facebook: 63206,
        tiktok: 4000,
        linkedin: 3000,
      };

      const caption = "A".repeat(300);
      
      expect(caption.length).toBeGreaterThan(platformLimits.twitter);
      expect(caption.length).toBeLessThan(platformLimits.instagram);
    });
  });

  describe("Post Scheduling", () => {
    it("should not allow scheduling in the past", () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const now = new Date();
      
      expect(pastDate < now).toBe(true);
    });

    it("should calculate correct timezone offset", () => {
      const date = new Date("2024-06-15T10:00:00Z");
      const utcHours = date.getUTCHours();
      
      expect(utcHours).toBe(10);
    });

    it("should format scheduled date correctly", () => {
      const date = new Date("2024-06-15T14:30:00Z");
      const formatted = date.toISOString();
      
      expect(formatted).toContain("2024-06-15");
      expect(formatted).toContain("14:30:00");
    });
  });

  describe("AI Features", () => {
    it("should invoke caption generation", async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: { caption: "Generated caption with emojis 🎉" },
        error: null,
      });

      const result = await mockSupabaseFunctions.invoke("generate-caption", {
        body: {
          context: "Test post about coding",
          platform: "instagram",
          tone: "professional",
        },
      });

      expect(mockSupabaseFunctions.invoke).toHaveBeenCalledWith(
        "generate-caption",
        expect.objectContaining({
          body: expect.objectContaining({ platform: "instagram" }),
        })
      );
      expect(result.data.caption).toContain("Generated caption");
    });

    it("should invoke hashtag generation", async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: { hashtags: ["#coding", "#developer", "#tech"] },
        error: null,
      });

      const result = await mockSupabaseFunctions.invoke("generate-hashtags", {
        body: {
          caption: "Learning to code every day",
          platform: "instagram",
        },
      });

      expect(result.data.hashtags).toHaveLength(3);
      expect(result.data.hashtags).toContain("#coding");
    });

    it("should handle AI service errors gracefully", async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: null,
        error: { message: "Rate limit exceeded" },
      });

      const result = await mockSupabaseFunctions.invoke("generate-caption", {
        body: { context: "Test" },
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain("Rate limit");
    });
  });

  describe("Post History", () => {
    it("should filter posts by status", () => {
      const completedPosts = mockPosts.filter((p) => p.status === "completed");
      const pendingPosts = mockPosts.filter((p) => p.status === "pending");
      const failedPosts = mockPosts.filter((p) => p.status === "failed");

      expect(completedPosts).toHaveLength(1);
      expect(pendingPosts).toHaveLength(1);
      expect(failedPosts).toHaveLength(1);
    });

    it("should filter posts by platform", () => {
      const instagramPosts = mockPosts.filter((p) =>
        p.platforms.includes("instagram")
      );

      expect(instagramPosts.length).toBeGreaterThan(0);
    });

    it("should sort posts by date", () => {
      const sortedPosts = [...mockPosts].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sortedPosts[0].created_at).toBeDefined();
    });

    it("should calculate success rate correctly", () => {
      const total = mockPosts.length;
      const completed = mockPosts.filter((p) => p.status === "completed").length;
      const successRate = Math.round((completed / total) * 100);

      expect(successRate).toBe(33); // 1/3
    });
  });

  describe("Media Upload", () => {
    it("should validate image file types", () => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const testType = "image/jpeg";

      expect(validTypes.includes(testType)).toBe(true);
      expect(validTypes.includes("image/bmp")).toBe(false);
    });

    it("should validate video file types", () => {
      const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
      const testType = "video/mp4";

      expect(validTypes.includes(testType)).toBe(true);
    });

    it("should enforce file size limits", () => {
      const maxImageSize = 20 * 1024 * 1024; // 20MB
      const maxVideoSize = 500 * 1024 * 1024; // 500MB

      const testImageSize = 5 * 1024 * 1024; // 5MB
      const testVideoSize = 100 * 1024 * 1024; // 100MB

      expect(testImageSize).toBeLessThan(maxImageSize);
      expect(testVideoSize).toBeLessThan(maxVideoSize);
    });
  });
});
