import { Send, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Reveal, Icon3D, GradientRingCard, type GradientKey } from "@/components/fx";

interface AnalyticsStatCardsProps {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
}

export function AnalyticsStatCards({
  totalPosts,
  publishedPosts,
  scheduledPosts,
  failedPosts,
}: AnalyticsStatCardsProps) {
  const items: { label: string; value: number; icon: typeof Send; variant: GradientKey }[] = [
    { label: "Total Posts", value: totalPosts,     icon: Send,         variant: "sky" },
    { label: "Published",   value: publishedPosts, icon: CheckCircle2, variant: "emerald" },
    { label: "Scheduled",   value: scheduledPosts, icon: Clock,        variant: "amber" },
    { label: "Failed",      value: failedPosts,    icon: XCircle,      variant: "rose" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <Reveal key={item.label} delay={i * 90}>
          <GradientRingCard variant={item.variant} innerClassName="p-5">
            <div className="flex items-center gap-4">
              <Icon3D icon={item.icon} variant={item.variant} size="sm" />
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold tracking-tight">{item.value}</p>
              </div>
            </div>
          </GradientRingCard>
        </Reveal>
      ))}
    </div>
  );
}
