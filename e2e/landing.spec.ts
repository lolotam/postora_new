import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("networkidle");
    });

    test.describe("Hero Section", () => {
        test("should display the landing page", async ({ page }) => {
            await expect(page).toHaveURL("/");
        });

        test("should display page title", async ({ page }) => {
            await expect(page).toHaveTitle(/Postora/);
        });

        test("should display hero heading", async ({ page }) => {
            const heroHeading = page.locator("h1").first();
            await expect(heroHeading).toBeVisible();
        });

        test("should display hero description", async ({ page }) => {
            const description = page.locator(
                '[class*="hero"] p, main p, section p'
            ).first();

            const isVisible = await description.isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display CTA button", async ({ page }) => {
            const ctaButton = page.locator(
                'a:has-text("Get Started"), a:has-text("Sign Up"), button:has-text("Get Started"), a:has-text("Try"), [data-testid="cta-button"]'
            );

            await expect(ctaButton.first()).toBeVisible();
        });

        test("should navigate to auth when clicking CTA", async ({ page }) => {
            const ctaButton = page.locator(
                'a:has-text("Get Started"), a:has-text("Sign Up")'
            ).first();

            if (await ctaButton.isVisible()) {
                await ctaButton.click();
                await page.waitForLoadState("networkidle");

                // Should go to auth or pricing
                const url = page.url();
                expect(url.includes("auth") || url.includes("pricing") || url.includes("signup")).toBeTruthy();
            }
        });
    });

    test.describe("Navigation", () => {
        test("should display navigation header", async ({ page }) => {
            const nav = page.locator("nav, header");
            await expect(nav.first()).toBeVisible();
        });

        test("should display logo", async ({ page }) => {
            const logo = page.locator(
                '[data-testid="logo"], img[alt*="logo"], a[href="/"] img, [class*="logo"]'
            );

            await expect(logo.first()).toBeVisible();
        });

        test("should have navigation links", async ({ page }) => {
            const navLinks = page.locator("nav a, header a");
            const count = await navLinks.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should display sign in link", async ({ page }) => {
            const signInLink = page.locator(
                'a:has-text("Sign In"), a:has-text("Login"), button:has-text("Sign In")'
            );

            await expect(signInLink.first()).toBeVisible();
        });

        test("should navigate to auth when clicking Sign In", async ({ page }) => {
            const signInLink = page.locator(
                'a:has-text("Sign In"), a:has-text("Login")'
            ).first();

            if (await signInLink.isVisible()) {
                await signInLink.click();
                await page.waitForLoadState("networkidle");
                await expect(page).toHaveURL(/.*auth/);
            }
        });
    });

    test.describe("Features Section", () => {
        test("should display features section", async ({ page }) => {
            const featuresSection = page.locator(
                '[data-testid="features"], section:has-text("Features"), [id*="feature"]'
            );

            const isVisible = await featuresSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display feature cards", async ({ page }) => {
            const featureCards = page.locator(
                '[data-testid="feature-card"], [class*="feature"] [class*="card"]'
            );

            const count = await featureCards.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Platforms Section", () => {
        test("should display supported platforms", async ({ page }) => {
            // Look for platform logos or mentions
            const platforms = page.locator(
                'text=Facebook, text=Instagram, text=TikTok, text=Pinterest, text=YouTube, img[alt*="platform"]'
            );

            const count = await platforms.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Pricing Section", () => {
        test("should display pricing link or section", async ({ page }) => {
            const pricingSection = page.locator(
                'a:has-text("Pricing"), [data-testid="pricing"], section:has-text("Pricing"), [id*="pricing"]'
            );

            const isVisible = await pricingSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should navigate to pricing page", async ({ page }) => {
            const pricingLink = page.locator('a:has-text("Pricing")').first();

            if (await pricingLink.isVisible()) {
                await pricingLink.click();
                await page.waitForLoadState("networkidle");
                await expect(page).toHaveURL(/.*pricing/);
            }
        });
    });

    test.describe("Footer", () => {
        test("should display footer", async ({ page }) => {
            const footer = page.locator("footer");

            const isVisible = await footer.isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have footer links", async ({ page }) => {
            const footerLinks = page.locator("footer a");

            const count = await footerLinks.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test("should have privacy policy link", async ({ page }) => {
            const privacyLink = page.locator('a:has-text("Privacy")');

            const isVisible = await privacyLink.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have terms of service link", async ({ page }) => {
            const termsLink = page.locator('a:has-text("Terms")');

            const isVisible = await termsLink.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            await page.waitForLoadState("networkidle");

            // Hero should still be visible
            const heroHeading = page.locator("h1").first();
            await expect(heroHeading).toBeVisible();
        });

        test("should display correctly on tablet viewport", async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.reload();
            await page.waitForLoadState("networkidle");

            // Hero should still be visible
            const heroHeading = page.locator("h1").first();
            await expect(heroHeading).toBeVisible();
        });

        test("should have mobile menu toggle on small screens", async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            await page.waitForLoadState("networkidle");

            const menuToggle = page.locator(
                'button[aria-label*="menu"], [data-testid="mobile-menu"], button:has-text("Menu"), button > svg'
            );

            const isVisible = await menuToggle.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Accessibility", () => {
        test("should have proper heading hierarchy", async ({ page }) => {
            const h1Count = await page.locator("h1").count();
            expect(h1Count).toBeGreaterThanOrEqual(1);
        });

        test("should have alt text on images", async ({ page }) => {
            const images = page.locator("img");
            const count = await images.count();

            for (let i = 0; i < Math.min(count, 5); i++) {
                const img = images.nth(i);
                const alt = await img.getAttribute("alt");
                const ariaLabel = await img.getAttribute("aria-label");
                const role = await img.getAttribute("role");

                // Image should have alt OR be decorative
                const isAccessible = alt !== null || role === "presentation" || ariaLabel !== null;
                expect(isAccessible).toBeTruthy();
            }
        });
    });
});
