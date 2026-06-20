import { test, expect } from "@playwright/test";

test.describe("Social Profiles", () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to profiles page (assumes auth state is handled or we use a fixture later)
        // For now, let's assume we need to sign in first or reuse state.
        // Ideally, we use global setup for auth.
        // Here we'll do a quick sign-in if needed, or assume we can access /profiles directly in dev mode if mock auth?
        // Postora uses Supabase auth, so we really need to log in.

        await page.goto("/auth");
        await page.getByPlaceholder("Email address").fill("e2e-test@postora.app"); // We seeded this user!
        await page.getByPlaceholder("Password").fill("E2ETestPassword123!");
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

        await page.goto("/profiles");
    });

    test("Create new profile", async ({ page }) => {
        await page.getByRole("button", { name: "New Profile" }).click();
        await page.getByPlaceholder("Enter profile name").fill("New Test Profile");
        await page.getByRole("button", { name: "Create Profile" }).click();

        // Setup might be different, adjusting to potential UI
        // If it's a dialog:
        await expect(page.getByText("New Test Profile")).toBeVisible();
    });

    test("Rename profile", async ({ page }) => {
        // Locate the specific profile card
        const profileCard = page.locator(".profile-card").filter({ hasText: "New Test Profile" }).first();
        // Assuming there's an edit button
        await profileCard.getByRole("button", { name: "Settings" }).click();
        await page.getByRole("menuitem", { name: "Rename" }).click();

        await page.getByPlaceholder("Profile name").fill("Renamed Profile");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page.getByText("Renamed Profile")).toBeVisible();
    });

    test("Search profiles", async ({ page }) => {
        await page.getByPlaceholder("Search profiles...").fill("Renamed");
        await expect(page.getByText("Renamed Profile")).toBeVisible();
        await expect(page.getByText("Other Profile")).not.toBeVisible();
    });
});
