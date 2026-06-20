import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Navigate } from "react-router-dom";
import { useSmartScheduling } from "@/hooks/useSmartScheduling";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Calendar, TrendingUp, Info } from "lucide-react";
import { Icon3D } from "@/components/fx/Icon3D";
import { GradientHeading } from "@/components/fx/GradientHeading";
import { GradientRingCard } from "@/components/fx/GradientRingCard";
import { GradientDivider } from "@/components/fx/GradientDivider";
import { Reveal } from "@/components/fx/Reveal";

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "threads", label: "Threads" },
];

function getScoreColor(score: number) {
  if (score >= 90) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20";
  if (score >= 80) return "bg-sky-500/10 text-sky-400 border-sky-500/30 ring-1 ring-sky-500/20";
  if (score >= 70) return "bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20";
  return "bg-white/5 text-muted-foreground border-white/10";
}

function getScoreVariant(score: number): "emerald" | "sky" | "amber" | "violet" {
  if (score >= 90) return "emerald";
  if (score >= 80) return "sky";
  if (score >= 70) return "amber";
  return "violet";
}

export default function SmartScheduling() {
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const [platform, setPlatform] = useState("instagram");
  const { suggestions, historyCount } = useSmartScheduling(platform);

  if (!flagsLoading && !flags.smartScheduling) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Background halos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent blur-3xl -z-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-sky-500/20 via-cyan-500/10 to-transparent blur-3xl -z-10"
        />

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <Reveal>
            <div className="group flex items-center gap-4 flex-wrap">
              <Icon3D icon={Sparkles} variant="violet" size="md" />
              <div className="flex-1 min-w-0">
                <GradientHeading preset="sky-violet-pink" size="lg" as="h1">
                  Smart Scheduling
                </GradientHeading>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered optimal posting times based on industry data and your history
                </p>
              </div>
            </div>
          </Reveal>

          <GradientDivider tone="violet" />

          {/* Platform selector toolbar */}
          <Reveal delay={80}>
            <div className="relative rounded-2xl bg-card/70 backdrop-blur-xl ring-1 ring-white/10 shadow-lg p-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400">
                    Platform
                  </span>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="w-[220px] h-9 bg-white/5 ring-1 ring-white/10 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {historyCount > 0 && (
                  <Badge className="h-7 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 ring-1 ring-violet-400/30 text-foreground border-0">
                    <Sparkles className="h-3 w-3 mr-1 text-violet-400" />
                    Based on {historyCount} past posts
                  </Badge>
                )}
              </div>
            </div>
          </Reveal>

          {/* Suggestions */}
          <div>
            <Reveal delay={120}>
              <div className="flex items-center gap-3 mb-4">
                <Icon3D icon={TrendingUp} variant="emerald" size="sm" />
                <GradientHeading preset="emerald-cyan-sky" size="lg" as="h2">
                  Best Times to Post
                </GradientHeading>
              </div>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((slot, i) => {
                const variant = getScoreVariant(slot.score);
                return (
                  <Reveal key={i} delay={160 + i * 60}>
                    <GradientRingCard variant={variant} ringIntensity="subtle" padded={false}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{slot.day}</span>
                          </div>
                          <Badge variant="outline" className={getScoreColor(slot.score)}>
                            {slot.score}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400">
                            {slot.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground min-h-[2rem]">{slot.reason}</p>
                        <Button
                          size="sm"
                          className="w-full mt-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white border-0 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:brightness-110"
                          onClick={() => window.location.href = `/post?schedule=${slot.day}&time=${slot.hour}`}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Schedule Post
                        </Button>
                      </div>
                    </GradientRingCard>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Info card */}
          <Reveal delay={200}>
            <GradientRingCard variant="sky" ringIntensity="subtle" padded={false}>
              <div className="p-6 flex items-start gap-4">
                <Icon3D icon={Info} variant="sky" size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-violet-400 mb-1">
                    How it works
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Smart Scheduling analyzes industry research data and your posting history to suggest the best times to post on each platform. Scores reflect predicted engagement levels. As you post more, suggestions become more personalized.
                  </p>
                </div>
              </div>
            </GradientRingCard>
          </Reveal>
        </div>
      </div>
    </DashboardLayout>
  );
}
