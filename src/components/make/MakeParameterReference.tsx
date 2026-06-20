import { ParamTable } from "@/components/docs/ParamTable";

const createPostParams = [
  { name: "platform", type: "string", required: true, desc: "Target platform (facebook, instagram, tiktok, youtube, linkedin, twitter, pinterest, threads, bluesky, reddit)" },
  { name: "caption", type: "string", required: false, desc: "Post caption/text. Not used for Stories." },
  { name: "media_urls", type: "string[]", required: false, desc: "Array of publicly accessible media URLs." },
  { name: "media_base64", type: "string[]", required: false, desc: "Array of base64-encoded media (alternative to URLs)." },
  { name: "account_ids", type: "string", required: false, desc: "Comma-separated social account UUIDs." },
  { name: "first_comment", type: "string", required: false, desc: "Auto-post a first comment (Feed & Reels only)." },
  { name: "scheduled_at", type: "datetime", required: false, desc: "ISO 8601 datetime for scheduling." },
  { name: "timezone", type: "string", required: false, desc: "IANA timezone (e.g. America/New_York)." },
  { name: "instagram_post_type", type: "string", required: false, desc: "feed | story | reel" },
  { name: "facebook_post_type", type: "string", required: false, desc: "feed | story | reel" },
  { name: "youtube_title", type: "string", required: false, desc: "Video title for YouTube." },
  { name: "youtube_privacy", type: "string", required: false, desc: "public | unlisted | private" },
  { name: "youtube_category", type: "string", required: false, desc: "YouTube category ID." },
  { name: "youtube_tags", type: "string", required: false, desc: "Comma-separated video tags." },
  { name: "youtube_as_short", type: "boolean", required: false, desc: "Upload as YouTube Short." },
  { name: "tiktok_title", type: "string", required: false, desc: "Primary text for TikTok." },
  { name: "tiktok_privacy", type: "string", required: false, desc: "PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY" },
  { name: "tiktok_allow_comments", type: "boolean", required: false, desc: "Allow comments on TikTok." },
  { name: "tiktok_allow_duet", type: "boolean", required: false, desc: "Allow duet on TikTok." },
  { name: "tiktok_allow_stitch", type: "boolean", required: false, desc: "Allow stitch on TikTok." },
  { name: "pinterest_board_id", type: "string", required: false, desc: "Pinterest board ID." },
  { name: "pinterest_title", type: "string", required: false, desc: "Pin title for Pinterest." },
  { name: "reddit_subreddit", type: "string", required: false, desc: "Subreddit name (without r/ prefix)." },
  { name: "reddit_title", type: "string", required: false, desc: "Post title for Reddit." },
];

const listPostsParams = [
  { name: "limit", type: "number", required: false, desc: "Number of posts to return (1–100, default: 20)." },
  { name: "status", type: "string", required: false, desc: "Filter: pending | processing | completed | failed | scheduled" },
  { name: "platform", type: "string", required: false, desc: "Filter by platform name." },
  { name: "account_id", type: "string", required: false, desc: "Filter by social account UUID." },
  { name: "date_from", type: "date", required: false, desc: "Posts created on or after this date." },
  { name: "date_to", type: "date", required: false, desc: "Posts created on or before this date." },
];

const uploadMediaParams = [
  { name: "media_url", type: "string", required: false, desc: "Public URL of the file to upload." },
  { name: "media_base64", type: "string", required: false, desc: "Base64-encoded file content (alternative to URL)." },
  { name: "filename", type: "string", required: false, desc: "Desired filename with extension." },
  { name: "platforms", type: "string", required: false, desc: "Comma-separated target platforms." },
];

const listAccountsParams = [
  { name: "platform", type: "string", required: false, desc: "Filter accounts by platform." },
];

export function MakeParameterReference() {
  return (
    <section className="container mx-auto px-6 py-16 border-t border-border">
      <h2 className="text-3xl font-bold text-center mb-4">Complete Parameter Reference</h2>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Detailed parameter tables for each Make.com module mapped to the Postora API.
      </p>

      <div className="space-y-10">
        <div>
          <h3 className="text-xl font-semibold mb-3">Create Post</h3>
          <ParamTable params={createPostParams} />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">List Posts</h3>
          <ParamTable params={listPostsParams} />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Upload Media</h3>
          <ParamTable params={uploadMediaParams} />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">List Accounts</h3>
          <ParamTable params={listAccountsParams} />
        </div>
      </div>
    </section>
  );
}
