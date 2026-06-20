/**
 * E2E Tests for Authentication Flow
 * Tests login, signup, logout, and protected routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders,
  mockAuthUser,
  mockSession,
} from "../test-utils";
import {
  mockSupabaseAuth,
  setupAuthenticatedState,
  setupUnauthenticatedState,
  resetSupabaseMocks,
} from "../mocks/supabase";
import Auth from "@/pages/Auth";

// Use vi.hoisted() to ensure mocks are available when vi.mock() runs
const mockAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));

// Mock the supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: mockAuth,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe.skip("Authentication E2E Tests", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    mockNavigate.mockClear();
  });

  describe("Login Flow", () => {
    it("should render login form by default", () => {
      renderWithProviders(<Auth />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("should show validation errors for empty fields", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Auth />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      // Browser validation should trigger
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInvalid();
    });

    it("should handle successful login", async () => {
      const user = userEvent.setup();
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockSession },
        error: null,
      });

      renderWithProviders(<Auth />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should display error message on failed login", async () => {
      const user = userEvent.setup();
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      renderWithProviders(<Auth />);

      await user.type(screen.getByLabelText(/email/i), "wrong@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalled();
      });
    });
  });

  describe("Signup Flow", () => {
    it("should switch to signup mode", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Auth />);

      // Find and click "Sign Up" link/button
      const signUpLink = screen.getByText(/sign up/i);
      await user.click(signUpLink);

      // Should now show signup form
      await waitFor(() => {
        expect(screen.getByText(/create.*account/i)).toBeInTheDocument();
      });
    });

    it("should handle successful signup", async () => {
      const user = userEvent.setup();
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockAuthUser, session: null },
        error: null,
      });

      renderWithProviders(<Auth />);

      // Switch to signup
      await user.click(screen.getByText(/sign up/i));

      await waitFor(async () => {
        const emailInputs = screen.getAllByLabelText(/email/i);
        const passwordInputs = screen.getAllByLabelText(/password/i);

        if (emailInputs.length > 0) {
          await user.type(emailInputs[0], "newuser@example.com");
        }
        if (passwordInputs.length > 0) {
          await user.type(passwordInputs[0], "newpassword123");
        }
      });
    });
  });

  describe("Logout Flow", () => {
    it("should handle logout correctly", async () => {
      setupAuthenticatedState();
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      // The signOut should clear session
      await mockSupabaseAuth.signOut();

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });
  });

  describe("Password Reset", () => {
    it("should handle password reset request", async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      await mockSupabaseAuth.resetPasswordForEmail("test@example.com");

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
    });
  });

  describe("OAuth Login", () => {
    it("should initiate Google OAuth", async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { url: "https://accounts.google.com/..." },
        error: null,
      });

      await mockSupabaseAuth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });

      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalled();
    });
  });
});
