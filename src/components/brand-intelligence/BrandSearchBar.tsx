import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandSearchBarProps {
  platform: string;
  onSearch: (username: string) => void;
  isLoading: boolean;
}

function extractUsername(input: string, platform: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // URL patterns per platform
  const igRegex = /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/;
  const threadsRegex = /threads\.net\/@?([a-zA-Z0-9_.]+)/;
  const fbRegex = /(?:facebook\.com|fb\.com)\/([a-zA-Z0-9_.]+)/;
  const tiktokRegex = /tiktok\.com\/@?([a-zA-Z0-9_.]+)/;

  if (platform === "instagram") {
    const match = trimmed.match(igRegex);
    if (match) return match[1];
  }
  if (platform === "threads") {
    const match = trimmed.match(threadsRegex);
    if (match) return match[1];
  }
  if (platform === "facebook") {
    const match = trimmed.match(fbRegex);
    if (match) return match[1];
  }
  if (platform === "tiktok") {
    const match = trimmed.match(tiktokRegex);
    if (match) return match[1];
  }

  // @username or plain username
  const clean = trimmed.replace(/^@/, "").toLowerCase();
  if (/^[a-zA-Z0-9_.]{1,30}$/.test(clean)) return clean;

  return null;
}

export function BrandSearchBar({ platform, onSearch, isLoading }: BrandSearchBarProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const placeholders: Record<string, string> = {
    instagram: "Enter @username or instagram.com/username",
    threads: "Enter @username or threads.net/username",
    facebook: "Enter page name or facebook.com/pagename",
    tiktok: "Enter @username or tiktok.com/@username",
  };
  const placeholder = placeholders[platform] || placeholders.instagram;

  const handleSubmit = () => {
    const username = extractUsername(input, platform);
    if (!username) {
      setInvalid(true);
      setParsed(null);
      setTimeout(() => setInvalid(false), 600);
      return;
    }
    setParsed(username);
    setInvalid(false);
    onSearch(username);
  };

  return (
    <div className="space-y-2">
      <div className={cn(
        "flex items-center gap-2",
        invalid && "animate-[shake_0.4s_ease-in-out]"
      )}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInvalid(false);
              const u = extractUsername(e.target.value, platform);
              setParsed(u);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className={cn(
              "pl-10 h-11",
              invalid && "border-destructive ring-destructive"
            )}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="h-11 px-6 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white border-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Analyze
        </Button>
      </div>
      {parsed && !isLoading && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-500">
          <Check className="w-3.5 h-3.5" />
          <span>Searching: @{parsed}</span>
        </div>
      )}
    </div>
  );
}
