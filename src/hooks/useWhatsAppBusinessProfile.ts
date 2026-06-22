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

const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    await supabase.auth.refreshSession();
    const { data: refreshed } = await supabase.auth.getSession();
    if (!refreshed.session?.access_token) throw new Error("Not authenticated");
    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
      apikey: anonKey,
    };
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: anonKey,
  };
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-profile`;

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
