import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";
import { MessageSquare, Users, FileText, BarChart3, Zap, Bot, Radio, UserCog, Building2, Webhook, Clock, PieChart, ShoppingBag } from "lucide-react";
import { WhatsAppContactsContent } from "@/components/messaging/WhatsAppContactsContent";
import { WhatsAppTemplatesContent } from "@/components/messaging/WhatsAppTemplatesContent";
import { WhatsAppAnalyticsContent } from "@/components/messaging/WhatsAppAnalyticsContent";
import { QuickReplyManager } from "@/components/messaging/QuickReplyManager";
import { AutoReplyManager } from "@/components/messaging/AutoReplyManager";
import { BroadcastManager } from "@/components/messaging/BroadcastManager";
import { AgentManager } from "@/components/messaging/AgentManager";
import { BusinessProfileManager } from "@/components/messaging/BusinessProfileManager";
import { WebhookManager } from "@/components/messaging/WebhookManager";
import { ScheduledMessageManager } from "@/components/messaging/ScheduledMessageManager";
import { CannedResponseAnalytics } from "@/components/messaging/CannedResponseAnalytics";
import { WhatsAppCatalogContent } from "@/components/messaging/WhatsAppCatalogContent";
import { WhatsAppCoexistenceSetupBanner } from "@/components/messaging/WhatsAppCoexistenceSetupBanner";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Navigate } from "react-router-dom";

export default function WhatsAppMessaging() {
  const [activeTab, setActiveTab] = useState("conversations");
  const { flags, isLoading } = useFeatureFlags();

  if (!isLoading && !flags.msgWhatsapp) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Business</h1>
            <p className="text-sm text-muted-foreground">Manage your WhatsApp Business conversations</p>
          </div>
        </div>

        <WhatsAppCoexistenceSetupBanner />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto bg-transparent p-0 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {[
              { value: "conversations", icon: MessageSquare, label: "Conversations" },
              { value: "contacts", icon: Users, label: "Contacts" },
              { value: "templates", icon: FileText, label: "Templates" },
              { value: "analytics", icon: BarChart3, label: "Analytics" },
              { value: "quick-replies", icon: Zap, label: "Quick Replies" },
              { value: "auto-replies", icon: Bot, label: "Auto Replies" },
              { value: "broadcasts", icon: Radio, label: "Broadcasts" },
              { value: "agents", icon: UserCog, label: "Agents" },
              { value: "profile", icon: Building2, label: "Profile" },
              { value: "webhooks", icon: Webhook, label: "Webhooks" },
              { value: "scheduled", icon: Clock, label: "Scheduled" },
              { value: "response-stats", icon: PieChart, label: "Response Stats" },
              { value: "catalog", icon: ShoppingBag, label: "Catalog" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group relative flex h-auto flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-500/40 hover:bg-accent hover:text-foreground hover:shadow-md data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/30"
              >
                <Icon className="w-4 h-4" />
                <span className="leading-tight">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="conversations" className="mt-4">
            <MessagingInbox platform="whatsapp" />
          </TabsContent>
          <TabsContent value="contacts" className="mt-4">
            <WhatsAppContactsContent />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <WhatsAppTemplatesContent />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <WhatsAppAnalyticsContent />
          </TabsContent>
          <TabsContent value="quick-replies" className="mt-4">
            <QuickReplyManager />
          </TabsContent>
          <TabsContent value="auto-replies" className="mt-4">
            <AutoReplyManager />
          </TabsContent>
          <TabsContent value="broadcasts" className="mt-4">
            <BroadcastManager />
          </TabsContent>
          <TabsContent value="agents" className="mt-4">
            <AgentManager />
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            <BusinessProfileManager />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-4">
            <WebhookManager />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-4">
            <ScheduledMessageManager />
          </TabsContent>
          <TabsContent value="response-stats" className="mt-4">
            <CannedResponseAnalytics />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <WhatsAppCatalogContent />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
