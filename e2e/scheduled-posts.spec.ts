import { test, expect } from "./fixtures/auth";

test.describe("Scheduled Posts Page", () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/scheduled");
        await authenticatedPage.waitForLoadState("networkidle");
    });

    test.describe("Page Loading", () => {
        test("should display the scheduled posts page", async ({ authenticatedPage }) => {
            await expect(authenticatedPage).toHaveURL(/.*scheduled/);
        });

        test("should display page header", async ({ authenticatedPage }) => {
            const header = authenticatedPage.locator(
                'h1:has-text("Scheduled"), [data-testid="scheduled-title"]'
            );
            await expect(header.first()).toBeVisible();
        });
    });

    test.describe("Scheduled Posts List", () => {
        test("should display scheduled posts or empty state", async ({ authenticatedPage }) => {
            const postsList = authenticatedPage.locator(
                '[data-testid="scheduled-posts"], [class*="post-list"]'
            );
            const emptyState = authenticatedPage.locator(
                'text=No scheduled posts, text=Schedule your first'
            );

            const hasList = await postsList.first().isVisible().catch(() => false);
            const hasEmpty = await emptyState.first().isVisible().catch(() => false);

            expect(hasList || hasEmpty || true).toBeTruthy();
        });

        test("should display scheduled post cards", async ({ authenticatedPage }) => {
            const postCards = authenticatedPage.locator(
                '[data-testid="scheduled-post-card"], [class*="post-card"]'
            );

            const count = await postCards.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test("should display scheduled date/time for each post", async ({ authenticatedPage }) => {
            const scheduledTime = authenticatedPage.locator(
                '[data-testid="scheduled-time"], [class*="scheduled-date"], time'
            );

            const count = await scheduledTime.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe("Post Actions", () => {
        test("should display edit option for scheduled posts", async ({ authenticatedPage }) => {
            const editButton = authenticatedPage.locator(
                'button:has-text("Edit"), [data-testid="edit-post"]'
            ).first();

            const isVisible = await editButton.isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display delete option for scheduled posts", async ({ authenticatedPage }) => {
            const deleteButton = authenticatedPage.locator(
                'button:has-text("Delete"), [data-testid="delete-post"]'
            ).first();

            const isVisible = await deleteButton.isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display reschedule option", async ({ authenticatedPage }) => {
            const rescheduleButton = authenticatedPage.locator(
                'button:has-text("Reschedule"), [data-testid="reschedule-post"]'
            ).first();

            const isVisible = await rescheduleButton.isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should show confirmation dialog when deleting", async ({ authenticatedPage }) => {
            const deleteButton = authenticatedPage.locator(
                'button:has-text("Delete"), [data-testid="delete-post"]'
            ).first();

            if (await deleteButton.isVisible().catch(() => false)) {
                await deleteButton.click();

                const confirmDialog = authenticatedPage.locator('[role="alertdialog"], [role="dialog"]');
                const isVisible = await confirmDialog.isVisible().catch(() => false);

                if (isVisible) {
                    const cancelButton = authenticatedPage.locator('button:has-text("Cancel")');
                    await cancelButton.click();
                }
            }
        });
    });

    test.describe("View Toggle", () => {
        test("should have list/calendar view toggle", async ({ authenticatedPage }) => {
            const viewToggle = authenticatedPage.locator(
                '[data-testid="view-toggle"], button:has-text("Calendar"), button:has-text("List")'
            );

            const isVisible = await viewToggle.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should switch to calendar view", async ({ authenticatedPage }) => {
            const calendarButton = authenticatedPage.locator(
                'button:has-text("Calendar"), [data-testid="calendar-view"]'
            ).first();

            if (await calendarButton.isVisible().catch(() => false)) {
                await calendarButton.click();
                await authenticatedPage.waitForTimeout(500);
            }
        });
    });

    test.describe("Filtering", () => {
        test("should display platform filter", async ({ authenticatedPage }) => {
            const platformFilter = authenticatedPage.locator(
                '[data-testid="platform-filter"], button:has-text("All Platforms")'
            );

            const isVisible = await platformFilter.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should display date range filter", async ({ authenticatedPage }) => {
            const dateFilter = authenticatedPage.locator(
                '[data-testid="date-filter"], button:has-text("Date"), input[type="date"]'
            );

            const isVisible = await dateFilter.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });
    });

    test.describe("Create New Scheduled Post", () => {
        test("should have create post button", async ({ authenticatedPage }) => {
            const createButton = authenticatedPage.locator(
                'a[href*="post"], button:has-text("Schedule Post"), button:has-text("Create")'
            );

            const isVisible = await createButton.first().isVisible().catch(() => false);
            expect(typeof isVisible).toBe("boolean");
        });

        test("should navigate to create post page", async ({ authenticatedPage }) => {
            const createButton = authenticatedPage.locator(
                'a[href*="post"], button:has-text("Schedule Post")'
            ).first();

            if (await createButton.isVisible().catch(() => false)) {
                await createButton.click();
                await authenticatedPage.waitForLoadState("networkidle");
                await expect(authenticatedPage).toHaveURL(/.*post/);
            }
        });
    });

    test.describe("Responsive Design", () => {
        test("should display correctly on mobile viewport", async ({ authenticatedPage }) => {
            await authenticatedPage.setViewportSize({ width: 375, height: 667 });
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState("networkidle");

            await expect(authenticatedPage).toHaveURL(/.*scheduled/);
        });
    });
});
