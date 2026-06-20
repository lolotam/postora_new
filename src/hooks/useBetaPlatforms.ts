import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Platform } from "@/lib/types";

export type BetaPlatforms = Partial<Record<Platform, boolean>>;

export function useBetaPlatforms() {
  const { data: betaPlatforms = {} } = useQuery<BetaPlatforms>({
    queryKey: ["beta-platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "beta_platforms")
        .maybeSingle();
      if (error) throw error;
      if (!data) return {};
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return parsed as BetaPlatforms;
      } catch {
        return {};
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  return { betaPlatforms };
}
