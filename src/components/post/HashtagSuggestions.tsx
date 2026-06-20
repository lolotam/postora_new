import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Hash, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { handleAIError } from "@/lib/aiErrorHandler";

interface HashtagSuggestionsProps {
  caption: string;
  platform: string;
  onAddHashtags: (hashtags: string[]) => void;
}

export function HashtagSuggestions({ caption, platform, onAddHashtags }: HashtagSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const handleGenerateHashtags = async () => {
    if (!caption.trim()) {
      toast({
        title: "Enter a caption first",
        description: "Write some caption content to get hashtag suggestions.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    setSelectedHashtags(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("Please sign in again to use AI features.");
      }

      const { data, error } = await supabase.functions.invoke("generate-hashtags", {
        body: {
          caption,
          platform,
          model: profile?.ai_model || "google/gemini-2.5-flash",
        },
      });

      if (error) {
        const status = (error as any)?.status;
        if (status === 401 || error.message?.includes("Invalid JWT")) {
          handleAIError({ status: 401, message: "Session expired" }, "Hashtag generation");
          return;
        }
        if (status === 402) {
          handleAIError({ status: 402, message: "Credits exhausted" }, "Hashtag generation");
          return;
        }
        if (status === 429) {
          handleAIError({ status: 429, message: "Rate limited" }, "Hashtag generation");
          return;
        }
        throw error;
      }

      if (data?.hashtags) {
        setSuggestions(data.hashtags);
      } else if (data?.error) {
        const errorMsg = data.error.toLowerCase();
        if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
          handleAIError({ status: 401, message: data.error }, "Hashtag generation");
        } else if (errorMsg.includes("402") || errorMsg.includes("credits")) {
          handleAIError({ status: 402, message: data.error }, "Hashtag generation");
        } else if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
          handleAIError({ status: 429, message: data.error }, "Hashtag generation");
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error) {
      handleAIError(error, "Hashtag generation");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHashtag = (hashtag: string) => {
    setSelectedHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(hashtag)) {
        next.delete(hashtag);
      } else {
        next.add(hashtag);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedHashtags.size === 0) {
      toast({
        title: "No hashtags selected",
        description: "Click on hashtags to select them first.",
        variant: "destructive",
      });
      return;
    }
    onAddHashtags(Array.from(selectedHashtags));
    toast({
      title: "Hashtags added!",
      description: `Added ${selectedHashtags.size} hashtag(s) to your caption.`,
    });
  };

  const handleCopyAll = async () => {
    const hashtagString = suggestions.join(" ");
    await navigator.clipboard.writeText(hashtagString);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({
      title: "Copied!",
      description: "All hashtags copied to clipboard.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerateHashtags}
          disabled={isLoading || !caption.trim()}
          className="text-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 mr-2" />
              Suggest Hashtags
            </>
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
            >
              {copiedAll ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              Copy All
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddSelected}
              disabled={selectedHashtags.size === 0}
            >
              Add Selected ({selectedHashtags.size})
            </Button>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
          {suggestions.map((hashtag) => (
            <Badge
              key={hashtag}
              variant={selectedHashtags.has(hashtag) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => toggleHashtag(hashtag)}
            >
              {hashtag}
            </Badge>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Click hashtags to select, then "Add Selected" to append to caption
        </p>
      )}
    </div>
  );
}
