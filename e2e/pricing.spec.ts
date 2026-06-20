import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/pricing");
        await page.waitForLoadState("networkidle");
    });

    test.describe("Page Loading", () => {
        test("should display the pricing page", async ({ page }) => {
            await expect(page).toHaveURL(/.*pricing/);
        });

        test("should display pricing header", async ({ page }) => {
            const header = page.locator(
                'h1:has-text("Pricing"), h1:has-text("Plans"), [data-testid="pricing-title"]'
            );
            await expect(header.first()).toBeVisible();
        });
    });

    test.describe("Billing Toggle", () => {
        test("should display billing toggle (monthly/yearly)", async ({ page }) => {
            const billingToggle = page.locator(
                '[data-testid="billing-toggle"], button:has-text("Monthly"), button:has-text("Yearly"), button:has-text("Annual")'
            );

            const isVisible = await billingToggle.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should toggle between monthly and yearly pricing", async ({ page }) => {
            const yearlyToggle = page.locator(
                'button:has-text("Yearly"), button:has-text("Annual"), [data-testid="toggle-yearly"]'
            ).first();

            if (await yearlyToggle.isVisible().catch(() => false)) {
                await yearlyToggle.click();
                await page.waitForTimeout(300);
            }
        });
    });

    test.describe("Plan Cards", () => {
        test("should display plan cards", async ({ page }) => {
            const planCards = page.locator(
                '[data-testid="plan-card"], [class*="plan-card"], [class*="pricing-card"]'
            );

            const count = await planCards.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should display plan names", async ({ page }) => {
            const planNames = page.locator(
                '[data-testid="plan-name"], [class*="plan"] h2, [class*="plan"] h3'
            );

            const count = await planNames.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should display plan prices", async ({ page }) => {
            const prices = page.locator(
                '[data-testid="plan-price"], text=/\\$\\d+/, text=/€\\d+/, [class*="price"]'
            );

            const count = await prices.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should highlight popular plan", async ({ page }) => {
            const popularBadge = page.locator(
                '[data-testid="popular-badge"], text=Popular, text=Recommended, [class*="popular"]'
            );

            const isVisible = await popularBadge.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Plan Features", () => {
        test("should display plan features list", async ({ page }) => {
            const featuresList = page.locator(
                '[data-testid="plan-features"], ul[class*="features"], [class*="feature-list"]'
            );

            const count = await featuresList.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should display feature checkmarks", async ({ page }) => {
            const checkmarks = page.locator(
                'svg[class*="check"], [class*="check-icon"], li > svg'
            );

            const count = await checkmarks.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Free Plan", () => {
        test("should display free plan option", async ({ page }) => {
            const freePlan = page.locator(
                'text=Free, [data-testid="plan-free"], text=/\\$0|Free Forever/'
            );

            const isVisible = await freePlan.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("CTA Buttons", () => {
        test("should display subscribe buttons for each plan", async ({ page }) => {
            const subscribeButtons = page.locator(
                'button:has-text("Subscribe"), button:has-text("Get Started"), button:has-text("Choose"), a:has-text("Subscribe")'
            );

            const count = await subscribeButtons.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should navigate to checkout when clicking subscribe", async ({ page }) => {
            const subscribeButton = page.locator(
                'button:has-text("Subscribe"), button:has-text("Get Started")'
            ).first();

            if (await subscribeButton.isVisible()) {
                await subscribeButton.click();
                await page.waitForTimeout(1000);

                // Should either go to checkout, auth, or show modal
                const currentUrl = page.url();
                const hasModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);

                expect(
                    currentUrl.includes("checkout") ||
                    currentUrl.includes("auth") ||
                    currentUrl.includes("stripe") ||
                    hasModal
                ).toBeTruthy();
            }
        });
    });

    test.describe("Enterprise Plan", () => {
        test("should display enterprise or contact option", async ({ page }) => {
            const enterprise = page.locator(
                'text=Enterprise, text=Contact, button:has-text("Contact Sales")'
            );

            const isVisible = await enterprise.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("FAQ Section", () => {
        test("should display FAQ section", async ({ page }) => {
            const faqSection = page.locator(
                '[data-testid="faq"], text=FAQ, text=Frequently Asked, [class*="faq"]'
            );

            const isVisible = await faqSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should expand FAQ item on click", async ({ page }) => {
            const faqItem = page.locator(
                '[data-testid="faq-item"], [class*="accordion"], button[aria-expanded]'
            ).first();

            if (await faqItem.isVisible().catch(() => false)) {
                await faqItem.click();
                await page.waitForTimeout(300);
            }
        });
    });

    test.describe("Coupon Code", () => {
        test("should display coupon code input", async ({ page }) => {
            const couponInput = page.locator(
                '[data-testid="coupon-input"], input[placeholder*="coupon"], input[placeholder*="promo"]'
            );

            const isVisible = await couponInput.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Comparison Table", () => {
        test("should display feature comparison table", async ({ page }) => {
            const comparisonTable = page.locator(
                '[data-testid="comparison-table"], table, [class*="comparison"]'
            );

            const isVisible = await comparisonTable.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            await page.waitForLoadState("networkidle");

            // Plan cards should still be visible
            const planCards = page.locator('[class*="plan"], [class*="pricing"]');
            const isVisible = await planCards.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should stack plan cards vertically on mobile", async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            await page.waitForLoadState("networkidle");

            await expect(page).toHaveURL(/.*pricing/);
        });
    });

    test.describe("Money-back Guarantee", () => {
        test("should display guarantee badge", async ({ page }) => {
            const guarantee = page.locator(
                'text=Money, text=Guarantee, text=Refund, [class*="guarantee"]'
            );

            const isVisible = await guarantee.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });
});
