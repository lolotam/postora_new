import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { refetchSocialQueries } from "./oauthUtils";

export function useTikTokOAuth(
  setConnectingPlatform: (p: any) => void,
  setConnectingProfile: (p: string | null) => void,
) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleTikTokConnect = async (profileId: string) => {
    const productionDomain = "https://postora.cloud";
    const isPreviewEnv = !window.location.origin.includes("postora.cloud");
    const redirectUri = `${productionDomain}/tiktok-callback`;

    if (isPreviewEnv) {
      toast({
        title: "⚠️ Preview Environment Detected",
        description: "TikTok OAuth will redirect to production domain. You'll be redirected to postora.cloud after authorization.",
        duration: 5000,
      });
    }

    sessionStorage.setItem("tiktok_profile_id", profileId);

    const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
      body: { action: "authorize", redirect_uri: redirectUri },
    });

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No authorization URL received");
    }
  };

  const handleTikTokCallback = async (code: string, profileId: string) => {
    setConnectingPlatform("tiktok");
    try {
      const redirectUri = `${window.location.origin}/profiles?platform=tiktok&profile_id=${profileId}`;
      const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
        body: { action: "callback", code, redirect_uri: redirectUri, user_id: user?.id, social_profile_id: profileId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "TikTok connected!", description: "Your TikTok account has been connected successfully." });
        refetchSocialQueries(queryClient);
      } else {
        throw new Error(data?.error || "Failed to complete TikTok connection");
      }
    } catch (error) {
      console.error("TikTok callback error:", error);
      toast({ title: "Connection failed", description: error instanceof Error ? error.message : "Failed to connect TikTok", variant: "destructive" });
    } finally {
      setConnectingPlatform(null);
      setConnectingProfile(null);
    }
  };

  return { handleTikTokConnect, handleTikTokCallback };
}
