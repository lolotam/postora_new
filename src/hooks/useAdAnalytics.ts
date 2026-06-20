import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  balance: string;
  amount_spent: string;
}

export interface CampaignInsight {
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  cpc: string;
  cpm: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  insights?: { data: CampaignInsight[] };
}

export interface DailyInsight {
  date_start: string;
  date_stop: string;
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  cpc: string;
  cpm: string;
  ctr: string;
}

export function useAdAccounts(socialAccountId: string | null) {
  return useQuery({
    queryKey: ["ad-accounts", socialAccountId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ad-analytics", {
        body: { action: "get_ad_accounts", social_account_id: socialAccountId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return (data?.data || []) as AdAccount[];
    },
    enabled: !!socialAccountId,
  });
}

export function useCampaigns(socialAccountId: string | null, adAccountId: string | null, datePreset = "last_30d") {
  return useQuery({
    queryKey: ["ad-campaigns", adAccountId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ad-analytics", {
        body: { action: "get_campaigns", social_account_id: socialAccountId, ad_account_id: adAccountId, date_preset: datePreset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return (data?.data || []) as Campaign[];
    },
    enabled: !!socialAccountId && !!adAccountId,
  });
}

export function useAccountInsights(socialAccountId: string | null, adAccountId: string | null, datePreset = "last_30d") {
  return useQuery({
    queryKey: ["ad-insights", adAccountId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ad-analytics", {
        body: { action: "get_account_insights", social_account_id: socialAccountId, ad_account_id: adAccountId, date_preset: datePreset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return (data?.data || []) as DailyInsight[];
    },
    enabled: !!socialAccountId && !!adAccountId,
  });
}
