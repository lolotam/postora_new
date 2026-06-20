export interface Endpoint {
  method: string;
  path: string;
  description: string;
  body?: string;
  response: string;
  notes?: string;
}

export interface RateLimit {
  endpoint: string;
  limit: string;
  window: string;
}

export interface ErrorCode {
  code: string;
  status: number;
  description: string;
}

export interface WebhookEvent {
  event: string;
  description: string;
}

const BASE_URL = "https://api.postora.cloud/functions/v1/n8n-api";

export const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/post",
    description: "Create and publish a post to one or more social platforms.",
    body: JSON.stringify({
      caption: "Hello from Postora API! 🚀",
      platforms: ["instagram", "facebook"],
      account_ids: ["uuid-1", "uuid-2"],
      media_urls: ["https://example.com/image.jpg"],
      scheduled_at: "2026-04-01T10:00:00Z",
    }, null, 2),
    response: JSON.stringify({
      success: true,
      post: { id: "post-uuid", caption: "Hello from Postora API! 🚀", platforms: ["instagram", "facebook"], status: "pending", created_at: "2026-03-28T12:00:00Z" },
      account_ids_used: ["uuid-1", "uuid-2"],
    }, null, 2),
    notes: "Supports media_urls (URLs), media_base64 (base64 data), or media_file_ids (pre-uploaded IDs). Platform-specific metadata available (youtube_*, tiktok_*, instagram_*, etc.).",
  },
  {
    method: "GET",
    path: "/api/v1/post/:id",
    description: "Get detailed status of a single post with platform-level results.",
    response: JSON.stringify({
      success: true,
      post: {
        id: "post-uuid", caption: "Hello!", platforms: ["instagram", "facebook"], status: "completed", posted_at: "2026-03-28T12:05:00Z", created_at: "2026-03-28T12:00:00Z",
        platform_results: [
          { platform: "instagram", status: "success", post_url: "https://instagram.com/p/...", posted_at: "2026-03-28T12:05:00Z" },
          { platform: "facebook", status: "success", post_url: "https://facebook.com/...", posted_at: "2026-03-28T12:05:01Z" },
        ],
      },
    }, null, 2),
    notes: "Use this to poll post completion status. Ideal for n8n/Zapier wait-for-completion nodes.",
  },
  {
    method: "POST",
    path: "/api/v1/upload-media",
    description: "Upload media files (images/videos) before creating a post.",
    body: JSON.stringify({ media_urls: ["https://example.com/photo.jpg", "https://example.com/video.mp4"] }, null, 2),
    response: JSON.stringify({ success: true, media_file_ids: ["uuid-1", "uuid-2"], total_uploaded: 2, total_failed: 0 }, null, 2),
    notes: "Accepts JSON body with media_urls/media_url, file_data (base64), or multipart form-data with file/files fields.",
  },
  {
    method: "GET",
    path: "/api/v1/accounts",
    description: "List all connected social media accounts.",
    response: JSON.stringify({
      success: true,
      accounts: [
        { id: "uuid-1", platform: "instagram", platform_username: "mypage", is_active: true, profile_name: "Main Profile" },
        { id: "uuid-2", platform: "facebook", platform_username: "My Page", is_active: true, profile_name: "Main Profile" },
      ],
    }, null, 2),
    notes: "Use the 'id' field in account_ids when creating posts. The 'platform_user_id' is also accepted.",
  },
  {
    method: "GET",
    path: "/api/v1/posts",
    description: "List post history with pagination and optional status filter.",
    response: JSON.stringify({
      success: true,
      posts: [{ id: "uuid", caption: "...", platforms: ["instagram"], status: "completed", posted_at: "...", platform_posts: [] }],
      limit: 50, offset: 0,
    }, null, 2),
    notes: "Query params: ?status=completed&limit=50&offset=0",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks",
    description: "Register a webhook URL to receive post status notifications.",
    body: JSON.stringify({ webhook_url: "https://your-server.com/webhook", events: ["post.completed", "post.failed"] }, null, 2),
    response: JSON.stringify({
      success: true,
      webhook: { id: "webhook-uuid", webhook_url: "https://your-server.com/webhook", events: ["post.completed", "post.failed"], status: "active" },
    }, null, 2),
  },
  {
    method: "GET",
    path: "/api/v1/webhooks",
    description: "List all registered webhooks.",
    response: JSON.stringify({ success: true, webhooks: [] }, null, 2),
  },
  {
    method: "DELETE",
    path: "/api/v1/webhooks/:id",
    description: "Delete a registered webhook.",
    response: JSON.stringify({ success: true, message: "Webhook deleted" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/test",
    description: "Send a test payload to a webhook URL.",
    body: JSON.stringify({ webhook_url: "https://your-server.com/webhook" }, null, 2),
    response: JSON.stringify({ success: true, webhook_response: { status: 200 } }, null, 2),
  },
];

export const rateLimits: RateLimit[] = [
  { endpoint: "POST /api/v1/post", limit: "30 requests", window: "per hour" },
  { endpoint: "POST /api/v1/upload-media", limit: "60 requests", window: "per hour" },
  { endpoint: "GET /api/v1/accounts", limit: "100 requests", window: "per hour" },
  { endpoint: "GET /api/v1/posts", limit: "100 requests", window: "per hour" },
  { endpoint: "GET /api/v1/post/:id", limit: "100 requests", window: "per hour" },
  { endpoint: "Webhook operations", limit: "30 requests", window: "per hour" },
];

export const errorCodes: ErrorCode[] = [
  { code: "UNAUTHORIZED", status: 401, description: "Missing or invalid API key" },
  { code: "RATE_LIMIT_EXCEEDED", status: 429, description: "Too many requests in the time window" },
  { code: "NOT_FOUND", status: 404, description: "Resource or endpoint not found" },
  { code: "VALIDATION_ERROR", status: 400, description: "Invalid request body or parameters" },
  { code: "INTERNAL_ERROR", status: 500, description: "Unexpected server error" },
];

export const webhookEvents: WebhookEvent[] = [
  { event: "post.completed", description: "All platforms successfully published" },
  { event: "post.failed", description: "One or more platforms failed to publish" },
  { event: "post.published", description: "Post published to at least one platform" },
  { event: "test", description: "Test webhook payload" },
  { event: "*", description: "Subscribe to all events" },
];

export { BASE_URL };
