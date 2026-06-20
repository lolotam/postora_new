import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../useAuth";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
            signInWithPassword: vi.fn(),
            signInWithOAuth: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(),
                })),
            })),
        })),
    },
}));

describe("useAuth Hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation for auth state
        const mockSubscription = { subscription: { unsubscribe: vi.fn() } };
        (supabase.auth.onAuthStateChange as any).mockReturnValue({
            data: mockSubscription,
        });

        // Default mock for getSession
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: null },
            error: null,
        });
    });

    it("should initialize with loading state", async () => {
        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
        // Initially matches whatever state, but we check if it resolves loading
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("should handle sign in", async () => {
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
            data: { user: { id: "123" }, session: {} },
            error: null,
        });

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.signIn("test@example.com", "password");
        });

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "test@example.com",
            password: "password",
        });
    });

    it("should handle sign out", async () => {
        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.signOut();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
    });
});
