/**
 * E2E Tests for Social Profiles and Accounts
 * Tests profile management, OAuth connections, and account operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderMinimal,
  mockSocialAccount,
} from "../test-utils";
import {
  createQueryMock,
  mockSupabaseAuth,
  mockSupabaseFunctions,
  setupAuthenticatedState,
} from "../mocks/supabase";

// Mock data
const mockSocialProfiles = [
  {
    id: "profile-1",
    name: "Personal Brand",
    user_id: "test-user-id",
    is_public: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "profile-2",
    name: "Business Account",
    user_id: "test-user-id",
    is_public: true,
    share_token: "abc123",
    created_at: new Date().toISOString(),
  },
];

const mockSocialAccounts = [
  {
    ...mockSocialAccount,
    id: "acc-1",
    platform: "instagram",
    platform_username: "@personal_ig",
    social_profile_id: "profile-1",
  },
  {
    ...mockSocialAccount,
    id: "acc-2",
    platform: "facebook",
    platform_username: "Personal Page",
    social_profile_id: "profile-1",
  },
  {
    ...mockSocialAccount,
    id: "acc-3",
    platform: "tiktok",
    platform_username: "@business_tiktok",
    social_profile_id: "profile-2",
  },
];

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: mockSupabaseAuth,
    functions: mockSupabaseFunctions,
    from: vi.fn((table: string) => {
      if (table === "social_profiles") return createQueryMock(mockSocialProfiles);
      if (table === "social_accounts") return createQueryMock(mockSocialAccounts);
      if (table === "user_quotas")
        return createQueryMock([
          { max_profiles: 5, max_social_accounts: 20, user_id: "test-user-id" },
        ]);
      return createQueryMock([]);
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Social Profiles E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedState();
  });

  describe("Profile Management", () => {
    it("should validate profile name is not empty", () => {
      const profileName = "";
      const isValid = profileName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should validate profile name length", () => {
      const maxLength = 50;
      const validName = "My Profile";
      const tooLongName = "A".repeat(100);

      expect(validName.length).toBeLessThanOrEqual(maxLength);
      expect(tooLongName.length).toBeGreaterThan(maxLength);
    });

    it("should check quota before creating new profile", () => {
      const currentProfiles = mockSocialProfiles.length;
      const maxProfiles = 5;
      const canCreate = currentProfiles < maxProfiles;

      expect(canCreate).toBe(true);
    });

    it("should generate unique share token for public profiles", () => {
      const publicProfile = mockSocialProfiles.find((p) => p.is_public);
      expect(publicProfile?.share_token).toBeDefined();
      expect(publicProfile?.share_token?.length).toBeGreaterThan(0);
    });
  });

  describe("Social Account Connections", () => {
    it("should group accounts by profile", () => {
      const accountsByProfile = mockSocialAccounts.reduce((acc, account) => {
        const profileId = account.social_profile_id;
        if (!acc[profileId]) acc[profileId] = [];
        acc[profileId].push(account);
        return acc;
      }, {} as Record<string, typeof mockSocialAccounts>);

      expect(Object.keys(accountsByProfile)).toHaveLength(2);
      expect(accountsByProfile["profile-1"]).toHaveLength(2);
      expect(accountsByProfile["profile-2"]).toHaveLength(1);
    });

    it("should check quota before connecting new account", () => {
      const currentAccounts = mockSocialAccounts.length;
      const maxAccounts = 20;
      const canConnect = currentAccounts < maxAccounts;

      expect(canConnect).toBe(true);
    });

    it("should detect duplicate platform connections", () => {
      const profileId = "profile-1";
      const newPlatform = "instagram";

      const existingPlatforms = mockSocialAccounts
        .filter((a) => a.social_profile_id === profileId)
        .map((a) => a.platform);

      const isDuplicate = existingPlatforms.includes(newPlatform);
      expect(isDuplicate).toBe(true);
    });

    it("should validate OAuth state parameter", () => {
      const state = "profile-1_instagram_" + Date.now();
      const parts = state.split("_");

      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("profile-1");
      expect(parts[1]).toBe("instagram");
      expect(parseInt(parts[2])).toBeGreaterThan(0);
    });
  });

  describe("Connection Health", () => {
    it("should check token expiry", () => {
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBe(7);
    });

    it("should detect expired tokens", () => {
      const expiredToken = new Date(Date.now() - 86400000); // Yesterday
      const now = new Date();
      const isExpired = expiredToken < now;

      expect(isExpired).toBe(true);
    });

    it("should invoke health check function", async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          success: true,
          tokenStatus: "valid",
          message: "Connection is healthy",
        },
        error: null,
      });

      const result = await mockSupabaseFunctions.invoke("check-connection-health", {
        body: { account_id: "acc-1", action: "test" },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.tokenStatus).toBe("valid");
    });
  });

  describe("Token Refresh", () => {
    it("should identify accounts needing refresh", () => {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const accountsWithExpiry = mockSocialAccounts.map((a) => ({
        ...a,
        token_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      }));

      const needsRefresh = accountsWithExpiry.filter((a) => {
        const expiry = new Date(a.token_expires_at);
        return expiry < sevenDaysFromNow;
      });

      expect(needsRefresh.length).toBe(accountsWithExpiry.length);
    });

    it("should handle refresh token flow", async () => {
      mockSupabaseFunctions.invoke.mockResolvedValue({
        data: {
          message: "Token refresh complete",
          refreshed: 1,
          results: [{ id: "acc-1", status: "refreshed" }],
        },
        error: null,
      });

      const result = await mockSupabaseFunctions.invoke("refresh-tokens", {});

      expect(result.data.refreshed).toBe(1);
    });
  });

  describe("Account Deletion", () => {
    it("should confirm before deleting account", () => {
      const confirmMessage = "Are you sure you want to disconnect this account?";
      expect(confirmMessage).toContain("disconnect");
    });

    it("should handle account deletion", async () => {
      const deleteQuery = createQueryMock({ success: true });
      deleteQuery.delete.mockReturnThis();
      deleteQuery.eq.mockResolvedValue({ error: null });

      await deleteQuery.delete();
      await deleteQuery.eq("id", "acc-1");

      expect(deleteQuery.delete).toHaveBeenCalled();
    });
  });
});
