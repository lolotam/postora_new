import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { encodeOAuthState } from "@/lib/oauthState";

const PINTEREST_PRODUCTION_ORIGIN = "https://postora.cloud";
const PINTEREST_REDIRECT_URI = `${PINTEREST_PRODUCTION_ORIGIN}/oauth/pinterest/callback`;

export function usePinterestOAuth() {
  const { user } = useAuth();

  const handlePinterestConnect = async (profileId: string) => {
    if (!user) throw new Error("Not authenticated");
    const state = encodeOAuthState({ user_id: user.id, social_profile_id: profileId });
    const { data, error } = await supabase.functions.invoke("pinterest-oauth", {
      body: { action: "authorize", redirect_uri: PINTEREST_REDIRECT_URI, state },
    });
    if (error) throw error;
    if (data?.url) { window.location.href = data.url; } else { throw new Error("No authorization URL received"); }
  };

  return { handlePinterestConnect };
}
