import { createClient } from "@supabase/supabase-js";

// Test data seeding script for E2E tests
// Run with: npx ts-node e2e/seed-test-data.ts

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test user credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "e2e-test@postora.app";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "E2ETestPassword123!";

interface TestUser {
  id: string;
  email: string;
}

interface TestPost {
  id: string;
  user_id: string;
  caption: string;
  platforms: string[];
  status: string;
  source: string;
}

interface TestSocialAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  access_token: string;
}

// Clean up test data
async function cleanupTestData(userId: string): Promise<void> {
  console.log("🧹 Cleaning up existing test data...");

  // Delete platform posts first (foreign key constraint)
  const { data: posts } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", userId);

  if (posts && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    await supabase.from("platform_posts").delete().in("post_id", postIds);
  }

  // Delete posts
  await supabase.from("posts").delete().eq("user_id", userId);

  // Delete social accounts
  await supabase.from("social_accounts").delete().eq("user_id", userId);

  // Delete social profiles
  await supabase.from("social_profiles").delete().eq("user_id", userId);

  // Delete media files
  await supabase.from("media_files").delete().eq("user_id", userId);

  console.log("✓ Cleanup complete");
}

// Create or get test user
async function getOrCreateTestUser(): Promise<TestUser> {
  console.log("👤 Setting up test user...");

  // Try to get existing user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === TEST_USER_EMAIL);

  if (existingUser) {
    console.log(`✓ Test user exists: ${TEST_USER_EMAIL}`);
    return { id: existingUser.id, email: TEST_USER_EMAIL };
  }

  // Create new test user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  console.log(`✓ Created test user: ${TEST_USER_EMAIL}`);
  return { id: newUser.user.id, email: TEST_USER_EMAIL };
}

// Create test profile
async function createTestProfile(userId: string): Promise<void> {
  console.log("📝 Creating test profile...");

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: TEST_USER_EMAIL,
    full_name: "E2E Test User",
    preferred_timezone: "America/New_York",
    ai_model: "google/gemini-2.5-flash",
  });

  if (error) {
    console.warn(`Profile creation warning: ${error.message}`);
  } else {
    console.log("✓ Test profile created");
  }
}

// Create test social accounts
async function createTestSocialAccounts(userId: string): Promise<TestSocialAccount[]> {
  console.log("🔗 Creating test social accounts...");

  const accounts: Omit<TestSocialAccount, "id">[] = [
    {
      user_id: userId,
      platform: "instagram",
      platform_user_id: "test_instagram_123",
      platform_username: "test_instagram",
      access_token: "test_token_instagram",
    },
    {
      user_id: userId,
      platform: "tiktok",
      platform_user_id: "test_tiktok_456",
      platform_username: "test_tiktok",
      access_token: "test_token_tiktok",
    },
    {
      user_id: userId,
      platform: "twitter",
      platform_user_id: "test_twitter_789",
      platform_username: "test_twitter",
      access_token: "test_token_twitter",
    },
    {
      user_id: userId,
      platform: "facebook",
      platform_user_id: "test_facebook_101",
      platform_username: "test_facebook",
      access_token: "test_token_facebook",
    },
  ];

  const { data, error } = await supabase
    .from("social_accounts")
    .insert(accounts)
    .select();

  if (error) {
    throw new Error(`Failed to create social accounts: ${error.message}`);
  }

  console.log(`✓ Created ${data.length} social accounts`);
  return data as TestSocialAccount[];
}

// Create test posts with various statuses
async function createTestPosts(
  userId: string,
  socialAccounts: TestSocialAccount[]
): Promise<TestPost[]> {
  console.log("📮 Creating test posts...");

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const posts: Omit<TestPost, "id">[] = [
    // Completed posts
    {
      user_id: userId,
      caption: "Successful test post #1 🎉 #testing #e2e",
      platforms: ["instagram", "twitter"],
      status: "completed",
      source: "manual",
    },
    {
      user_id: userId,
      caption: "Another successful post via API integration",
      platforms: ["facebook", "instagram"],
      status: "completed",
      source: "api",
    },
    {
      user_id: userId,
      caption: "Third completed post with hashtags #success #automation",
      platforms: ["tiktok"],
      status: "completed",
      source: "manual",
    },

    // Failed posts
    {
      user_id: userId,
      caption: "This post failed to publish due to API error",
      platforms: ["instagram", "tiktok"],
      status: "failed",
      source: "manual",
    },
    {
      user_id: userId,
      caption: "Failed API post - video dimensions issue",
      platforms: ["tiktok"],
      status: "failed",
      source: "api",
    },

    // Pending posts
    {
      user_id: userId,
      caption: "Post pending approval 📋",
      platforms: ["instagram", "facebook"],
      status: "pending",
      source: "manual",
    },
    {
      user_id: userId,
      caption: "Scheduled post waiting to be processed",
      platforms: ["twitter", "instagram"],
      status: "pending",
      source: "api",
    },

    // More posts for pagination testing
    ...Array.from({ length: 15 }, (_, i) => ({
      user_id: userId,
      caption: `Pagination test post #${i + 1} - Testing bulk data handling`,
      platforms: ["instagram"] as string[],
      status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "failed" : "pending",
      source: i % 2 === 0 ? "manual" : "api",
    })),
  ];

  const { data: createdPosts, error } = await supabase
    .from("posts")
    .insert(
      posts.map((p, i) => ({
        ...p,
        created_at: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
        posted_at: p.status === "completed" ? oneHourAgo.toISOString() : null,
      }))
    )
    .select();

  if (error) {
    throw new Error(`Failed to create posts: ${error.message}`);
  }

  console.log(`✓ Created ${createdPosts.length} test posts`);
  return createdPosts as TestPost[];
}

// Create platform posts (results for each post)
async function createPlatformPosts(
  posts: TestPost[],
  socialAccounts: TestSocialAccount[]
): Promise<void> {
  console.log("📊 Creating platform post results...");

  const platformPosts: Array<{
    post_id: string;
    platform: string;
    social_account_id: string;
    status: string;
    platform_post_id: string | null;
    platform_post_url: string | null;
    error_message: string | null;
    posted_at: string | null;
  }> = [];

  for (const post of posts) {
    for (const platform of post.platforms) {
      const account = socialAccounts.find((a) => a.platform === platform);

      if (account) {
        const isSuccess = post.status === "completed";
        const isPending = post.status === "pending";
        const isFailed = post.status === "failed";

        platformPosts.push({
          post_id: post.id,
          platform,
          social_account_id: account.id,
          status: isSuccess ? "success" : isPending ? "pending" : "failed",
          platform_post_id: isSuccess ? `${platform}_post_${Math.random().toString(36).slice(2)}` : null,
          platform_post_url: isSuccess ? `https://${platform}.com/p/test123` : null,
          error_message: isFailed
            ? platform === "tiktok"
              ? "picture_size_check_failed: Video dimensions must be 720x1280 or higher"
              : "API rate limit exceeded. Please try again later."
            : null,
          posted_at: isSuccess ? new Date().toISOString() : null,
        });
      }
    }
  }

  const { error } = await supabase.from("platform_posts").insert(platformPosts);

  if (error) {
    throw new Error(`Failed to create platform posts: ${error.message}`);
  }

  console.log(`✓ Created ${platformPosts.length} platform post results`);
}

// Create test quotas
async function createTestQuotas(userId: string): Promise<void> {
  console.log("📈 Creating test quotas...");

  const { error } = await supabase.from("user_quotas").upsert({
    user_id: userId,
    max_posts_per_month: 100,
    max_profiles: 5,
    posts_this_month: 22,
  });

  if (error) {
    console.warn(`Quota creation warning: ${error.message}`);
  } else {
    console.log("✓ Test quotas created");
  }
}

// Main seeding function
async function seedTestData(): Promise<void> {
  console.log("\n🌱 Starting E2E test data seeding...\n");

  try {
    // Step 1: Get or create test user
    const testUser = await getOrCreateTestUser();

    // Step 2: Clean up existing test data
    await cleanupTestData(testUser.id);

    // Step 3: Create test profile
    await createTestProfile(testUser.id);

    // Step 4: Create test quotas
    await createTestQuotas(testUser.id);

    // Step 5: Create social accounts
    const socialAccounts = await createTestSocialAccounts(testUser.id);

    // Step 6: Create test posts
    const posts = await createTestPosts(testUser.id, socialAccounts);

    // Step 7: Create platform posts
    await createPlatformPosts(posts, socialAccounts);

    console.log("\n✅ E2E test data seeding complete!\n");
    console.log("Test User Credentials:");
    console.log(`  Email: ${TEST_USER_EMAIL}`);
    console.log(`  Password: ${TEST_USER_PASSWORD}`);
    console.log(`\nCreated:`);
    console.log(`  - 1 test user with profile`);
    console.log(`  - ${socialAccounts.length} social accounts`);
    console.log(`  - ${posts.length} posts with platform results`);
    console.log(`  - User quotas`);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding
seedTestData();
