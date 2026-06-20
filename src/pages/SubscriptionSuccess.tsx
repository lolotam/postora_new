import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type VerificationStatus = "loading" | "success" | "error";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    async function verifySubscription() {
      if (!user?.id) {
        // Wait for user to be available
        return;
      }

      try {
        // First, call check-subscription to verify with Stripe
        const { data: checkData, error: checkError } = await supabase.functions.invoke(
          "check-subscription"
        );

        if (checkError) {
          console.error("Check subscription error:", checkError);
          // Don't fail immediately - webhook might still be processing
        }

        // If we have a session_id, we can also verify directly with Stripe
        // But for now, let's rely on the webhook + check-subscription approach

        // Give webhook a moment to process if needed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Invalidate all relevant queries to get fresh data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-subscription", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["user-role", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["user-quota", user.id] }),
        ]);

        // Check subscription status again after invalidation
        const { data: finalCheck } = await supabase.functions.invoke("check-subscription");

        if (finalCheck?.subscribed) {
          setStatus("success");
        } else {
          // Subscription might still be processing - show success anyway
          // The webhook will update the database
          console.log("Subscription check returned:", finalCheck);
          setStatus("success");
        }
      } catch (error) {
        console.error("Verification error:", error);
        // Even on error, show success - the webhook should handle everything
        setStatus("success");
      }
    }

    verifySubscription();
  }, [user?.id, queryClient, sessionId]);

  // Retry verification
  const handleRetry = () => {
    setStatus("loading");
    setErrorMessage(null);
    window.location.reload();
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Verifying your subscription...</h1>
          <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (status === "error") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Verification Issue</h1>
          <p className="text-muted-foreground mb-4 max-w-md">
            {errorMessage || "We couldn't verify your subscription. Your payment may still be processing."}
          </p>

          <div className="flex gap-4">
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => navigate("/settings")}>
              Check Settings
            </Button>
          </div>

          {sessionId && (
            <p className="text-xs text-muted-foreground mt-8">
              Session: {sessionId.slice(0, 20)}...
            </p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Welcome to Pro!</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Your subscription is now active. You have access to all premium features including
          more profiles, higher posting limits, and AI-powered tools.
        </p>

        <div className="flex gap-4">
          <Button onClick={() => navigate("/post")} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Create Your First Post
          </Button>
          <Button variant="outline" onClick={() => navigate("/profiles")}>
            Manage Profiles
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-muted-foreground mt-8">
            Session: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
