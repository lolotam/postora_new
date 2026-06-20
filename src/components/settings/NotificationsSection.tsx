import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Loader2, Volume2, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export function NotificationsSection() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { flags } = useFeatureFlags();
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [postSuccessEnabled, setPostSuccessEnabled] = useState(false);
  const [postFailureEnabled, setPostFailureEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSound, setIsSavingSound] = useState(false);
  const [isSavingPostSuccess, setIsSavingPostSuccess] = useState(false);
  const [isSavingPostFailure, setIsSavingPostFailure] = useState(false);

  useEffect(() => {
    if (profile) {
      setEmailNotificationsEnabled(profile.email_notifications_enabled ?? false);
      setSoundEnabled(profile.notification_sound_enabled ?? false);
      setPostSuccessEnabled(profile.post_success_notifications_enabled ?? false);
      setPostFailureEnabled(profile.post_failure_notifications_enabled ?? false);
    }
  }, [profile]);

  const handleEmailNotificationsChange = async (enabled: boolean) => {
    if (!profile) return;

    setIsSaving(true);
    setEmailNotificationsEnabled(enabled);

    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications_enabled: enabled })
      .eq("id", profile.id);

    if (error) {
      setEmailNotificationsEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update email preferences.",
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: enabled ? "Email notifications enabled" : "Email notifications disabled",
        description: enabled
          ? "You'll receive emails about new updates."
          : "You won't receive update emails anymore.",
      });
    }

    setIsSaving(false);
  };

  const handleSoundChange = async (enabled: boolean) => {
    if (!profile) return;

    setIsSavingSound(true);
    setSoundEnabled(enabled);

    const { error } = await supabase
      .from("profiles")
      .update({ notification_sound_enabled: enabled })
      .eq("id", profile.id);

    if (error) {
      setSoundEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update sound preferences.",
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: enabled ? "Sound notifications enabled" : "Sound notifications disabled",
        description: enabled
          ? "You'll hear sounds when posts publish."
          : "Sound notifications are now muted.",
      });
    }

    setIsSavingSound(false);
  };

  const handlePostSuccessChange = async (enabled: boolean) => {
    if (!profile) return;

    setIsSavingPostSuccess(true);
    setPostSuccessEnabled(enabled);

    const { error } = await supabase
      .from("profiles")
      .update({ post_success_notifications_enabled: enabled })
      .eq("id", profile.id);

    if (error) {
      setPostSuccessEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update post success preferences.",
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: enabled ? "Post success notifications enabled" : "Post success notifications disabled",
        description: enabled
          ? "You'll be notified when posts are published."
          : "Post success notifications are now disabled.",
      });
    }

    setIsSavingPostSuccess(false);
  };

  const handlePostFailureChange = async (enabled: boolean) => {
    if (!profile) return;

    setIsSavingPostFailure(true);
    setPostFailureEnabled(enabled);

    const { error } = await supabase
      .from("profiles")
      .update({ post_failure_notifications_enabled: enabled })
      .eq("id", profile.id);

    if (error) {
      setPostFailureEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update post failure preferences.",
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: enabled ? "Post failure notifications enabled" : "Post failure notifications disabled",
        description: enabled
          ? "You'll be notified when posts fail."
          : "Post failure notifications are now disabled.",
      });
    }

    setIsSavingPostFailure(false);
  };

  const emailNotificationsAvailable = flags.emailNotifications;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Configure how you receive updates
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sound Notifications Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Sound Notifications</p>
              <p className="text-xs text-muted-foreground">
                Play sounds when posts publish or fail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSavingSound && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleSoundChange}
              disabled={isSavingSound}
            />
          </div>
        </div>
        <Separator />

        {/* Email Notifications Section - gated by feature flag */}
        {emailNotificationsAvailable ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Token expiry warnings, connection alerts & announcements
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={emailNotificationsEnabled}
                  onCheckedChange={handleEmailNotificationsChange}
                  disabled={isSaving}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Post Success</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when posts are published
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingPostSuccess && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={postSuccessEnabled}
                  onCheckedChange={handlePostSuccessChange}
                  disabled={isSavingPostSuccess}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Post Failures</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when posts fail
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingPostFailure && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={postFailureEnabled}
                  onCheckedChange={handlePostFailureChange}
                  disabled={isSavingPostFailure}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Weekly Summary</p>
                <p className="text-xs text-muted-foreground">
                  Receive a weekly report of your activity
                </p>
              </div>
              <Switch />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Email notifications are currently not available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
