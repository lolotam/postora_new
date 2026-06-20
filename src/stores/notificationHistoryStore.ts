import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type NotificationType = "feature_flag" | "system" | "account" | "message" | "other";

export const normalizeFeatureKey = (key: string | undefined | null): string =>
  (key ?? "").trim().toLowerCase();

export interface ActivityNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  metadata?: {
    featureKey?: string;
    newValue?: boolean;
  };
}

type NewNotificationInput = Omit<ActivityNotification, 'id' | 'timestamp' | 'read'>;

const LEGACY_BUCKET = '_legacy_unscoped';
const DEDUPE_WINDOW_MS = 2000;

interface NotificationHistoryState {
  byUser: Record<string, ActivityNotification[]>;
  /** Transient (NOT persisted) — set by useScopedActivityStore from useAuth */
  currentUserId: string | null;
  /** Transient queue for notifications added before currentUserId is known */
  pendingQueue: NewNotificationInput[];
  setCurrentUserId: (userId: string | null) => void;
  /** Subscribed selector helper — returns the notifications for the current user */
  notifications: ActivityNotification[];
  addNotification: (notification: NewNotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

function shouldDedupe(
  existing: ActivityNotification[],
  incoming: NewNotificationInput
): boolean {
  if (incoming.type !== 'feature_flag') {
    // Existing behavior: dedupe feature_flag-like by exact title+description
    // (kept for backward compat for any non-FF entries that previously used title match)
    return false;
  }

  const incomingKey = normalizeFeatureKey(incoming.metadata?.featureKey);
  const incomingValue = incoming.metadata?.newValue;
  const now = Date.now();

  for (const n of existing) {
    if (n.type !== 'feature_flag') continue;

    const ts = n.timestamp instanceof Date
      ? n.timestamp.getTime()
      : new Date(n.timestamp).getTime();
    const withinWindow = now - ts <= DEDUPE_WINDOW_MS;

    // Layer A: exact title+description match (legacy-safe)
    if (n.title === incoming.title && n.description === incoming.description) {
      return true;
    }

    // Layer B: normalized metadata match within 2s window
    if (
      withinWindow &&
      incomingKey &&
      normalizeFeatureKey(n.metadata?.featureKey) === incomingKey &&
      n.metadata?.newValue === incomingValue
    ) {
      return true;
    }
  }

  return false;
}

function buildEntry(input: NewNotificationInput): ActivityNotification {
  // Defensive normalization on entry
  const normalizedMeta = input.metadata
    ? {
        ...input.metadata,
        featureKey: input.metadata.featureKey
          ? normalizeFeatureKey(input.metadata.featureKey)
          : undefined,
      }
    : undefined;

  return {
    ...input,
    metadata: normalizedMeta,
    id: crypto.randomUUID(),
    timestamp: new Date(),
    read: false,
  };
}

export const useNotificationHistoryStore = create<NotificationHistoryState>()(
  persist(
    (set, get) => ({
      byUser: {},
      currentUserId: null,
      pendingQueue: [],
      notifications: [],

      setCurrentUserId: (userId) => {
        const prev = get().currentUserId;
        if (prev === userId) {
          // Re-sync derived `notifications` slice in case bucket changed externally
          const list = userId ? get().byUser[userId] ?? [] : [];
          set({ notifications: list });
          return;
        }

        set({ currentUserId: userId });

        if (!userId) {
          set({ notifications: [] });
          return;
        }

        // Drain pending queue into this user's bucket
        const queue = get().pendingQueue;
        if (queue.length > 0) {
          set({ pendingQueue: [] });
          for (const item of queue) {
            get().addNotification(item);
          }
        }

        // If this user has nothing yet but a legacy unscoped bucket exists,
        // adopt those entries (one-time) so unrelated activity isn't lost.
        const state = get();
        const userBucket = state.byUser[userId] ?? [];
        const legacy = state.byUser[LEGACY_BUCKET] ?? [];
        if (userBucket.length === 0 && legacy.length > 0) {
          set({
            byUser: {
              ...state.byUser,
              [userId]: legacy,
              [LEGACY_BUCKET]: [],
            },
          });
        }

        // Sync derived `notifications` slice
        const finalList = get().byUser[userId] ?? [];
        set({ notifications: finalList });
      },

      addNotification: (notification) => {
        const userId = get().currentUserId;

        if (!userId) {
          // Queue until user is resolved — never write to an undefined bucket
          set((state) => ({ pendingQueue: [...state.pendingQueue, notification] }));
          return;
        }

        const existing = get().byUser[userId] ?? [];
        if (shouldDedupe(existing, notification)) return;

        const entry = buildEntry(notification);
        const nextList = [entry, ...existing].slice(0, 50);

        set((state) => ({
          byUser: { ...state.byUser, [userId]: nextList },
          notifications: nextList,
        }));
      },

      markAsRead: (id) => {
        const userId = get().currentUserId;
        if (!userId) return;
        const list = get().byUser[userId] ?? [];
        const nextList = list.map((n) => (n.id === id ? { ...n, read: true } : n));
        set((state) => ({
          byUser: { ...state.byUser, [userId]: nextList },
          notifications: nextList,
        }));
      },

      markAllAsRead: () => {
        const userId = get().currentUserId;
        if (!userId) return;
        const list = get().byUser[userId] ?? [];
        const nextList = list.map((n) => ({ ...n, read: true }));
        set((state) => ({
          byUser: { ...state.byUser, [userId]: nextList },
          notifications: nextList,
        }));
      },

      clearAll: () => {
        const userId = get().currentUserId;
        if (!userId) return;
        set((state) => ({
          byUser: { ...state.byUser, [userId]: [] },
          notifications: [],
        }));
      },

      getUnreadCount: () => {
        const userId = get().currentUserId;
        if (!userId) return 0;
        return (get().byUser[userId] ?? []).filter((n) => !n.read).length;
      },
    }),
    {
      name: 'notification-history',
      // Persist only the per-user store; never persist transient fields.
      partialize: (state) => ({
        byUser: Object.fromEntries(
          Object.entries(state.byUser).map(([userId, list]) => [
            userId,
            list.map((n) => ({
              ...n,
              timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
            })),
          ])
        ),
      }),
      // Custom deserialization + safe legacy migration
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;

        const raw = state as unknown as {
          byUser?: Record<string, ActivityNotification[]>;
          notifications?: ActivityNotification[];
        };

        // Always start with transient fields cleared
        state.currentUserId = null;
        state.pendingQueue = [];
        state.notifications = [];

        // Migrate legacy unscoped `notifications` array if present
        if (Array.isArray(raw.notifications) && raw.notifications.length > 0 && !raw.byUser) {
          const preserved = raw.notifications
            .filter((n) => {
              // Drop legacy feature-flag entries (typed or by title prefix as defense-in-depth)
              if (n.type === 'feature_flag') return false;
              if (typeof n.title === 'string' && n.title.startsWith('Feature ')) return false;
              return true;
            })
            .map((n) => ({
              ...n,
              timestamp: new Date(n.timestamp as unknown as string),
            }));

          state.byUser = preserved.length > 0 ? { [LEGACY_BUCKET]: preserved } : {};
          // Remove legacy field so it never gets re-persisted
          delete (state as unknown as { notifications?: unknown }).notifications;
          return;
        }

        // Normal path: rehydrate per-user buckets and convert timestamps back to Date
        if (raw.byUser) {
          state.byUser = Object.fromEntries(
            Object.entries(raw.byUser).map(([userId, list]) => [
              userId,
              (list ?? []).map((n) => ({
                ...n,
                timestamp: new Date(n.timestamp as unknown as string),
              })),
            ])
          );
        } else {
          state.byUser = {};
        }
      },
    }
  )
);

/**
 * Hook that binds the activity store to the current authenticated user.
 * Mount once near the app root (or anywhere `useAuth` is available) so
 * every consumer of `useNotificationHistoryStore` sees the right slice.
 */
export function useScopedActivityStore() {
  const { user } = useAuth();
  const setCurrentUserId = useNotificationHistoryStore((s) => s.setCurrentUserId);

  useEffect(() => {
    setCurrentUserId(user?.id ?? null);
  }, [user?.id, setCurrentUserId]);
}
