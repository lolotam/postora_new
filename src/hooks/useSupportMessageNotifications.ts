import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupportMessagePushNotifications } from "@/hooks/usePushNotifications";

export interface SupportMessage {
  id: string;
  user_id: string;
  email: string | null;
  mobile: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export function useSupportMessageNotifications() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { notifyNewSupportMessage } = useSupportMessagePushNotifications();
  const lastMessageIdRef = useRef<string | null>(null);

  // Fetch open support messages for notification display
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["support-message-notifications"],
    queryFn: async (): Promise<SupportMessage[]> => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, user_id, email, mobile, subject, message, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Track the latest message ID to detect new messages
  useEffect(() => {
    if (messages.length > 0 && lastMessageIdRef.current === null) {
      // Initialize on first load
      lastMessageIdRef.current = messages[0].id;
    }
  }, [messages]);

  // Calculate open count
  const openCount = messages.length;

  // Mark as in_progress mutation
  const markAsInProgressMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("support_messages")
        .update({ status: "in_progress" })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-message-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  // Real-time subscription for new support messages
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("support-message-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          // Send push notification for new message
          const newMessage = payload.new as SupportMessage;
          if (newMessage && newMessage.id !== lastMessageIdRef.current) {
            notifyNewSupportMessage({
              id: newMessage.id,
              email: newMessage.email,
              subject: newMessage.subject,
            });
            lastMessageIdRef.current = newMessage.id;
          }
          // Refetch on new message
          queryClient.invalidateQueries({ queryKey: ["support-message-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-message-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient, notifyNewSupportMessage]);

  const markAsInProgress = (messageId: string) => {
    markAsInProgressMutation.mutate(messageId);
  };

  return {
    messages,
    openCount,
    isLoading,
    error,
    markAsInProgress,
  };
}
