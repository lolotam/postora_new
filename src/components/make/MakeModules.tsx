import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Send, Search, Upload, Users, FileText } from "lucide-react";

const modules = [
  {
    icon: Send,
    name: "Create Post",
    file: "create-post.json",
    description: "Publish a post to any connected social media platform with full platform-specific settings.",
    method: "POST",
    endpoint: "/api/v1/post",
    example: `{
  "platform": "instagram",
  "caption": "Hello from Make.com! 🚀",
  "media_urls": ["https://example.com/photo.jpg"],
  "instagram_post_type": "feed",
  "first_comment": "#automation #makecom",
  "account_ids": "uuid-1,uuid-2"
}`,
  },
  {
    icon: FileText,
    name: "Get Post Status",
    file: "get-post-status.json",
    description: "Check the publishing status and platform results for a specific post.",
    method: "GET",
    endpoint: "/api/v1/post/:id",
    example: `// Response
{
  "id": "post-uuid",
  "status": "completed",
  "platform_posts": [
    {
      "platform": "instagram",
      "status": "success",
      "platform_post_url": "https://instagram.com/p/..."
    }
  ]
}`,
  },
  {
    icon: Search,
    name: "List Posts",
    file: "list-posts.json",
    description: "Retrieve posts with filters for status, platform, account, and date range.",
    method: "GET",
    endpoint: "/api/v1/posts",
    example: `// Query parameters
?status=completed
&platform=instagram
&limit=20
&date_from=2025-01-01
&date_to=2025-12-31`,
  },
  {
    icon: Upload,
    name: "Upload Media",
    file: "upload-media.json",
    description: "Upload images or videos to your media library via URL or base64.",
    method: "POST",
    endpoint: "/api/v1/media/upload",
    example: `{
  "media_url": "https://example.com/photo.jpg",
  "filename": "campaign-photo.jpg",
  "platforms": "instagram,facebook"
}`,
  },
  {
    icon: Users,
    name: "List Accounts",
    file: "list-accounts.json",
    description: "Get all connected social media accounts with optional platform filter.",
    method: "GET",
    endpoint: "/api/v1/accounts",
    example: `// Query parameters
?platform=instagram

// Response
{
  "accounts": [
    {
      "id": "account-uuid",
      "platform": "instagram",
      "platform_username": "@myaccount",
      "is_active": true
    }
  ]
}`,
  },
];

export function MakeModules() {
  return (
    <section className="container mx-auto px-6 py-16 border-t border-border">
      <h2 className="text-3xl font-bold text-center mb-4">Modules Reference</h2>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Each module maps to a Postora API endpoint. Import the JSON config into Make.com's custom app editor.
      </p>
      <div className="space-y-8">
        {modules.map((mod) => (
          <Card key={mod.name} className="p-6 bg-card/50">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#6E00FF]/10 flex items-center justify-center flex-shrink-0">
                <mod.icon className="w-5 h-5 text-[#6E00FF]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold">{mod.name}</h3>
                  <Badge variant="outline" className="text-xs font-mono">
                    {mod.method}
                  </Badge>
                  <code className="text-xs text-muted-foreground">{mod.endpoint}</code>
                </div>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Config file: <code className="text-[#6E00FF]">{mod.file}</code>
                </p>
              </div>
            </div>
            <CodeBlock code={mod.example} language="json" id={`make-${mod.file}`} />
          </Card>
        ))}
      </div>
    </section>
  );
}
