import { AlertTriangle, Info, RefreshCw, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ThreadsReason =
  | "no_account"
  | "invalid_token"
  | "expired_token"
  | "wrong_account"
  | "missing_scope"
  | "permission_not_approved"
  | "not_eligible"
  | "not_found"
  | "rate_limited"
  | "transient"
  | "unknown";

export interface ThreadsErrorState {
  reason: ThreadsReason;
  message: string;
  meta?: { code?: number; subcode?: number; type?: string };
  needsConnection?: boolean;
  needsReauth?: boolean;
  branch?: "own_account_posts" | "public_profile_discovery";
}

type Tone = "amber" | "grey" | "red";

interface DisplayInfo {
  tone: Tone;
  title: string;
  body: string;
  action?: { label: string; href: string; icon?: any };
}

export function mapThreadsReason(
  body: { reason?: string; message?: string; meta?: any; needsConnection?: boolean; needsReauth?: boolean; branch?: string },
  feature: "discovery" | "keyword_search" | "insights",
): ThreadsErrorState {
  return {
    reason: (body.reason as ThreadsReason) || "unknown",
    message: body.message || "Unknown error",
    meta: body.meta,
    needsConnection: body.needsConnection,
    needsReauth: body.needsReauth,
    branch: body.branch as ThreadsErrorState["branch"],
  };
}

function info(state: ThreadsErrorState): DisplayInfo {
  const isOwn = state.branch === "own_account_posts";
  switch (state.reason) {
    case "no_account":
      return {
        tone: "amber",
        title: "Connect Your Threads Account",
        body: "To use this feature, connect your Threads account on the Profiles page.",
        action: { label: "Go to Profiles", href: "/profiles", icon: AtSign },
      };
    case "permission_not_approved":
      if (isOwn) {
        return {
          tone: "amber",
          title: "Token can't read your own posts",
          body: state.message || "Your Threads token was rejected when reading your own posts. Try reconnecting Threads on the Profiles page.",
          action: { label: "Reconnect Threads", href: "/profiles", icon: RefreshCw },
        };
      }
      return {
        tone: "amber",
        title: "Meta has not approved this scope yet",
        body: state.message || "This Threads permission is pending Meta approval for the app.",
      };
    case "missing_scope":
      if (isOwn) {
        return {
          tone: "amber",
          title: "Reconnect Threads",
          body: state.message || "Your Threads token can't read your own posts — try reconnecting on the Profiles page.",
          action: { label: "Reconnect Threads", href: "/profiles", icon: RefreshCw },
        };
      }
      return {
        tone: "amber",
        title: "Reconnect Threads to grant this scope",
        body: state.message || "Your token is missing the required Threads scope. Reconnect Threads on the Profiles page so the new scope is included.",
        action: { label: "Reconnect Threads", href: "/profiles", icon: RefreshCw },
      };
    case "invalid_token":
    case "expired_token":
    case "wrong_account":
      return {
        tone: "amber",
        title: "Reconnect this Threads account",
        body: state.message || "This Threads token is no longer valid. Disconnect and reconnect to refresh it.",
        action: { label: "Reconnect Threads", href: "/profiles", icon: RefreshCw },
      };
    case "not_eligible":
      return {
        tone: "grey",
        title: "Profile not eligible",
        body: state.message || "This profile isn't eligible for Profile Discovery (needs ≥100 followers and a public profile).",
      };
    case "not_found":
      return {
        tone: "grey",
        title: "Not found",
        body: state.message || "No matching Threads post or profile. It may have been deleted already.",
      };
    case "wrong_account":
      return {
        tone: "amber",
        title: "Wrong Threads account",
        body: state.message || "This action targets a Threads post owned by a different account. Switch or reconnect the matching account.",
        action: { label: "Open Profiles", href: "/profiles", icon: AtSign },
      };
    case "rate_limited":
      return {
        tone: "grey",
        title: "Rate limited",
        body: state.message || "Meta rate-limited the app. Please try again in a minute.",
      };
    case "transient":
      return {
        tone: "grey",
        title: "Temporary issue",
        body: state.message || "Meta returned a temporary error. Please retry.",
      };
    default:
      return {
        tone: "red",
        title: "Threads error",
        body: state.message || "Unknown error",
      };
  }
}

export function ThreadsErrorCard({ state }: { state: ThreadsErrorState }) {
  const d = info(state);

  const toneClass = d.tone === "amber"
    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : d.tone === "grey"
      ? "border-border bg-muted/40 text-muted-foreground"
      : "border-destructive/30 bg-destructive/10 text-destructive";

  const Icon = d.tone === "red" ? AlertTriangle : Info;

  return (
    <Card className={toneClass}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium">{d.title}</p>
            <p className="text-sm opacity-90">{d.body}</p>
            {state.meta?.code !== undefined && (
              <p className="text-[11px] opacity-70 font-mono">
                Meta error {state.meta.code}{state.meta.subcode ? `/${state.meta.subcode}` : ""}{state.meta.type ? ` · ${state.meta.type}` : ""}
              </p>
            )}
          </div>
        </div>
        {d.action && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = d.action!.href)}
            className="gap-2"
          >
            {d.action.icon && <d.action.icon className="w-3.5 h-3.5" />}
            {d.action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
