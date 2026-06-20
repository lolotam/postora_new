import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, ArrowRight, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch } = useCredits();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    credits_added?: number;
    new_balance?: number;
    error?: string;
  } | null>(null);

  const sessionId = searchParams.get("session_id");
  const productType = searchParams.get("product");
  const creditsParam = searchParams.get("credits");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        setVerificationResult({ success: false, error: "No session ID provided" });
        return;
      }

      try {
        const response = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        setVerificationResult(response.data);
        
        if (response.data.success) {
          refetch(); // Refresh credit balance
          toast({
            title: "Payment successful!",
            description: `${response.data.credits_added} credits have been added to your account.`,
          });
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationResult({ 
          success: false, 
          error: error instanceof Error ? error.message : "Failed to verify payment" 
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, refetch, toast]);

  if (isVerifying) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Verifying your payment...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!verificationResult?.success) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-orange-500" />
              </div>
              <CardTitle className="text-2xl">Payment Processing</CardTitle>
              <CardDescription>
                {verificationResult?.error || "Your payment is still being processed. Please check back in a moment."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
                <Loader2 className="w-4 h-4" />
                Check Again
              </Button>
              <Button onClick={() => navigate("/credits")} variant="ghost">
                Back to Credits
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-12">
        <Card className="text-center">
          <CardHeader>
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your AI credits have been added to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-center gap-3 text-primary mb-2">
                <Zap className="w-6 h-6" />
                <span className="text-3xl font-bold">
                  +{verificationResult.credits_added || creditsParam}
                </span>
                <span className="text-lg">Credits</span>
              </div>
              <p className="text-sm text-muted-foreground">
                New balance: <span className="font-semibold text-foreground">{verificationResult.new_balance}</span> credits
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span>Use them for captions, hashtags, and image generation</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate("/post")} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                Create a Post
              </Button>
              <Button variant="outline" onClick={() => navigate("/credits")}>
                View Credit Balance
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              A confirmation email has been sent to your registered email address.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
