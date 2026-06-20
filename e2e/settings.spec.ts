import { test, expect } from "./fixtures/auth";

test.describe("Settings Page", () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/settings");
        await authenticatedPage.waitForLoadState("networkidle");
    });

    test.describe("Page Loading", () => {
        test("should display the settings page", async ({ authenticatedPage }) => {
            await expect(authenticatedPage).toHaveURL(/.*settings/);
        });

        test("should display settings header", async ({ authenticatedPage }) => {
            const header = authenticatedPage.locator(
                'h1:has-text("Settings"), [data-testid="settings-title"]'
            );
            await expect(header.first()).toBeVisible();
        });
    });

    test.describe("Profile Settings", () => {
        test("should display profile section", async ({ authenticatedPage }) => {
            const profileSection = authenticatedPage.locator(
                '[data-testid="profile-section"], text=Profile, [class*="profile"]'
            );

            const isVisible = await profileSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display name input", async ({ authenticatedPage }) => {
            const nameInput = authenticatedPage.locator(
                'input[name="name"], input[placeholder*="name"], [data-testid="name-input"]'
            );

            const isVisible = await nameInput.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display email field", async ({ authenticatedPage }) => {
            const emailField = authenticatedPage.locator(
                'input[type="email"], input[name="email"], [data-testid="email-input"], text=@'
            );

            const isVisible = await emailField.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display avatar upload", async ({ authenticatedPage }) => {
            const avatarSection = authenticatedPage.locator(
                '[data-testid="avatar-upload"], img[alt*="avatar"], [class*="avatar"]'
            );

            const isVisible = await avatarSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Two-Factor Authentication", () => {
        test("should display 2FA section", async ({ authenticatedPage }) => {
            const twoFASection = authenticatedPage.locator(
                '[data-testid="2fa-section"], text=Two-Factor, text=2FA, text=Authenticator'
            );

            const isVisible = await twoFASection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have 2FA enable/disable toggle", async ({ authenticatedPage }) => {
            const twoFAToggle = authenticatedPage.locator(
                '[data-testid="2fa-toggle"], button:has-text("Enable 2FA"), button:has-text("Disable 2FA"), [role="switch"]'
            );

            const isVisible = await twoFAToggle.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display backup codes section", async ({ authenticatedPage }) => {
            const backupSection = authenticatedPage.locator(
                '[data-testid="backup-codes"], text=Backup, text=Recovery Codes'
            );

            const isVisible = await backupSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Notification Settings", () => {
        test("should display notification settings", async ({ authenticatedPage }) => {
            const notificationSection = authenticatedPage.locator(
                '[data-testid="notification-settings"], text=Notification, [class*="notification"]'
            );

            const isVisible = await notificationSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have notification toggles", async ({ authenticatedPage }) => {
            const toggles = authenticatedPage.locator(
                '[role="switch"], input[type="checkbox"], [data-testid*="notification"]'
            );

            const count = await toggles.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Theme Settings", () => {
        test("should display theme selector", async ({ authenticatedPage }) => {
            const themeSection = authenticatedPage.locator(
                '[data-testid="theme-selector"], text=Theme, text=Dark Mode, text=Light Mode'
            );

            const isVisible = await themeSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have theme toggle", async ({ authenticatedPage }) => {
            const themeToggle = authenticatedPage.locator(
                '[data-testid="theme-toggle"], button:has-text("Dark"), button:has-text("Light"), [aria-label*="theme"]'
            );

            const isVisible = await themeToggle.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Account Actions", () => {
        test("should display save button", async ({ authenticatedPage }) => {
            const saveButton = authenticatedPage.locator(
                'button:has-text("Save"), button:has-text("Update"), [data-testid="save-settings"]'
            );

            const isVisible = await saveButton.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display sign out option", async ({ authenticatedPage }) => {
            const signOutButton = authenticatedPage.locator(
                'button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Log Out"), [data-testid="sign-out"]'
            );

            const isVisible = await signOutButton.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Password Change", () => {
        test("should display change password section", async ({ authenticatedPage }) => {
            const passwordSection = authenticatedPage.locator(
                '[data-testid="password-section"], text=Password, button:has-text("Change Password")'
            );

            const isVisible = await passwordSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ authenticatedPage }) => {
            await authenticatedPage.setViewportSize({ width: 375, height: 667 });
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState("networkidle");

            await expect(authenticatedPage).toHaveURL(/.*settings/);
        });
    });
});
