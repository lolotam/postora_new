import React, { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { vi } from "vitest";

// Mock feature flags globally for tests
vi.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    flags: {
      aiCaption: true,
      aiHashtags: true,
      aiImage: true,
      aiThumbnails: true,
      imageCrop: true,
      videoCompress: true,
      tiktokTranscode: true,
    },
    isLoading: false,
    broadcastRefresh: vi.fn(),
  }),
  FLAG_KEYS: [],
  FLAG_KEY_MAP: {},
}));

/**
 * Creates a fresh QueryClient for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper with all providers for full integration tests
 */
export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Minimal wrapper for component tests without auth
 */
export function MinimalProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Custom render with minimal providers (no auth)
 */
export function renderMinimal(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <MinimalProviders queryClient={queryClient}>{children}</MinimalProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Mock authenticated user for tests
 */
export const mockAuthUser = {
  id: "test-user-id",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { full_name: "Test User" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

/**
 * Mock session for auth tests
 */
export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockAuthUser,
};

/**
 * Mock social account data
 */
export const mockSocialAccount = {
  id: "social-account-id",
  platform: "instagram",
  platform_username: "@testuser",
  platform_user_id: "123456",
  avatar_url: "https://example.com/avatar.jpg",
  is_active: true,
  user_id: "test-user-id",
  access_token: "mock-token",
  connected_at: new Date().toISOString(),
};

/**
 * Mock post data
 */
export const mockPost = {
  id: "post-id",
  user_id: "test-user-id",
  caption: "Test caption #test",
  platforms: ["instagram", "facebook"],
  status: "pending",
  scheduled_at: new Date(Date.now() + 86400000).toISOString(),
  created_at: new Date().toISOString(),
  media_file_ids: [],
  metadata: {},
};

/**
 * Mock platform posts
 */
export const mockPlatformPosts = [
  {
    id: "platform-post-1",
    post_id: "post-id",
    platform: "instagram",
    status: "completed",
    platform_post_url: "https://instagram.com/p/123",
    posted_at: new Date().toISOString(),
  },
  {
    id: "platform-post-2",
    post_id: "post-id",
    platform: "facebook",
    status: "pending",
  },
];

/**
 * Wait for async operations in tests
 */
export async function waitForAsync(ms = 100) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
