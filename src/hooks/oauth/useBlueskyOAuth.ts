import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { refetchSocialQueries } from "./oauthUtils";

export function useBlueskyOAuth(
  setConnectingPlatform: (p: any) => void,
  setConnectingProfile: (p: string | null) => void,
) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [blueskyDialogData, setBlueskyDialogData] = useState<{ profileId: string } | null>(null);

  const handleBlueskyOAuthConnect = async (profileId: string, handle: string) => {
    if (!user) throw new Error("Not authenticated");
    setConnectingPlatform("bluesky");
    setConnectingProfile(profileId);

    try {
      const origin = window.location.origin;
      const redirectUri = `${origin}/profiles`;

      if (origin !== "https://postora.cloud" && origin !== "https://postora.lovable.app" && !origin.includes("lovable.app")) {
        toast({ title: "OAuth redirect domain", description: "This domain may not be registered in the Bluesky client metadata redirect_uris. If the OAuth flow fails, add this domain to public/client-metadata.json redirect_uris." });
      }

      const { data, error } = await supabase.functions.invoke("bluesky-oauth", {
        body: { action: "authorize", handle, user_id: user.id, social_profile_id: profileId, redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.url) { window.location.href = data.url; } else { throw new Error("No authorization URL received"); }
    } catch (error) {
      console.error("Bluesky OAuth error:", error);
      toast({ title: "Connection failed", description: error instanceof Error ? error.message : "Failed to start Bluesky OAuth", variant: "destructive" });
      setConnectingPlatform(null);
      setConnectingProfile(null);
    }
  };

  const handleBlueskyOAuthCallback = async (code: string, state: string, profileId: string) => {
    setConnectingPlatform("bluesky");
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("bluesky-oauth", {
        body: { action: "callback", code, state, redirect_uri: `${origin}/profiles` },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Bluesky connected!", description: data.username ? `Connected account: @${data.username} (via OAuth)` : "Your Bluesky account has been connected successfully via OAuth." });
        refetchSocialQueries(queryClient);
      } else {
        throw new Error(data?.error || "Failed to complete Bluesky OAuth");
      }
    } catch (error) {
      console.error("Bluesky OAuth callback error:", error);
      toast({ title: "Connection failed", description: error instanceof Error ? error.message : "Failed to connect Bluesky", variant: "destructive" });
    } finally {
      setConnectingPlatform(null);
      setConnectingProfile(null);
    }
  };

  const handleBlueskyConnect = async (profileId: string, handle?: string, appPassword?: string) => {
    if (!user) throw new Error("Not authenticated");
    if (!handle || !appPassword) {
      setBlueskyDialogData({ profileId });
      setConnectingPlatform(null);
      setConnectingProfile(null);
      return;
    }

    setConnectingPlatform("bluesky");
    try {
      const { data, error } = await supabase.functions.invoke("bluesky-oauth", {
        body: { action: "connect", handle, app_password: appPassword, user_id: user.id, social_profile_id: profileId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Bluesky connected!", description: data.username ? `Connected account: @${data.username}` : "Your Bluesky account has been connected successfully." });
        refetchSocialQueries(queryClient);
        setBlueskyDialogData(null);
      } else {
        throw new Error(data?.error || "Failed to connect Bluesky");
      }
    } catch (error) {
      console.error("Bluesky connection error:", error);
      toast({ title: "Connection failed", description: error instanceof Error ? error.message : "Failed to connect Bluesky", variant: "destructive" });
    } finally {
      setConnectingPlatform(null);
      setConnectingProfile(null);
    }
  };

  const clearBlueskyDialog = () => setBlueskyDialogData(null);

  return { blueskyDialogData, handleBlueskyOAuthConnect, handleBlueskyOAuthCallback, handleBlueskyConnect, clearBlueskyDialog };
}
