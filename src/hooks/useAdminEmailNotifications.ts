import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminEmailPushNotifications } from "@/hooks/usePushNotifications";

export interface AdminEmail {
  id: string;
  from_email: string;
  subject: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function useAdminEmailNotifications() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { notifyNewEmail } = useAdminEmailPushNotifications();
  const lastEmailIdRef = useRef<string | null>(null);

  // Fetch unread inbound emails for notification display
  const {
    data: emails = [],
    isLoading,
  } = useQuery({
    queryKey: ["admin-email-notifications"],
    queryFn: async (): Promise<AdminEmail[]> => {
      const { data, error } = await supabase
        .from("admin_inbox_messages")
        .select("id, from_email, subject, body, is_read, created_at")
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Track the latest email ID to detect new emails
  useEffect(() => {
    if (emails.length > 0 && lastEmailIdRef.current === null) {
      // Initialize on first load
      lastEmailIdRef.current = emails[0].id;
    }
  }, [emails]);

  // Calculate unread count
  const unreadCount = emails.filter((m) => !m.is_read).length;

  // Mark email as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_inbox_messages")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox-messages"] });
    },
  });

  // Subscribe to real-time updates for new inbound emails
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin-email-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_inbox_messages",
          filter: "direction=eq.inbound",
        },
        (payload) => {
          // Send push notification for new email
          const newEmail = payload.new as AdminEmail;
          if (newEmail && newEmail.id !== lastEmailIdRef.current) {
            notifyNewEmail({
              id: newEmail.id,
              from_email: newEmail.from_email,
              subject: newEmail.subject,
            });
            lastEmailIdRef.current = newEmail.id;
          }
          // Refetch on new email
          queryClient.invalidateQueries({ queryKey: ["admin-email-notifications"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_inbox_messages",
        },
        () => {
          // Refetch on email read status change
          queryClient.invalidateQueries({ queryKey: ["admin-email-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient, notifyNewEmail]);

  return {
    emails,
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
  };
}
