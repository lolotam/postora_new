import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isEnabled: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "unsupported",
    isEnabled: false,
  });

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = "Notification" in window;
    
    if (isSupported) {
      const permission = Notification.permission;
      const isEnabled = permission === "granted";
      
      setState({
        isSupported: true,
        permission,
        isEnabled,
      });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const isEnabled = permission === "granted";
      
      setState((prev) => ({
        ...prev,
        permission,
        isEnabled,
      }));

      if (isEnabled && user) {
        // Store preference locally
        localStorage.setItem(`push_notifications_${user.id}`, "enabled");
      }

      return isEnabled;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [state.isSupported, user]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (!state.isEnabled) {
        console.warn("Notifications are not enabled");
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: "/favicon.png",
          badge: "/favicon.png",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate to the update if there's a tag (post ID)
          if (options?.tag) {
            window.location.href = `/whats-new/${options.tag}`;
          }
        };

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [state.isEnabled]
  );

  const disableNotifications = useCallback(() => {
    if (user) {
      localStorage.removeItem(`push_notifications_${user.id}`);
    }
    setState((prev) => ({
      ...prev,
      isEnabled: false,
    }));
  }, [user]);

  return {
    ...state,
    requestPermission,
    sendNotification,
    disableNotifications,
  };
}

// Hook to listen for new blog posts and send notifications
export function useNewPostNotifications() {
  const { isEnabled, sendNotification } = usePushNotifications();
  const { user } = useAuth();

  const notifyNewPost = useCallback(
    (post: { id: string; title: string; excerpt?: string | null }) => {
      if (!isEnabled || !user) return;

      sendNotification(`🚀 New Update: ${post.title}`, {
        body: post.excerpt || "Check out the latest update!",
        tag: post.id, // Prevents duplicate notifications
        requireInteraction: false,
      });
    },
    [isEnabled, sendNotification, user]
  );

  return { notifyNewPost };
}

// Hook to send push notifications for new admin emails
export function useAdminEmailPushNotifications() {
  const { isEnabled, sendNotification } = usePushNotifications();
  const { user } = useAuth();

  const notifyNewEmail = useCallback(
    (email: { id: string; from_email: string; subject?: string | null }) => {
      if (!isEnabled || !user) return;

      // Create notification with custom onclick behavior for admin inbox
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      try {
        const notification = new Notification(`📧 New Email from ${email.from_email}`, {
          body: email.subject || "(No subject)",
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: `email-${email.id}`, // Prevents duplicate notifications
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          window.location.href = "/admin/inbox";
        };
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    },
    [isEnabled, user]
  );

  return { notifyNewEmail };
}

// Hook to send push notifications for new support messages
export function useSupportMessagePushNotifications() {
  const { isEnabled } = usePushNotifications();
  const { user } = useAuth();

  const notifyNewSupportMessage = useCallback(
    (message: { id: string; email: string | null; subject: string }) => {
      if (!isEnabled || !user) return;

      // Create notification with custom onclick behavior for admin messages
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      try {
        const notification = new Notification(`📩 New Contact Message`, {
          body: `${message.email || "Unknown"}: ${message.subject}`,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: `support-${message.id}`, // Prevents duplicate notifications
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          window.location.href = "/admin/messages";
        };
      } catch (error) {
        console.error("Error sending support message notification:", error);
      }
    },
    [isEnabled, user]
  );

  return { notifyNewSupportMessage };
}
