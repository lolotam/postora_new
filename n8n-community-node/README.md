# n8n-nodes-postora

This is an [n8n](https://n8n.io/) community node for [Postora](https://postora.cloud) — the AI-powered social media management platform.

Publish content to **Instagram, Facebook, TikTok, YouTube, Twitter/X, LinkedIn, Pinterest, Threads, Bluesky, and Reddit** directly from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings → Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-postora`
4. Click **Install**

## Operations

### Post
- **Create** — Publish content to one or more social media platforms
- **Get Status** — Check the publishing status of a post
- **List** — List recent posts with optional status filter

### Media
- **Upload** — Upload an image or video file to use in posts

### Account
- **List** — List all connected social media accounts

## Credentials

You need a Postora API key to use this node:

1. Sign up at [postora.cloud](https://postora.cloud)
2. Go to **Settings → API Keys**
3. Generate a new API key
4. In n8n, create a new **Postora API** credential and paste the key

## Platform-Specific Options

When creating a post, you can set platform-specific options:

| Platform | Options |
|----------|---------|
| YouTube | Title, Privacy (public/unlisted/private), Category ID |
| TikTok | Privacy level, Allow Comments/Duet/Stitch |
| Pinterest | Board ID, Title |
| Reddit | Subreddit, Title |

## Media Source Options

When creating a post, you can attach media using one of three methods:

| Source | Description |
|--------|-------------|
| **None** | Text-only post, no media attached |
| **URL** | Provide one or more comma-separated media URLs (e.g., `https://example.com/photo1.jpg,https://example.com/photo2.jpg`) |
| **Binary Data** | Attach binary file(s) from previous nodes. Specify property names as comma-separated values (e.g., `data,data1,data2`) to upload multiple files at once |

### Binary Data Details

To use binary data:
1. Connect a node that outputs binary data (e.g., HTTP Request, Read Binary File)
2. Select **Binary Data** as the Media Source
3. Enter the binary property name(s) — default is `data`
4. For multiple files, use comma-separated names: `data,data1,data2`

Binary files are automatically converted to base64 and sent via the `media_base64` API parameter.

## Resources

- [Postora Website](https://postora.cloud)
- [API Documentation](https://postora.cloud/docs/api)
- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
