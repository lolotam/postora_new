import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WhatsAppTemplatesContent } from "@/components/messaging/WhatsAppTemplatesContent";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Navigate } from "react-router-dom";

export default function WhatsAppTemplates() {
  const { flags, isLoading } = useFeatureFlags();

  if (!isLoading && !flags.msgWhatsapp) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Templates</h1>
        </div>
        <WhatsAppTemplatesContent />
      </div>
    </DashboardLayout>
  );
}
