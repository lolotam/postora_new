import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FACEBOOK_APP_ID = Deno.env.get("FACEBOOK_APP_ID");
const FACEBOOK_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET");

const GRAPH_VERSION = "v22.0";

interface ConfigCheck {
  mode: "cloud_api" | "coexistence";
  setting_key: string;
  config_id: string | null;
  valid: boolean;
  name?: string;
  feature_type?: string;
  error?: string;
  hint?: string;
}

async function checkConfig(
  mode: "cloud_api" | "coexistence",
  settingKey: string,
  configId: string | null,
  appToken: string,
): Promise<ConfigCheck> {
  if (!configId) {
    return {
      mode,
      setting_key: settingKey,
      config_id: null,
      valid: false,
      error: `${settingKey} is not set in app_settings`,
    };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(
      configId,
    )}?fields=id,name,login_settings&access_token=${encodeURIComponent(appToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      const msg: string = data?.error?.message || `Meta returned HTTP ${res.status}`;
      const isUnsupportedGet = /Unsupported get request|does not exist|cannot be loaded due to missing permissions/i.test(msg);
      const hint = isUnsupportedGet
        ? "Meta cannot read this Configuration ID with the current FACEBOOK_APP_ID / FACEBOOK_APP_SECRET. The configuration was likely created under a different Meta App or Business Manager. Either (a) recreate the configuration in the same Meta App that owns FACEBOOK_APP_ID, or (b) update FACEBOOK_APP_ID/SECRET to the app that owns this configuration. Also confirm the app has WhatsApp + Facebook Login for Business enabled and Tech Provider/BSP approval."
        : undefined;
      return {
        mode,
        setting_key: settingKey,
        config_id: configId,
        valid: false,
        error: msg,
        hint,
      };
    }

    const featureType =
      data?.login_settings?.feature_type ||
      data?.login_settings?.featureType ||
      undefined;

    return {
      mode,
      setting_key: settingKey,
      config_id: configId,
      valid: true,
      name: data?.name || "(unnamed configuration)",
      feature_type: featureType,
    };
  } catch (e) {
    return {
      mode,
      setting_key: settingKey,
      config_id: configId,
      valid: false,
      error: e instanceof Error ? e.message : "Network error contacting Meta",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate caller is an authenticated admin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !roleRow) {
      return new Response(
        JSON.stringify({ error: "Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return new Response(
        JSON.stringify({
          error:
            "FACEBOOK_APP_ID and/or FACEBOOK_APP_SECRET are not configured as edge function secrets",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read both config IDs from app_settings
    const { data: settings, error: settingsErr } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["META_WHATSAPP_CONFIG_ID", "META_WHATSAPP_COEXISTENCE_CONFIG_ID"]);

    if (settingsErr) {
      return new Response(
        JSON.stringify({ error: `Failed to read app_settings: ${settingsErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const extract = (key: string): string | null => {
      const row = settings?.find((s) => s.key === key);
      if (!row) return null;
      const v = row.value as unknown;
      if (typeof v === "string") return v.trim() || null;
      if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
        const inner = (v as Record<string, unknown>).value;
        if (typeof inner === "string") return inner.trim() || null;
      }
      // JSONB stringified primitive (e.g., "1234")
      try {
        const s = JSON.stringify(v).replace(/^"|"$/g, "");
        return s.trim() || null;
      } catch {
        return null;
      }
    };

    const cloudId = extract("META_WHATSAPP_CONFIG_ID");
    const coexId = extract("META_WHATSAPP_COEXISTENCE_CONFIG_ID");

    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;

    const [cloudResult, coexResult] = await Promise.all([
      checkConfig("cloud_api", "META_WHATSAPP_CONFIG_ID", cloudId, appToken),
      checkConfig(
        "coexistence",
        "META_WHATSAPP_COEXISTENCE_CONFIG_ID",
        coexId,
        appToken,
      ),
    ]);

    return new Response(
      JSON.stringify({
        cloud_api: cloudResult,
        coexistence: coexResult,
        all_valid: cloudResult.valid && coexResult.valid,
        facebook_app_id: FACEBOOK_APP_ID,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unexpected server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
