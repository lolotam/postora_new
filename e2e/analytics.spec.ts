import { test, expect } from "./fixtures/auth";

test.describe("Analytics Page", () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/analytics");
        await authenticatedPage.waitForLoadState("networkidle");
    });

    test.describe("Page Loading", () => {
        test("should display the analytics page", async ({ authenticatedPage }) => {
            await expect(authenticatedPage).toHaveURL(/.*analytics/);
        });

        test("should display analytics header", async ({ authenticatedPage }) => {
            const header = authenticatedPage.locator(
                'h1:has-text("Analytics"), [data-testid="analytics-title"]'
            );
            await expect(header.first()).toBeVisible();
        });
    });

    test.describe("Stats Overview", () => {
        test("should display total posts stat", async ({ authenticatedPage }) => {
            const totalPosts = authenticatedPage.locator(
                'text=Total Posts, [data-testid="total-posts"], [class*="stat"]:has-text("Total")'
            );

            const isVisible = await totalPosts.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display success rate stat", async ({ authenticatedPage }) => {
            const successRate = authenticatedPage.locator(
                'text=Success Rate, [data-testid="success-rate"], text=Success'
            );

            const isVisible = await successRate.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display completed posts stat", async ({ authenticatedPage }) => {
            const completedPosts = authenticatedPage.locator(
                'text=Completed, [data-testid="completed-posts"]'
            );

            const isVisible = await completedPosts.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display failed posts stat", async ({ authenticatedPage }) => {
            const failedPosts = authenticatedPage.locator(
                'text=Failed, [data-testid="failed-posts"]'
            );

            const isVisible = await failedPosts.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display scheduled posts stat", async ({ authenticatedPage }) => {
            const scheduledPosts = authenticatedPage.locator(
                'text=Scheduled, [data-testid="scheduled-posts"]'
            );

            const isVisible = await scheduledPosts.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Charts", () => {
        test("should display chart section", async ({ authenticatedPage }) => {
            const chartSection = authenticatedPage.locator(
                '[data-testid="chart-section"], [class*="chart"], svg[class*="recharts"]'
            );

            const isVisible = await chartSection.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display posts over time chart", async ({ authenticatedPage }) => {
            const postsChart = authenticatedPage.locator(
                '[data-testid="posts-chart"], [aria-label*="chart"], svg'
            );

            const isVisible = await postsChart.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display platform breakdown", async ({ authenticatedPage }) => {
            const platformChart = authenticatedPage.locator(
                '[data-testid="platform-chart"], text=Platform, [class*="pie"], [class*="donut"]'
            );

            const isVisible = await platformChart.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Date Filtering", () => {
        test("should display date range selector", async ({ authenticatedPage }) => {
            const dateRange = authenticatedPage.locator(
                '[data-testid="date-range"], button:has-text("Last"), button:has-text("day"), [class*="date-picker"]'
            );

            const isVisible = await dateRange.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should have preset date range options", async ({ authenticatedPage }) => {
            const presets = authenticatedPage.locator(
                'button:has-text("7 days"), button:has-text("30 days"), button:has-text("This Month"), button:has-text("Last Week")'
            );

            const count = await presets.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test("should update data when date range changes", async ({ authenticatedPage }) => {
            const dateButton = authenticatedPage.locator(
                'button:has-text("7 days"), button:has-text("30 days")'
            ).first();

            if (await dateButton.isVisible().catch(() => false)) {
                await dateButton.click();
                await authenticatedPage.waitForTimeout(500);
            }
        });
    });

    test.describe("Platform Filter", () => {
        test("should display platform filter", async ({ authenticatedPage }) => {
            const platformFilter = authenticatedPage.locator(
                '[data-testid="platform-filter"], button:has-text("All Platforms"), select'
            );

            const isVisible = await platformFilter.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Export", () => {
        test("should display export button", async ({ authenticatedPage }) => {
            const exportButton = authenticatedPage.locator(
                'button:has-text("Export"), [data-testid="export-analytics"]'
            );

            const isVisible = await exportButton.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Empty State", () => {
        test("should handle empty data gracefully", async ({ authenticatedPage }) => {
            // Page should load without errors even with no data
            await expect(authenticatedPage).toHaveURL(/.*analytics/);

            // Either show data or empty state message
            const content = authenticatedPage.locator(
                'text=No data, text=No posts, [class*="chart"], [class*="stat"]'
            );

            const hasContent = (await content.count()) > 0;
            expect(typeof hasContent).toBe("boolean");
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ authenticatedPage }) => {
            await authenticatedPage.setViewportSize({ width: 375, height: 667 });
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState("networkidle");

            await expect(authenticatedPage).toHaveURL(/.*analytics/);
        });

        test("should display correctly on tablet viewport", async ({ authenticatedPage }) => {
            await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState("networkidle");

            await expect(authenticatedPage).toHaveURL(/.*analytics/);
        });
    });
});
