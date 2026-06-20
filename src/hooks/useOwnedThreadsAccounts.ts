import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OwnedThreadsAccount {
  id: string;
  platform_username: string | null;
}

/**
 * Returns the set of Threads usernames the current user has connected,
 * plus a helper to resolve a username → social_account_id (or null).
 * Used to gate the "Delete from Threads" button on Analyze/Discovery so it
 * only renders when the post belongs to one of the user's own accounts.
 */
export function useOwnedThreadsAccounts() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: accounts = [] } = useQuery({
    queryKey: ["owned-threads-accounts", userId],
    queryFn: async (): Promise<OwnedThreadsAccount[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id, platform_username")
        .eq("user_id", userId)
        .eq("platform", "threads")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as OwnedThreadsAccount[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const ownedUsernames = new Set(
    accounts
      .map((a) => (a.platform_username || "").toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  );

  const ownsUsername = (raw?: string | null): string | null => {
    if (!raw) return null;
    const clean = raw.toLowerCase().replace(/^@/, "");
    if (!clean) return null;
    const match = accounts.find(
      (a) => (a.platform_username || "").toLowerCase().replace(/^@/, "") === clean,
    );
    return match?.id || null;
  };

  return { accounts, ownedUsernames, ownsUsername };
}
