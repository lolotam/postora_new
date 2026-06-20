import { Palette, Image, Layers, ArrowRight } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ReferenceType } from "./DraggableReferenceImage";

interface ReferenceTypeTooltipProps {
  children: React.ReactNode;
  type: ReferenceType;
}

const typeExamples: Record<ReferenceType, {
  icon: typeof Palette;
  title: string;
  description: string;
  example: {
    input: string;
    prompt: string;
    result: string;
  };
  tips: string[];
}> = {
  style: {
    icon: Palette,
    title: "Style Reference",
    description: "Extracts the visual style, colors, lighting, and artistic mood from your reference image and applies it to your generated image.",
    example: {
      input: "Monet's Water Lilies painting",
      prompt: "\"A modern city skyline\"",
      result: "City rendered in impressionist brushstrokes with soft pastel colors",
    },
    tips: [
      "Best for: Art styles, color palettes, lighting moods",
      "The AI ignores the subject and focuses on how it looks",
      "Higher priority = stronger style influence",
    ],
  },
  content: {
    icon: Image,
    title: "Content Reference",
    description: "Uses the subject matter, composition, and layout from your reference while allowing different styling in the output.",
    example: {
      input: "Photo of a cat sitting on a windowsill",
      prompt: "\"A cartoon character\"",
      result: "Cartoon character sitting on a windowsill in similar pose",
    },
    tips: [
      "Best for: Poses, compositions, layouts, subjects",
      "The AI copies what is shown, not how it's rendered",
      "Great for consistent positioning across images",
    ],
  },
  "image-to-image": {
    icon: Layers,
    title: "Image-to-Image Transform",
    description: "Transforms your reference image directly according to your prompt, preserving the core structure while applying changes.",
    example: {
      input: "Photo of a house in summer",
      prompt: "\"Cover in snow, winter scene\"",
      result: "Same house now covered in snow with winter atmosphere",
    },
    tips: [
      "Best for: Transformations, edits, variations",
      "Preserves spatial layout and main elements",
      "Use when you want to modify an existing image",
    ],
  },
};

export function ReferenceTypeTooltip({ children, type }: ReferenceTypeTooltipProps) {
  const example = typeExamples[type];
  const Icon = example.icon;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="start" 
        className="w-80 p-0 bg-background border border-border shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{example.title}</h4>
          </div>
        </div>

        {/* Description */}
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {example.description}
          </p>
        </div>

        {/* Visual Example */}
        <div className="p-3 border-b border-border bg-muted/20">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Example
          </p>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 p-2 rounded bg-background border border-border">
              <div className="text-[10px] text-muted-foreground mb-0.5">Reference</div>
              <div className="font-medium truncate">{example.example.input}</div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <div className="flex-1 p-2 rounded bg-background border border-border">
              <div className="text-[10px] text-muted-foreground mb-0.5">Prompt</div>
              <div className="font-medium truncate">{example.example.prompt}</div>
            </div>
          </div>
          <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
            <div className="text-[10px] text-primary mb-0.5">Result</div>
            <div className="text-xs">{example.example.result}</div>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Tips
          </p>
          <ul className="space-y-1">
            {example.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
