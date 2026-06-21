import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMessagingAccounts } from "./useMessaging";

async function callMessagingApi(action: string, body: Record<string, unknown>) {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
    if (!session?.access_token) throw new Error("Not authenticated");
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/messaging-api`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
    body: JSON.stringify({ action, ...body }),
  };
  let res: Response | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(url, init);
      if (res.status !== 502 && res.status !== 503 && res.status !== 504) break;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  if (!res) throw (lastErr instanceof Error ? lastErr : new Error("Network error"));
  const data = await res.json().catch(() => ({ error: res!.statusText }));
  if (data.error_type) throw new Error(data.error);
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  image_url?: string;
  url?: string;
  retailer_id?: string;
  availability?: string;
}

export function useWhatsAppCatalog() {
  const { accounts } = useMessagingAccounts();
  const waAccount = accounts.find(a => a.platform === "whatsapp");

  const catalogQuery = useQuery({
    queryKey: ["whatsapp-catalog", waAccount?.id],
    queryFn: async () => {
      if (!waAccount) return null;
      const data = await callMessagingApi("whatsapp_get_catalog", {
        social_account_id: waAccount.id,
      });
      return data;
    },
    enabled: !!waAccount,
  });

  const productsQuery = useQuery({
    queryKey: ["whatsapp-products", waAccount?.id, catalogQuery.data?.catalog_id],
    queryFn: async () => {
      if (!waAccount || !catalogQuery.data?.catalog_id) return [];
      const data = await callMessagingApi("whatsapp_get_products", {
        social_account_id: waAccount.id,
        catalog_id: catalogQuery.data.catalog_id,
      });
      return (data.products || []) as CatalogProduct[];
    },
    enabled: !!waAccount && !!catalogQuery.data?.catalog_id,
  });

  return {
    catalog: catalogQuery.data,
    products: productsQuery.data || [],
    isLoading: catalogQuery.isLoading || productsQuery.isLoading,
    error: catalogQuery.error || productsQuery.error,
    waAccount,
  };
}
