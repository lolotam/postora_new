import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppTpStatus = "not_started" | "pending" | "approved";

export const WHATSAPP_TP_STATUS_KEY = "WHATSAPP_TP_STATUS";

function parseStatus(raw: unknown): WhatsAppTpStatus {
  let v: unknown = raw;
  if (typeof v === "object" && v !== null && "value" in (v as Record<string, unknown>)) {
    v = (v as Record<string, unknown>).value;
  }
  if (typeof v === "string") {
    const s = v.replace(/^"|"$/g, "");
    if (s === "approved" || s === "pending" || s === "not_started") return s;
  }
  return "approved";
}

/**
 * Reads the global WhatsApp Tech Provider approval status from app_settings.
 * Defaults to "approved" since the Meta business is already an approved Tech Provider.
 * Admins can flip it to "pending" or "not_started" if needed.
 */
export function useWhatsAppTpStatus() {
  const query = useQuery({
    queryKey: ["app_settings", WHATSAPP_TP_STATUS_KEY],
    queryFn: async (): Promise<WhatsAppTpStatus> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", WHATSAPP_TP_STATUS_KEY)
        .maybeSingle();
      if (error) throw error;
      return parseStatus(data?.value);
    },
    staleTime: 60_000,
  });

  return {
    status: query.data ?? "approved",
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
