import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppAutoReply {
  id: string;
  user_id: string;
  name: string;
  rule_type: "away" | "keyword";
  keywords: string[] | null;
  reply_message: string;
  is_active: boolean;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_days: number[] | null;
  created_at: string;
  updated_at: string;
}

export type AutoReplyInput = Omit<WhatsAppAutoReply, "id" | "user_id" | "created_at" | "updated_at">;

export function useWhatsAppAutoReplies() {
  const queryClient = useQueryClient();
  const queryKey = ["whatsapp-auto-replies"];

  const { data: rules = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_auto_replies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WhatsAppAutoReply[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (input: AutoReplyInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("whatsapp_auto_replies").insert({
        ...input,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Auto-reply rule created");
    },
    onError: (e) => toast.error(`Failed to create rule: ${e.message}`),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...input }: Partial<AutoReplyInput> & { id: string }) => {
      const { error } = await supabase
        .from("whatsapp_auto_replies")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Rule updated");
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_auto_replies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Rule deleted");
    },
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_auto_replies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(`Failed to toggle: ${e.message}`),
  });

  return { rules, isLoading, createRule, updateRule, deleteRule, toggleRule };
}
