import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuickReply {
  id: string;
  user_id: string;
  title: string;
  message: string;
  shortcut: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppQuickReplies() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-quick-replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_quick_replies")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: !!session,
  });
}

export function useCreateQuickReply() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; message: string; shortcut?: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_quick_replies")
        .insert({ ...input, user_id: session!.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-quick-replies"] }),
  });
}

export function useUpdateQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; message?: string; shortcut?: string | null; sort_order?: number }) => {
      const { data, error } = await supabase
        .from("whatsapp_quick_replies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-quick-replies"] }),
  });
}

export function useDeleteQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_quick_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-quick-replies"] }),
  });
}
