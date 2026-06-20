import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      socialAccountId: string;
      adAccountId: string;
      name: string;
      objective: string;
      dailyBudget?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ad-manager", {
        body: {
          action: "create_campaign",
          social_account_id: params.socialAccountId,
          ad_account_id: params.adAccountId,
          name: params.name,
          objective: params.objective,
          daily_budget: params.dailyBudget,
          status: params.status || "PAUSED",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast({ title: "Campaign created", description: "Your campaign has been created (paused)." });
    },
    onError: (error) => {
      toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { socialAccountId: string; campaignId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke("ad-manager", {
        body: {
          action: "update_campaign_status",
          social_account_id: params.socialAccountId,
          campaign_id: params.campaignId,
          status: params.status,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast({ title: "Campaign updated" });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { socialAccountId: string; campaignId: string }) => {
      const { data, error } = await supabase.functions.invoke("ad-manager", {
        body: {
          action: "delete_campaign",
          social_account_id: params.socialAccountId,
          campaign_id: params.campaignId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });
}
