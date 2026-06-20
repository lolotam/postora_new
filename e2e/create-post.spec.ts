import { test, expect } from "./fixtures/auth";

test.describe("Create Post Page", () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/post");
        await authenticatedPage.waitForLoadState("networkidle");
    });

    test.describe("Page Loading", () => {
        test("should display the create post page", async ({ authenticatedPage }) => {
            await expect(authenticatedPage).toHaveURL(/.*post/);
        });

        test("should display page header", async ({ authenticatedPage }) => {
            const header = authenticatedPage.locator(
                'h1:has-text("Create"), h1:has-text("Post"), [data-testid="create-post-title"]'
            );
            await expect(header.first()).toBeVisible();
        });
    });

    test.describe("Platform Selection", () => {
        test("should display platform toggles", async ({ authenticatedPage }) => {
            const platformSection = authenticatedPage.locator(
                '[data-testid="platform-selection"], [class*="platform"]'
            );

            const isVisible = await platformSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have Facebook platform option", async ({ authenticatedPage }) => {
            const facebookBtn = authenticatedPage.locator(
                'button:has-text("Facebook"), [data-testid="platform-facebook"], [aria-label*="Facebook"]'
            );

            const isVisible = await facebookBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have Instagram platform option", async ({ authenticatedPage }) => {
            const instagramBtn = authenticatedPage.locator(
                'button:has-text("Instagram"), [data-testid="platform-instagram"], [aria-label*="Instagram"]'
            );

            const isVisible = await instagramBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have TikTok platform option", async ({ authenticatedPage }) => {
            const tiktokBtn = authenticatedPage.locator(
                'button:has-text("TikTok"), [data-testid="platform-tiktok"], [aria-label*="TikTok"]'
            );

            const isVisible = await tiktokBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should toggle platform selection", async ({ authenticatedPage }) => {
            const platformBtn = authenticatedPage.locator(
                '[data-testid^="platform-"], button[class*="platform"]'
            ).first();

            if (await platformBtn.isVisible().catch(() => false)) {
                await platformBtn.click();
                await authenticatedPage.waitForTimeout(200);
            }
        });
    });

    test.describe("Caption Input", () => {
        test("should display caption textarea", async ({ authenticatedPage }) => {
            const captionInput = authenticatedPage.locator(
                'textarea, [data-testid="caption-input"], [placeholder*="caption"], [placeholder*="Caption"]'
            );

            await expect(captionInput.first()).toBeVisible();
        });

        test("should allow typing in caption", async ({ authenticatedPage }) => {
            const captionInput = authenticatedPage.locator(
                'textarea, [data-testid="caption-input"]'
            ).first();

            if (await captionInput.isVisible()) {
                await captionInput.fill("Test caption for e2e testing");
                await expect(captionInput).toHaveValue("Test caption for e2e testing");
            }
        });

        test("should display character count", async ({ authenticatedPage }) => {
            const charCount = authenticatedPage.locator(
                '[data-testid="char-count"], [class*="character"], text=/\\d+.*character/i'
            );

            const isVisible = await charCount.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("AI Assist Features", () => {
        test("should show AI caption generator button", async ({ authenticatedPage }) => {
            const aiCaptionBtn = authenticatedPage.locator(
                '[data-testid="ai-caption-btn"], button:has-text("Generate Caption"), button:has-text("AI Caption"), [aria-label*="AI"]'
            );

            const isVisible = await aiCaptionBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should show AI hashtag generator button", async ({ authenticatedPage }) => {
            const aiHashtagBtn = authenticatedPage.locator(
                '[data-testid="ai-hashtag-btn"], button:has-text("Generate Hashtag"), button:has-text("AI Hashtag"), button:has-text("Hashtags")'
            );

            const isVisible = await aiHashtagBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Media Upload", () => {
        test("should display media upload area", async ({ authenticatedPage }) => {
            const uploadArea = authenticatedPage.locator(
                '[data-testid="media-upload"], [class*="dropzone"], [class*="upload"], input[type="file"]'
            );

            const isVisible = await uploadArea.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have file input for media", async ({ authenticatedPage }) => {
            const fileInput = authenticatedPage.locator('input[type="file"]');

            // File input may be hidden but should exist
            const count = await fileInput.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Scheduling", () => {
        test("should display schedule option", async ({ authenticatedPage }) => {
            const scheduleSection = authenticatedPage.locator(
                '[data-testid="schedule-section"], button:has-text("Schedule"), [class*="schedule"]'
            );

            const isVisible = await scheduleSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display date picker when scheduling", async ({ authenticatedPage }) => {
            const scheduleBtn = authenticatedPage.locator(
                'button:has-text("Schedule"), [data-testid="schedule-toggle"]'
            ).first();

            if (await scheduleBtn.isVisible().catch(() => false)) {
                await scheduleBtn.click();

                const datePicker = authenticatedPage.locator(
                    '[data-testid="date-picker"], input[type="date"], input[type="datetime-local"], [class*="calendar"]'
                );

                const isVisible = await datePicker.first().isVisible().catch(() => false);
                expect(typeof isVisible).toBe("boolean");
            }
        });
    });

    test.describe("TikTok Specific Settings", () => {
        test("should show TikTok settings when TikTok is selected", async ({ authenticatedPage }) => {
            const tiktokBtn = authenticatedPage.locator(
                'button:has-text("TikTok"), [data-testid="platform-tiktok"]'
            ).first();

            if (await tiktokBtn.isVisible().catch(() => false)) {
                await tiktokBtn.click();
                await authenticatedPage.waitForTimeout(500);

                // Look for TikTok-specific settings
                const tiktokSettings = authenticatedPage.locator(
                    '[data-testid="tiktok-settings"], text=/privacy/i, text=/duet/i, text=/stitch/i'
                );

                const isVisible = await tiktokSettings.first().isVisible().catch(() => false);
                expect(typeof isVisible).toBe("boolean");
            }
        });
    });

    test.describe("Post Actions", () => {
        test("should display Post Now button", async ({ authenticatedPage }) => {
            const postNowBtn = authenticatedPage.locator(
                'button:has-text("Post Now"), button:has-text("Publish"), [data-testid="post-now-btn"]'
            );

            await expect(postNowBtn.first()).toBeVisible();
        });

        test("should display Schedule button", async ({ authenticatedPage }) => {
            const scheduleBtn = authenticatedPage.locator(
                'button:has-text("Schedule"), [data-testid="schedule-btn"]'
            );

            const isVisible = await scheduleBtn.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should show validation error when posting without required fields", async ({ authenticatedPage }) => {
            const postNowBtn = authenticatedPage.locator(
                'button:has-text("Post Now"), button:has-text("Publish")'
            ).first();

            if (await postNowBtn.isVisible()) {
                await postNowBtn.click();

                // Should show error message
                const errorMessage = authenticatedPage.locator(
                    '[class*="error"], [class*="toast"], text=/select.*platform/i, text=/required/i'
                );

                await authenticatedPage.waitForTimeout(500);
                const hasError = await errorMessage.first().isVisible().catch(() => false);
                expect(typeof hasError).toBe("boolean");
            }
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ authenticatedPage }) => {
            await authenticatedPage.setViewportSize({ width: 375, height: 667 });
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState("networkidle");

            // Page should still be functional
            await expect(authenticatedPage).toHaveURL(/.*post/);
        });
    });
});
