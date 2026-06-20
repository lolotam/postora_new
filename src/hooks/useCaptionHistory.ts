import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface CaptionHistoryItem {
  id: string;
  user_id: string;
  caption: string;
  language: string | null;
  tone: string | null;
  platform: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveCaptionMeta {
  language?: string;
  tone?: string;
  platform?: string;
  prompt?: string;
}

export function useCaptionHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["caption_history", user?.id];

  const { data: history = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caption_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CaptionHistoryItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ caption, meta }: { caption: string; meta: SaveCaptionMeta }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("caption_history")
        .insert({
          user_id: user.id,
          caption,
          language: meta.language ?? null,
          tone: meta.tone ?? null,
          platform: meta.platform ?? null,
          prompt: meta.prompt ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CaptionHistoryItem;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<CaptionHistoryItem[]>(queryKey, (old = []) => [newItem, ...old]);
      toast({ title: "Saved to history", description: "Caption added to your history." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { data, error } = await supabase
        .from("caption_history")
        .update({ caption })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CaptionHistoryItem;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CaptionHistoryItem[]>(queryKey, (old = []) =>
        old.map((it) => (it.id === updated.id ? updated : it))
      );
      toast({ title: "Updated", description: "Caption updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caption_history").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<CaptionHistoryItem[]>(queryKey, (old = []) =>
        old.filter((it) => it.id !== id)
      );
      toast({ title: "Deleted", description: "Caption removed from history." });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return {
    history,
    isLoading,
    save: (caption: string, meta: SaveCaptionMeta) => saveMutation.mutateAsync({ caption, meta }),
    update: (id: string, caption: string) => updateMutation.mutateAsync({ id, caption }),
    remove: (id: string) => removeMutation.mutateAsync(id),
    isSaving: saveMutation.isPending,
  };
}
