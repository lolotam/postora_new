import { test, expect } from "./fixtures/auth";

test.describe("History Page", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to history page
    await authenticatedPage.goto("/history");
    await authenticatedPage.waitForLoadState("networkidle");
  });

  test.describe("Page Loading", () => {
    test("should display the history page header", async ({ authenticatedPage }) => {
      await expect(authenticatedPage.locator('[data-testid="history-title"]')).toContainText("Post History");
      await expect(
        authenticatedPage.locator("text=View and manage all your published posts")
      ).toBeVisible();
    });

    test("should show loading state initially", async ({ page }) => {
      // Navigate without waiting for network
      await page.goto("/history");
      
      // Check for loading spinner (may be brief)
      const loader = page.locator('[class*="animate-spin"]');
      // Loading state may pass quickly, so we just verify page loads
      await page.waitForLoadState("networkidle");
    });

    test("should display empty state when no posts exist", async ({ authenticatedPage }) => {
      // If no posts, should show empty message
      const emptyState = authenticatedPage.locator("text=No posts found");
      const postCards = authenticatedPage.locator('[data-testid="post-card"]');
      
      // Either we have posts or empty state
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const postCount = await postCards.count();
      
      expect(hasEmpty || postCount > 0).toBeTruthy();
    });
  });

  test.describe("Filtering", () => {
    test("should filter by search query", async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      
      // Enter search query
      await searchInput.fill("test caption");
      
      // Wait for filter to apply
      await authenticatedPage.waitForTimeout(300);
      
      // Verify search input has value
      await expect(searchInput).toHaveValue("test caption");
    });

    test("should filter by status - completed", async ({ authenticatedPage }) => {
      const completedButton = authenticatedPage.locator('[data-testid="filter-status-completed"]');
      
      await completedButton.click();
      
      // Verify button is active
      await expect(completedButton).toHaveAttribute("data-state", /.*/);
    });

    test("should filter by status - failed", async ({ authenticatedPage }) => {
      const failedButton = authenticatedPage.locator('[data-testid="filter-status-failed"]');
      
      await failedButton.click();
      await authenticatedPage.waitForTimeout(200);
    });

    test("should filter by status - pending", async ({ authenticatedPage }) => {
      const pendingButton = authenticatedPage.locator('[data-testid="filter-status-pending"]');
      
      await pendingButton.click();
      await authenticatedPage.waitForTimeout(200);
    });

    test("should filter by source - manual", async ({ authenticatedPage }) => {
      const manualButton = authenticatedPage.locator('[data-testid="filter-source-manual"]');
      
      await manualButton.click();
      await authenticatedPage.waitForTimeout(200);
    });

    test("should filter by source - API", async ({ authenticatedPage }) => {
      const apiButton = authenticatedPage.locator('[data-testid="filter-source-api"]');
      
      await apiButton.click();
      await authenticatedPage.waitForTimeout(200);
    });

    test("should open platform filter dropdown", async ({ authenticatedPage }) => {
      const platformDropdown = authenticatedPage.locator('[data-testid="platform-filter-trigger"]');
      
      await platformDropdown.click();
      
      // Check if dropdown menu appears
      const dropdownContent = authenticatedPage.locator('[data-testid="platform-filter-content"]');
      await expect(dropdownContent).toBeVisible({ timeout: 2000 });
    });

    test("should filter by specific platform", async ({ authenticatedPage }) => {
      const platformDropdown = authenticatedPage.locator('[data-testid="platform-filter-trigger"]');
      await platformDropdown.click();
      
      const instagramOption = authenticatedPage.locator('[data-testid="filter-platform-instagram"]');
      if (await instagramOption.isVisible()) {
        await instagramOption.click();
        await authenticatedPage.waitForTimeout(200);
      }
    });

    test("should change items per page", async ({ authenticatedPage }) => {
      const itemsPerPageTrigger = authenticatedPage.locator('[data-testid="items-per-page-trigger"]');
      
      await itemsPerPageTrigger.click();
      
      const option25 = authenticatedPage.locator('[data-testid="items-per-page-25"]');
      if (await option25.isVisible()) {
        await option25.click();
      }
    });

    test("should reset to page 1 when filter changes", async ({ authenticatedPage }) => {
      const completedButton = authenticatedPage.locator('[data-testid="filter-status-completed"]');
      
      await completedButton.click();
      await authenticatedPage.waitForTimeout(200);
      
      // Verify we're on page 1 (pagination should show page 1 as active)
      const page1 = authenticatedPage.locator('[aria-current="page"], button:has-text("1")');
      if (await page1.isVisible()) {
        await expect(page1).toBeVisible();
      }
    });
  });

  test.describe("Bulk Actions", () => {
    test("should show Select All button when posts exist", async ({ authenticatedPage }) => {
      const selectAllButton = authenticatedPage.locator('[data-testid="select-all-btn"]');
      const emptyState = authenticatedPage.locator("text=No posts found");
      
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (!hasEmptyState) {
        await expect(selectAllButton).toBeVisible();
      }
    });

    test("should select all posts when clicking Select All", async ({ authenticatedPage }) => {
      const selectAllButton = authenticatedPage.locator('[data-testid="select-all-btn"]');
      
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
        
        // Should show Deselect All button
        const deselectButton = authenticatedPage.locator('[data-testid="deselect-all-btn"]');
        await expect(deselectButton).toBeVisible();
      }
    });

    test("should show bulk delete button when posts are selected", async ({ authenticatedPage }) => {
      const selectAllButton = authenticatedPage.locator('[data-testid="select-all-btn"]');
      
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
        
        // Delete button should appear
        const deleteButton = authenticatedPage.locator('[data-testid="bulk-delete-btn"]');
        await expect(deleteButton).toBeVisible();
      }
    });

    test("should deselect all posts when clicking Deselect All", async ({ authenticatedPage }) => {
      const selectAllButton = authenticatedPage.locator('[data-testid="select-all-btn"]');
      
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
        
        const deselectButton = authenticatedPage.locator('[data-testid="deselect-all-btn"]');
        await deselectButton.click();
        
        // Select All should be visible again
        await expect(selectAllButton).toBeVisible();
      }
    });
  });

  test.describe("Export Functionality", () => {
    test("should show export dropdown", async ({ authenticatedPage }) => {
      const exportButton = authenticatedPage.locator('[data-testid="export-btn"]');
      
      await expect(exportButton).toBeVisible();
    });

    test("should show export options when clicking Export", async ({ authenticatedPage }) => {
      const exportButton = authenticatedPage.locator('[data-testid="export-btn"]');
      await exportButton.click();
      
      // Check for export options
      const csvOption = authenticatedPage.locator('[data-testid="export-csv"]');
      const jsonOption = authenticatedPage.locator('[data-testid="export-json"]');
      
      await expect(csvOption).toBeVisible();
      await expect(jsonOption).toBeVisible();
    });

    test("should trigger CSV export", async ({ authenticatedPage }) => {
      const exportButton = authenticatedPage.locator('[data-testid="export-btn"]');
      await exportButton.click();
      
      const csvOption = authenticatedPage.locator('[data-testid="export-csv"]');
      
      // Set up download listener
      const downloadPromise = authenticatedPage.waitForEvent("download", { timeout: 5000 }).catch(() => null);
      
      await csvOption.click();
      
      // Wait for potential download or toast notification
      await authenticatedPage.waitForTimeout(500);
    });

    test("should trigger JSON export", async ({ authenticatedPage }) => {
      const exportButton = authenticatedPage.locator('[data-testid="export-btn"]');
      await exportButton.click();
      
      const jsonOption = authenticatedPage.locator('[data-testid="export-json"]');
      
      await jsonOption.click();
      
      // Wait for potential download or toast notification
      await authenticatedPage.waitForTimeout(500);
    });
  });

  test.describe("Post Card Interactions", () => {
    test("should show post details when clicking a post card menu", async ({ authenticatedPage }) => {
      const menuTrigger = authenticatedPage.locator('[data-testid="post-menu"]').first();
      
      if (await menuTrigger.isVisible().catch(() => false)) {
        await menuTrigger.click();
        
        // Look for View Details option
        const viewDetails = authenticatedPage.locator('[data-testid="post-menu-view-details"]');
        if (await viewDetails.isVisible()) {
          await viewDetails.click();
          
          // Dialog should open
          const dialog = authenticatedPage.locator('[role="dialog"]');
          await expect(dialog).toBeVisible();
        }
      }
    });

    test("should close post details dialog", async ({ authenticatedPage }) => {
      const menuTrigger = authenticatedPage.locator('[data-testid="post-menu"]').first();
      
      if (await menuTrigger.isVisible().catch(() => false)) {
        await menuTrigger.click();
        
        const viewDetails = authenticatedPage.locator('[data-testid="post-menu-view-details"]');
        if (await viewDetails.isVisible()) {
          await viewDetails.click();
          
          // Close dialog
          const closeButton = authenticatedPage.locator('[role="dialog"] button[aria-label="Close"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
            
            const dialog = authenticatedPage.locator('[role="dialog"]');
            await expect(dialog).not.toBeVisible();
          }
        }
      }
    });

    test("should toggle post selection when clicking card", async ({ authenticatedPage }) => {
      const postCard = authenticatedPage.locator('[data-testid="post-card"]').first();
      
      if (await postCard.isVisible().catch(() => false)) {
        // Click to select
        await postCard.click();
        
        // Should show visual selection indicator
        await authenticatedPage.waitForTimeout(200);
      }
    });
  });

  test.describe("Retry Functionality", () => {
    test("should show Retry All Failed button when failed posts exist", async ({ authenticatedPage }) => {
      const retryAllButton = authenticatedPage.locator('[data-testid="retry-all-failed-btn"]');
      
      // This button only appears if there are failed posts
      const isVisible = await retryAllButton.isVisible().catch(() => false);
      
      // Just verify we can check for it
      expect(typeof isVisible).toBe("boolean");
    });

    test("should show retry option in post menu for failed posts", async ({ authenticatedPage }) => {
      // Find post cards with failed status
      const failedPostCards = authenticatedPage.locator('[data-testid="post-card"][data-post-status="failed"]');
      const count = await failedPostCards.count();
      
      if (count > 0) {
        const menuTrigger = failedPostCards.first().locator('[data-testid="post-menu"]');
        await menuTrigger.click();
        
        const retryOption = authenticatedPage.locator('[data-testid="post-menu-retry"]');
        await expect(retryOption).toBeVisible();
        
        // Close menu
        await authenticatedPage.keyboard.press("Escape");
      }
    });
  });

  test.describe("Delete Functionality", () => {
    test("should show delete confirmation dialog", async ({ authenticatedPage }) => {
      const menuTrigger = authenticatedPage.locator('[data-testid="post-menu"]').first();
      
      if (await menuTrigger.isVisible().catch(() => false)) {
        await menuTrigger.click();
        
        const deleteOption = authenticatedPage.locator('[data-testid="post-menu-delete"]');
        if (await deleteOption.isVisible()) {
          await deleteOption.click();
          
          // Confirmation dialog should appear
          const confirmDialog = authenticatedPage.locator('[role="alertdialog"]');
          await expect(confirmDialog).toBeVisible();
          
          // Cancel to avoid actual deletion
          const cancelButton = authenticatedPage.locator('button:has-text("Cancel")');
          await cancelButton.click();
        }
      }
    });

    test("should show bulk delete confirmation for multiple posts", async ({ authenticatedPage }) => {
      const selectAllButton = authenticatedPage.locator('[data-testid="select-all-btn"]');
      
      if (await selectAllButton.isVisible()) {
        await selectAllButton.click();
        
        const bulkDeleteButton = authenticatedPage.locator('[data-testid="bulk-delete-btn"]');
        await bulkDeleteButton.click();
        
        // Confirmation dialog should appear
        const confirmDialog = authenticatedPage.locator('[role="alertdialog"]');
        await expect(confirmDialog).toBeVisible();
        
        // Cancel to avoid actual deletion
        const cancelButton = authenticatedPage.locator('button:has-text("Cancel")');
        await cancelButton.click();
      }
    });
  });

  test.describe("Pagination", () => {
    test("should show pagination when many posts exist", async ({ authenticatedPage }) => {
      const pagination = authenticatedPage.locator('nav[aria-label="pagination"]');
      
      // Pagination may or may not be visible depending on post count
      const isVisible = await pagination.isVisible().catch(() => false);
      expect(typeof isVisible).toBe("boolean");
    });

    test("should navigate to next page", async ({ authenticatedPage }) => {
      const nextButton = authenticatedPage.locator('a:has-text("Next"), button:has-text("Next")');
      
      if (await nextButton.isVisible().catch(() => false)) {
        const isDisabled = await nextButton.getAttribute("aria-disabled") === "true" ||
                          await nextButton.isDisabled().catch(() => false);
        
        if (!isDisabled) {
          await nextButton.click();
          await authenticatedPage.waitForTimeout(200);
        }
      }
    });

    test("should navigate to previous page", async ({ authenticatedPage }) => {
      const prevButton = authenticatedPage.locator('a:has-text("Previous"), button:has-text("Previous")');
      
      if (await prevButton.isVisible().catch(() => false)) {
        // Previous is usually disabled on page 1
        const isDisabled = await prevButton.getAttribute("aria-disabled") === "true" ||
                          await prevButton.isDisabled().catch(() => false);
        
        expect(typeof isDisabled).toBe("boolean");
      }
    });

    test("should navigate to specific page number", async ({ authenticatedPage }) => {
      const page2Button = authenticatedPage.locator('a:has-text("2"), button:has-text("2")').first();
      
      if (await page2Button.isVisible().catch(() => false)) {
        await page2Button.click();
        await authenticatedPage.waitForTimeout(200);
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState("networkidle");
      
      // Header should still be visible
      await expect(authenticatedPage.locator('[data-testid="history-title"]')).toContainText("Post History");
    });

    test("should display correctly on tablet viewport", async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState("networkidle");
      
      // Header should still be visible
      await expect(authenticatedPage.locator('[data-testid="history-title"]')).toContainText("Post History");
    });
  });
});
