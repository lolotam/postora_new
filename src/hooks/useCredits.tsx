import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: "purchase" | "usage" | "refund" | "bonus";
  description: string | null;
  stripe_session_id: string | null;
  created_at: string;
}

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: credits, isLoading, refetch } = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async (): Promise<UserCredits | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        return null;
      }

      return data as UserCredits | null;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async (): Promise<CreditTransaction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return data as CreditTransaction[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const useCredits = useMutation({
    mutationFn: async ({ amount, description }: { amount: number; description: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("use_credits", {
        p_user_id: user.id,
        p_amount: amount,
        p_description: description,
      });

      if (error) throw error;
      if (!data) throw new Error("Insufficient credits");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-credits", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Insufficient credits",
        description: error instanceof Error ? error.message : "Failed to use credits",
        variant: "destructive",
      });
    },
  });

  const balance = credits?.balance ?? 0;
  const hasCredits = balance > 0;

  const canAfford = (amount: number) => balance >= amount;

  return {
    credits,
    balance,
    hasCredits,
    canAfford,
    transactions,
    isLoading,
    isLoadingTransactions,
    useCredits: useCredits.mutateAsync,
    isUsingCredits: useCredits.isPending,
    refetch,
  };
}
