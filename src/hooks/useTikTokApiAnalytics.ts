import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BrandProfile, BrandPost } from "@/types/brand-intelligence";

interface TikTokAnalyticsResponse {
  success: boolean;
  profile?: BrandProfile;
  posts?: BrandPost[];
  totalPosts?: number;
  hasMore?: boolean;
  cursor?: string;
  error?: string;
  error_code?: string;
}

export function useTikTokApiAnalytics(socialAccountId: string | null) {
  const [extraPosts, setExtraPosts] = useState<BrandPost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMoreOverride, setHasMoreOverride] = useState<boolean | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const callFn = useCallback(async (cursorParam?: string): Promise<TikTokAnalyticsResponse> => {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!session) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) throw new Error("Your session has expired. Please log out and log back in.");
      session = refreshed.session;
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ social_account_id: socialAccountId, cursor: cursorParam }),
    });
    const payload = (await res.json().catch(() => ({}))) as TikTokAnalyticsResponse;
    if (!res.ok && !payload.error_code) {
      throw new Error(payload.error || `TikTok analytics failed (${res.status})`);
    }
    return payload;
  }, [socialAccountId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tiktok-api-analytics", socialAccountId],
    queryFn: () => callFn(),
    enabled: !!socialAccountId,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const loadMore = useCallback(async () => {
    if (!data?.hasMore || !data.cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await callFn(cursor || data.cursor);
      if (more.posts) setExtraPosts((prev) => [...prev, ...more.posts!]);
      setCursor(more.cursor);
      setHasMoreOverride(more.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [callFn, cursor, data, loadingMore]);

  const reset = useCallback(() => {
    setExtraPosts([]);
    setCursor(undefined);
    setHasMoreOverride(undefined);
  }, []);

  const errorCode = data && data.success === false ? data.error_code : undefined;
  const errorMsg = data && data.success === false
    ? data.error || "TikTok API error"
    : error
    ? (error as Error).message
    : null;

  return {
    profile: data?.success ? data.profile ?? null : null,
    posts: data?.success ? [...(data.posts || []), ...extraPosts] : [],
    totalPosts: data?.success ? (data.posts?.length || 0) + extraPosts.length : 0,
    hasMore: hasMoreOverride ?? data?.hasMore ?? false,
    isLoading: isLoading || loadingMore,
    error: errorMsg,
    errorCode,
    loadMore,
    reset,
    refetch,
  };
}
