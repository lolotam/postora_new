import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  appName: string;
  appLogo: string | null;
  appFavicon: string | null;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings-public"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["app_name", "app_logo", "app_favicon"]);

      if (error) throw error;

      const settings: AppSettings = {
        appName: "Postora",
        appLogo: null,
        appFavicon: null,
      };

      for (const setting of data || []) {
        try {
          const value = typeof setting.value === "string" 
            ? JSON.parse(setting.value) 
            : setting.value;
          
          if (setting.key === "app_name" && value) {
            settings.appName = String(value);
          } else if (setting.key === "app_logo" && value) {
            settings.appLogo = String(value);
          } else if (setting.key === "app_favicon" && value) {
            settings.appFavicon = String(value);
          }
        } catch {
          // Use default values
        }
      }

      return settings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
