import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TikTokAnalyticsSource = "apify" | "tiktok_api";

export function useTikTokAnalyticsSource() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-setting", "tiktok_analytics_source"],
    queryFn: async (): Promise<TikTokAnalyticsSource> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "tiktok_analytics_source")
        .maybeSingle();
      if (error || !data) return "apify";
      try {
        const v = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return v === "tiktok_api" ? "tiktok_api" : "apify";
      } catch {
        return "apify";
      }
    },
    staleTime: 60_000,
  });
  return { source: data ?? "apify", isLoading };
}
