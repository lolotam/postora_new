import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log(`Global setup - baseURL: ${baseURL}`);
  
  // Optionally set up authenticated state that can be reused
  // This is useful for saving login state across tests
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Verify the app is running
    await page.goto(baseURL || "http://localhost:8080", { timeout: 30000 });
    console.log("✓ App is accessible");
  } catch (error) {
    console.error("✗ Failed to access app:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
