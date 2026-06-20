import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon, ExtendedPlatform } from "@/components/PlatformIcon";

type Platform = ExtendedPlatform;

interface ResourceLink {
  title: string;
  description: string;
  url: string;
}

interface PlatformResourceCardProps {
  platformName: string;
  platformIcon?: React.ReactNode;
  platform?: Platform;
  description: string;
  resources: ResourceLink[];
}

export function PlatformResourceCard({ 
  platformName, 
  platformIcon, 
  platform,
  description, 
  resources 
}: PlatformResourceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {platformIcon || (platform && <PlatformIcon platform={platform} className="h-5 w-5" />)}
          {platformName} Developer Resources
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <h4 className="font-medium flex items-center gap-2">
                {resource.title}
                <ExternalLink className="h-3 w-3" />
              </h4>
              <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured resource cards for each platform
export const googleResources: ResourceLink[] = [
  { title: "OAuth Verification Overview", description: "Complete guide to the verification process", url: "https://support.google.com/cloud/answer/13463073" },
  { title: "Minimum Scopes Requirements", description: "How to justify your requested scopes", url: "https://support.google.com/cloud/answer/13807380" },
  { title: "YouTube Data API v3", description: "Official API documentation", url: "https://developers.google.com/youtube/v3" },
];

export const tiktokResources: ResourceLink[] = [
  { title: "Content Sharing Guidelines", description: "UX and compliance requirements", url: "https://developers.tiktok.com/doc/content-sharing-guidelines/" },
  { title: "Video Upload API", description: "Direct upload implementation", url: "https://developers.tiktok.com/doc/tiktok-api-v2-post-publish-video-upload/" },
  { title: "Creator Info API", description: "Get creator settings", url: "https://developers.tiktok.com/doc/tiktok-api-v2-get-creator-info/" },
];

export const pinterestResources: ResourceLink[] = [
  { title: "App Setup Guide", description: "Getting started with Pinterest API", url: "https://developers.pinterest.com/docs/getting-started/set-up-app/" },
  { title: "Pins API Reference", description: "Create and manage pins", url: "https://developers.pinterest.com/docs/api/v5/#tag/Pins" },
  { title: "Developer Terms", description: "Terms of service for developers", url: "https://developers.pinterest.com/terms/" },
];

export const linkedinResources: ResourceLink[] = [
  { title: "Authentication Guide", description: "OAuth 2.0 implementation", url: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication" },
  { title: "Posts API", description: "Share content on LinkedIn", url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api" },
  { title: "API Terms of Use", description: "Terms and conditions", url: "https://www.linkedin.com/legal/l/api-terms-of-use" },
];

export const facebookResources: ResourceLink[] = [
  { title: "Pages API Getting Started", description: "Set up Pages API integration", url: "https://developers.facebook.com/docs/pages-api/getting-started" },
  { title: "Reels Publishing Guide", description: "Publish Reels via API", url: "https://developers.facebook.com/docs/video-api/guides/reels-publishing" },
  { title: "App Review Guide", description: "Submit for permission review", url: "https://developers.facebook.com/docs/app-review" },
  { title: "Platform Terms", description: "Meta Platform Terms of Service", url: "https://developers.facebook.com/terms/" },
  { title: "Data Deletion Callback", description: "GDPR compliance setup", url: "https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback" },
  { title: "Permissions Reference", description: "All available permissions", url: "https://developers.facebook.com/docs/permissions/reference" },
];

export const instagramResources: ResourceLink[] = [
  { title: "Getting Started", description: "Instagram Graph API setup", url: "https://developers.facebook.com/docs/instagram-api/getting-started" },
  { title: "Content Publishing", description: "Publish images, videos, carousels", url: "https://developers.facebook.com/docs/instagram-api/guides/content-publishing" },
  { title: "Media Endpoint", description: "Media creation API reference", url: "https://developers.facebook.com/docs/instagram-api/reference/ig-user/media" },
  { title: "Reels Publishing", description: "Publish Reels via API", url: "https://developers.facebook.com/docs/instagram-api/guides/content-publishing#reels" },
  { title: "App Review Submission", description: "Get permissions approved", url: "https://developers.facebook.com/docs/app-review/submission-guide" },
  { title: "API Overview", description: "Complete API documentation", url: "https://developers.facebook.com/docs/instagram-api/overview/" },
];

export const twitterResources: ResourceLink[] = [
  { title: "Getting Started", description: "Twitter API v2 overview", url: "https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api" },
  { title: "OAuth 1.0a Guide", description: "User authentication setup", url: "https://developer.twitter.com/en/docs/authentication/oauth-1-0a" },
  { title: "Post Tweet API", description: "Create and manage tweets", url: "https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets" },
  { title: "Media Upload API", description: "Upload images and videos", url: "https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/overview" },
  { title: "Rate Limits", description: "API usage limits and quotas", url: "https://developer.twitter.com/en/docs/twitter-api/rate-limits" },
  { title: "Developer Agreement", description: "Terms and policies", url: "https://developer.twitter.com/en/developer-terms/agreement-and-policy" },
];

export const redditResources: ResourceLink[] = [
  { title: "API Documentation", description: "Official Reddit API docs", url: "https://www.reddit.com/dev/api" },
  { title: "API Terms", description: "Terms of use for API", url: "https://www.reddit.com/wiki/api-terms" },
];

export const blueskyResources: ResourceLink[] = [
  { title: "API Documentation", description: "Official Bluesky API docs", url: "https://docs.bsky.app/" },
  { title: "AT Protocol Guide", description: "Protocol specification", url: "https://atproto.com/guides/applications" },
  { title: "Community Guidelines", description: "Content policies", url: "https://bsky.social/about/support/community-guidelines" },
];
