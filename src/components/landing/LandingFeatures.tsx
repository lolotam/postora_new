import { Zap, Shield, Globe, Sparkles } from "lucide-react";
import { Reveal, Icon3D, GradientRingCard, GradientHeading, GradientDivider, type GradientKey } from "@/components/fx";

const features: { icon: typeof Zap; title: string; description: string; variant: GradientKey }[] = [
  { icon: Zap,      title: "Lightning Fast",     description: "Post to multiple platforms simultaneously with just one click.", variant: "amber" },
  { icon: Shield,   title: "Secure OAuth",       description: "Enterprise-grade security for all your social accounts.",         variant: "sky" },
  { icon: Globe,    title: "n8n Integration",    description: "Automate your posting workflow with powerful HTTP API.",          variant: "emerald" },
  { icon: Sparkles, title: "Smart Scheduling",   description: "Schedule posts for optimal engagement times.",                    variant: "violet" },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="relative z-10 container mx-auto px-6 pb-32 scroll-mt-20">
      <Reveal className="max-w-2xl mx-auto text-center mb-12">
        <GradientHeading preset="sky-violet-pink">Everything you need to post smarter</GradientHeading>
        <p className="mt-4 text-muted-foreground text-base md:text-lg">
          A toolkit built for creators, marketers, and teams shipping content every day.
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 100}>
            <GradientRingCard variant={feature.variant}>
              <Icon3D icon={feature.icon} variant={feature.variant} size="md" />
              <h3 className="mt-5 text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </GradientRingCard>
          </Reveal>
        ))}
      </div>

      <GradientDivider className="mt-20" />
    </section>
  );
}
