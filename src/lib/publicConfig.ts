import { supabase } from "@/integrations/supabase/client";

interface PublicConfig {
  FACEBOOK_APP_ID: string;
  THREADS_APP_ID: string;
  INSTAGRAM_APP_ID: string;
  TIKTOK_CLIENT_KEY: string;
  PINTEREST_CLIENT_ID: string;
  LINKEDIN_CLIENT_ID: string;
  GOOGLE_CLIENT_ID: string;
  TWITTER_CLIENT_ID: string;
}

let cachedConfig: PublicConfig | null = null;
let fetchPromise: Promise<PublicConfig> | null = null;

/**
 * Fetches public app IDs from the get-public-config edge function.
 * Results are cached in memory for the lifetime of the page.
 */
export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-public-config", {
        method: "GET",
      });
      if (error) throw error;
      cachedConfig = data as PublicConfig;
      return cachedConfig;
    } catch (err) {
      console.error("Failed to fetch public config:", err);
      // Return empty defaults so the app doesn't crash
      cachedConfig = {
        FACEBOOK_APP_ID: "",
        THREADS_APP_ID: "",
        INSTAGRAM_APP_ID: "",
        TIKTOK_CLIENT_KEY: "",
        PINTEREST_CLIENT_ID: "",
        LINKEDIN_CLIENT_ID: "",
        GOOGLE_CLIENT_ID: "",
        TWITTER_CLIENT_ID: "",
      };
      return cachedConfig;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Returns the cached config synchronously, or null if not yet fetched.
 */
export function getCachedPublicConfig(): PublicConfig | null {
  return cachedConfig;
}
