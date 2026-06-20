import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Platform } from "@/lib/types";

export const refetchSocialQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  // Core social account/profile queries
  queryClient.refetchQueries({ queryKey: ["all_social_accounts"] });
  queryClient.refetchQueries({ queryKey: ["social_accounts"] });
  queryClient.refetchQueries({ queryKey: ["social_accounts_by_profile"] });
  queryClient.refetchQueries({ queryKey: ["social_profiles"] });

  // Token health / re-auth state — these drive the red UI flags (dashboard
  // banner, "Action Required" badges, Connection Health page). After a
  // successful reconnect the backend clears needs_reauth, so these queries
  // MUST be refetched or the flags persist (look stuck) until their next
  // scheduled interval.
  queryClient.refetchQueries({ queryKey: ["accounts-needing-reauth"] });
  queryClient.refetchQueries({ queryKey: ["connection_health"] });
  queryClient.refetchQueries({ queryKey: ["admin-token-health"] });
  queryClient.refetchQueries({ queryKey: ["admin-refresh-history"] });
};

export const linkAccountToProfile = async (userId: string, platform: Platform, profileId: string) => {
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("is_active", true)
    .order("connected_at", { ascending: false })
    .limit(1);

  if (error || !accounts || accounts.length === 0) {
    console.error("Could not find account to link:", error);
    return;
  }

  const { error: updateError } = await supabase
    .from("social_accounts")
    .update({ social_profile_id: profileId })
    .eq("id", accounts[0].id);

  if (updateError) {
    console.error("Error linking account to profile:", updateError);
  }
};
