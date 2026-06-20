import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { refetchSocialQueries } from "./oauthUtils";

export function useYouTubeOAuth(
  setConnectingPlatform: (p: any) => void,
  setConnectingProfile: (p: string | null) => void,
) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleYouTubeConnect = async (profileId: string) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase.functions.invoke("youtube-oauth", {
      body: { action: "authorize", user_id: user.id, social_profile_id: profileId, return_to: `${window.location.origin}/profiles` },
    });
    if (error) throw error;
    if (data?.url) { window.location.href = data.url; } else { throw new Error("No authorization URL received"); }
  };

  const handleYouTubeCallback = async (code: string, profileId: string) => {
    setConnectingPlatform("youtube");
    try {
      const redirectUri = `${window.location.origin}/profiles?platform=youtube&profile_id=${profileId}`;
      const { data, error } = await supabase.functions.invoke("youtube-oauth", {
        body: { action: "callback", code, redirect_uri: redirectUri, user_id: user?.id, social_profile_id: profileId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "YouTube connected!", description: "Your YouTube channel has been connected successfully." });
        refetchSocialQueries(queryClient);
      } else {
        throw new Error(data?.error || "Failed to complete YouTube connection");
      }
    } catch (error) {
      console.error("YouTube callback error:", error);
      toast({ title: "Connection failed", description: error instanceof Error ? error.message : "Failed to connect YouTube", variant: "destructive" });
    } finally {
      setConnectingPlatform(null);
      setConnectingProfile(null);
    }
  };

  return { handleYouTubeConnect, handleYouTubeCallback };
}
