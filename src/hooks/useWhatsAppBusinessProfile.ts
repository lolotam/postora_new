import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WhatsAppBusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
  profile_picture_url?: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    await supabase.auth.refreshSession();
    const { data: refreshed } = await supabase.auth.getSession();
    if (!refreshed.session?.access_token) throw new Error("Not authenticated");
    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA",
    };
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA",
  };
}

const BASE_URL = "https://efruibswazzuuupgyzmf.supabase.co/functions/v1/whatsapp-profile";

export function useWhatsAppBusinessProfile() {
  const queryClient = useQueryClient();

  const query = useQuery<WhatsAppBusinessProfile>({
    queryKey: ["whatsapp-business-profile"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(BASE_URL, { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch profile");
      }
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (profile: Omit<WhatsAppBusinessProfile, "profile_picture_url">) => {
      const headers = await getAuthHeaders();
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-business-profile"] });
      toast({ title: "Profile updated", description: "Your WhatsApp Business profile has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  return { profile: query.data, isLoading: query.isLoading, error: query.error, updateProfile: updateMutation.mutate, isUpdating: updateMutation.isPending };
}
