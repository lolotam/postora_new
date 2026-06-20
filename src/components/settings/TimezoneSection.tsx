import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TimezoneSelector } from "@/components/post/TimezoneSelector";
import {
  Globe,
  Loader2,
  Check,
} from "lucide-react";

interface TimezoneSectionProps {
  preferredTimezone: string;
  setPreferredTimezone: (tz: string) => void;
}

export function TimezoneSection({
  preferredTimezone,
  setPreferredTimezone,
}: TimezoneSectionProps) {
  const { toast } = useToast();
  const { profile, refreshProfile, user } = useAuth();
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  const handleSaveTimezone = async () => {
    if (!user) return;

    setIsSavingTimezone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_timezone: preferredTimezone || null })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Timezone saved",
        description: preferredTimezone
          ? `Your preferred timezone is now ${preferredTimezone}.`
          : "Timezone preference has been cleared.",
      });
    } catch (error) {
      console.error("Timezone save error:", error);
      toast({
        title: "Failed to save timezone",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSavingTimezone(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Timezone Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Set your preferred timezone for scheduling posts
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <TimezoneSelector
          value={preferredTimezone}
          onChange={setPreferredTimezone}
        />

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveTimezone}
            disabled={isSavingTimezone || preferredTimezone === (profile?.preferred_timezone || "")}
          >
            {isSavingTimezone ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Timezone
              </>
            )}
          </Button>
          {preferredTimezone && (
            <Button
              variant="ghost"
              onClick={() => setPreferredTimezone("")}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This timezone will be automatically selected when scheduling new posts.
        </p>
      </div>
    </div>
  );
}
