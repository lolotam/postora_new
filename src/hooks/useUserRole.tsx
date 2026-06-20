import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "user" | "admin" | "subscriber";

interface UserRoleData {
  role: AppRole;
  isAdmin: boolean;
  isSubscriber: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();

  const { data: role = "user", isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<AppRole> => {
      if (!user?.id) return "user";

      // Call the database function to get user's primary role
      const { data, error } = await supabase.rpc("get_user_role", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching user role:", error);
        return "user";
      }

      return (data as AppRole) || "user";
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    role,
    isAdmin: role === "admin",
    isSubscriber: role === "subscriber" || role === "admin", // Admins have all subscriber perks
    isLoading,
  };
}

// Hook to check if user has a specific role
export function useHasRole(targetRole: AppRole): boolean {
  const { role } = useUserRole();
  
  // Admin has all roles
  if (role === "admin") return true;
  
  // Subscriber has user role too
  if (role === "subscriber" && targetRole === "user") return true;
  
  return role === targetRole;
}
