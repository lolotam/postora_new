import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

export default function SubscriptionCancel() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Subscription Canceled</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          No worries! Your checkout was canceled and you haven't been charged.
          You can upgrade to Pro anytime when you're ready.
        </p>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/pricing")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
