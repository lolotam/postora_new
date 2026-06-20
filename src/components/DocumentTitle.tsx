import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";

const BASE_URL = "https://postora.cloud";

const DEFAULT_DESC =
  "Schedule, create, and publish posts to Instagram, YouTube, TikTok, LinkedIn and more from one dashboard.";

/** Per-route SEO meta. Keep titles ≤60 chars and descriptions 50–160 chars. */
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Postora — Social Media Management",
    description: DEFAULT_DESC,
  },
  "/pricing": {
    title: "Pricing — Postora",
    description: "Simple plans for creators and teams. Start free, upgrade when you need more posts, profiles, or AI credits.",
  },
  "/auth": {
    title: "Sign in — Postora",
    description: "Sign in or create your Postora account to schedule and publish across every social platform.",
  },
  "/reset-password": {
    title: "Reset password — Postora",
    description: "Reset the password for your Postora account.",
  },
  "/privacy": {
    title: "Privacy Policy — Postora",
    description: "How Postora collects, uses, and protects your data across connected social accounts.",
  },
  "/terms": {
    title: "Terms of Service — Postora",
    description: "The terms that govern your use of Postora's social media management platform.",
  },
  "/cookies": {
    title: "Cookie Policy — Postora",
    description: "How Postora uses cookies and similar technologies in your browser.",
  },
  "/contact": {
    title: "Contact — Postora",
    description: "Get in touch with the Postora team for support, sales, or partnerships.",
  },
  "/google-api-disclosure": {
    title: "Google API Disclosure — Postora",
    description: "How Postora uses data received from Google APIs in compliance with Google's Limited Use requirements.",
  },
  "/docs": {
    title: "Documentation — Postora",
    description: "Guides and references for Postora's API, integrations, and platform features.",
  },
  "/docs/api": {
    title: "API Reference — Postora",
    description: "REST API reference for posting, scheduling, media uploads, and account management with Postora.",
  },
  "/docs/n8n-integration": {
    title: "n8n Integration — Postora",
    description: "Automate Postora with n8n: schedule posts, manage media, and monitor results from your workflows.",
  },
  "/docs/make-integration": {
    title: "Make.com Integration — Postora",
    description: "Connect Postora to Make.com to automate cross-platform publishing.",
  },
  "/docs/mcp-server": {
    title: "MCP Server — Postora",
    description: "Use Postora's MCP server to drive social publishing from AI assistants.",
  },
  "/connect/authorize": {
    title: "Authorize app — Postora",
    description: "Review and authorize an app to access your Postora account.",
  },
};

function metaForPath(pathname: string, appName: string) {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;
  // Derive a reasonable per-page title from the last path segment.
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { title: `${appName} — Social Media Management`, description: DEFAULT_DESC };
  }
  const last = segments[segments.length - 1].replace(/[-_]/g, " ");
  const titleCased = last.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${titleCased} — ${appName}`,
    description: DEFAULT_DESC,
  };
}

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function DocumentTitle() {
  const { data: settings } = useAppSettings();
  const location = useLocation();

  useEffect(() => {
    const appName = settings?.appName || "Postora";
    const { title, description } = metaForPath(location.pathname, appName);
    document.title = title;

    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", `${BASE_URL}${location.pathname}`);
  }, [settings?.appName, location.pathname]);

  // Update favicon dynamically
  useEffect(() => {
    const favicon = settings?.appFavicon;
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    
    if (link) {
      if (favicon) {
        link.href = favicon;
      } else {
        link.href = "/favicon.png?v=" + Date.now();
      }
    }
  }, [settings?.appFavicon]);

  // Dynamic canonical URL per route
  useEffect(() => {
    const canonicalUrl = `${BASE_URL}${location.pathname}`;
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    
    link.setAttribute("href", canonicalUrl);
  }, [location.pathname]);

  return null;
}
