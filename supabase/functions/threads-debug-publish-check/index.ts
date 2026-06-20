// Admin-only Threads diagnostic dry-run.
// Returns redacted token info, scopes, capabilities, sample payload preview,
// and a /me echo from Meta. Does NOT publish anything.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  account_id: string;
  hypothetical?: "text" | "image" | "video" | "carousel";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Admin gate
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    if (!body.account_id) {
      return new Response(JSON.stringify({ error: "account_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error: accErr } = await admin
      .from("social_accounts")
      .select("id, platform, platform_user_id, platform_username, access_token, account_metadata, is_active")
      .eq("id", body.account_id)
      .eq("platform", "threads")
      .maybeSingle();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Threads account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = account.access_token || "";
    const tokenPrefix = token.slice(0, 6);
    const tokenLen = token.length;
    const meta = (account.account_metadata as any) || {};
    const caps = meta.capabilities || {};
    const scopes = meta.granted_scopes || meta.capability_probe?.granted_scopes || null;
    const probedAt = meta.capability_probed_at || null;

    // Build hypothetical sample payload
    const hypothetical = body.hypothetical || "image";
    const samplePayload: Record<string, string> = {
      access_token: `[redacted:${tokenLen}c:${tokenPrefix}…]`,
      text: "Sample post for diagnostic dry-run",
      media_type:
        hypothetical === "text"
          ? "TEXT"
          : hypothetical === "video"
          ? "VIDEO"
          : hypothetical === "carousel"
          ? "CAROUSEL"
          : "IMAGE",
    };
    if (hypothetical === "image") samplePayload.image_url = "https://example.com/sample.jpg";
    if (hypothetical === "video") samplePayload.video_url = "https://example.com/sample.mp4";

    // Cross-share guard preview
    const crossShareEligible =
      caps.canCrossShareToIg !== false &&
      hypothetical !== "video" &&
      hypothetical !== "carousel";
    if (crossShareEligible) samplePayload.crossreshare_to_ig = "true";

    // /me echo (safe — token-bound profile read)
    let meStatus = 0;
    let meBody: any = null;
    try {
      const meRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${encodeURIComponent(token)}`
      );
      meStatus = meRes.status;
      meBody = await meRes.json();
    } catch (e) {
      meBody = { fetch_error: String(e) };
    }

    return new Response(
      JSON.stringify({
        ok: true,
        account: {
          id: account.id,
          platform_username: account.platform_username,
          is_active: account.is_active,
        },
        token: { length: tokenLen, prefix: tokenPrefix + "…" },
        scopes,
        capabilities: caps,
        capability_probed_at: probedAt,
        hypothetical,
        crossShareWouldBeSent: crossShareEligible && caps.canCrossShareToIg !== false,
        crossShareSkipReason: !crossShareEligible
          ? hypothetical === "video"
            ? "video_unsupported_by_meta"
            : hypothetical === "carousel"
            ? "carousel_unsupported_by_meta"
            : null
          : caps.canCrossShareToIg === false
          ? "stale_token_missing_scope"
          : null,
        samplePayload,
        meEndpointStatus: meStatus,
        meEndpointBody: meBody,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
