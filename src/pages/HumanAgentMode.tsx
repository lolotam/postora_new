import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, Bot, UserRound, MessageSquare, Clock, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Icon3D, GradientHeading, GradientRingCard, GradientDivider, Reveal } from "@/components/fx";
import type { GradientKey } from "@/components/fx";

interface AgentSession {
  id: string;
  customerName: string;
  startedAt: Date;
  status: "active" | "waiting" | "resolved";
  platform: string;
  lastMessage: string;
}

// This is a UI-only feature for now — will connect to WhatsApp API in production
export default function HumanAgentMode() {
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const [autoAssign, setAutoAssign] = useState(true);
  const [awayMessage, setAwayMessage] = useState("Thanks for reaching out! A human agent will be with you shortly.");
  const [maxConcurrent, setMaxConcurrent] = useState("5");
  const [isOnline, setIsOnline] = useState(false);

  if (!flagsLoading && !flags.humanAgent) {
    return <Navigate to="/dashboard" replace />;
  }

  // Demo sessions
  const sessions: AgentSession[] = [];

  const handleToggleOnline = (checked: boolean) => {
    setIsOnline(checked);
    toast({
      title: checked ? "You're now online" : "You're now offline",
      description: checked
        ? "New conversations will be routed to you."
        : "Auto-replies will handle incoming messages.",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Reveal>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="group flex items-center gap-4 min-w-0">
              <Icon3D icon={Headphones} variant="amber" size="md" />
              <div className="flex-1 min-w-0">
                <GradientHeading preset="amber-rose-violet" size="lg" as="h1">Human Agent Mode</GradientHeading>
                <p className="text-sm text-muted-foreground mt-1">Take over conversations from auto-reply bots</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/60 backdrop-blur-md px-3 py-1.5">
              <span className="text-sm text-muted-foreground">Agent Status</span>
              <Switch checked={isOnline} onCheckedChange={handleToggleOnline} />
              <Badge className={isOnline
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white border-0"
                : "bg-card/60 border border-border/40 text-muted-foreground"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        </Reveal>
        <GradientDivider tone="rose" />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: "Active Chats", value: sessions.filter(s => s.status === "active").length, icon: MessageSquare, variant: "amber" as GradientKey },
            { label: "Waiting", value: sessions.filter(s => s.status === "waiting").length, icon: Clock, variant: "rose" as GradientKey },
            { label: "Resolved Today", value: 0, icon: UserRound, variant: "violet" as GradientKey },
            { label: "Avg Response", value: "—", icon: Clock, variant: "sky" as GradientKey },
          ]).map((stat, i) => (
            <Reveal key={stat.label} delay={i * 60}>
              <div className="group rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5">
                <Icon3D icon={stat.icon} variant={stat.variant} size="sm" />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Queue */}
        <Reveal delay={120}>
          <GradientRingCard variant="amber" hoverLift={false} ringIntensity="subtle">
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <MessageSquare className="h-5 w-5 text-amber-500" />
                Conversation Queue
              </div>
              <p className="text-sm text-muted-foreground">
                {isOnline
                  ? "Waiting for incoming conversations..."
                  : "Go online to start receiving conversations."}
              </p>
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <div className="group inline-flex mb-3"><Icon3D icon={Bot} variant="amber" size="lg" /></div>
                <p className="font-medium mt-2">No active conversations</p>
                <p className="text-sm mt-1">
                  {isOnline
                    ? "Conversations will appear here when customers need human assistance."
                    : "Toggle your status to Online to start receiving conversations."}
                </p>
              </div>
            ) : null}
          </GradientRingCard>
        </Reveal>

        {/* Settings */}
        <Reveal delay={180}>
          <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <Settings className="h-5 w-5 text-amber-500" />
              Agent Settings
            </div>
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-assign conversations</p>
                <p className="text-xs text-muted-foreground">Automatically assign new conversations to available agents</p>
              </div>
              <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max concurrent chats</label>
              <Select value={maxConcurrent} onValueChange={setMaxConcurrent}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "5", "10", "15", "20"].map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Away message</label>
              <Textarea
                value={awayMessage}
                onChange={(e) => setAwayMessage(e.target.value)}
                placeholder="Message shown when no agents are available..."
                className="min-h-[80px]"
              />
            </div>

            <Button
              onClick={() => toast({ title: "Settings saved" })}
              size="sm"
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:opacity-90"
            >
              Save Settings
            </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </DashboardLayout>
  );
}
