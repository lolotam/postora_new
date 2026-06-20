import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// We use the same env vars as app
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

test.describe("Authentication", () => {
    const testEmail = `e2e-auth-${Date.now()}@example.com`;
    const testPassword = "Password123!";

    test("Sign up flow", async ({ page }) => {
        await page.goto("/auth");

        // Toggle to Sign Up (Link)
        await page.getByRole("link", { name: "Sign up" }).click();

        await page.getByPlaceholder("you@example.com").fill(testEmail);
        await page.getByPlaceholder("••••••••").fill(testPassword);
        await page.getByPlaceholder("John Doe").fill("E2E User");

        await page.getByRole("button", { name: "Create Account" }).click();

        // Expect toast or redirection
        await expect(page.getByText("Account created!")).toBeVisible({ timeout: 10000 });
    });

    test("Sign in with invalid credentials", async ({ page }) => {
        await page.goto("/auth");

        await page.getByPlaceholder("you@example.com").fill("invalid@example.com");
        await page.getByPlaceholder("••••••••").fill("wrongpassword");
        await page.getByRole("button", { name: "Sign In" }).click();

        // Check for specific error toast or message
        // The toast title is "Sign in failed"
        await expect(page.getByText("Sign in failed")).toBeVisible();
    });

    test.afterAll(async () => {
        // Cleanup user if possible (admin only)
        // Or just leave it as it's separate e2e env usually.
    });
});
