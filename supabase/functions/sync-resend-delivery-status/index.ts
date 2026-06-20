import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ResendEmailStatus =
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "delivery_delayed"
  | "queued"
  | "scheduled"
  | string;

function mapResendStatusToInboxStatus(status: ResendEmailStatus): string {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "delivered";
  if (s === "bounced") return "bounced";
  if (s === "complained") return "complaint";
  if (s === "failed") return "failed";

  // These represent "still in-flight" states
  if (s === "sent" || s === "queued" || s === "scheduled" || s === "delivery_delayed") {
    return "sent";
  }

  // Unknown: keep as-is (but still return something safe)
  return "sent";
}

async function fetchResendEmail(resendId: string, resendApiKey: string) {
  const resp = await fetch(`https://api.resend.com/emails/${resendId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
  });

  const jsonText = await resp.text();
  let json: any = null;
  try {
    json = jsonText ? JSON.parse(jsonText) : null;
  } catch {
    json = { raw: jsonText };
  }

  if (!resp.ok) {
    return { ok: false, status: resp.status, data: json };
  }

  const data = json?.data ?? json;
  return { ok: true, status: resp.status, data };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      messageIds?: string[];
      limit?: number;
    };

    const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);

    let query = supabase
      .from("admin_inbox_messages")
      .select("id, resend_id, status, metadata")
      .eq("direction", "outbound")
      .in("status", ["sent", "processing"])
      .not("resend_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (Array.isArray(body.messageIds) && body.messageIds.length > 0) {
      query = query.in("id", body.messageIds);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error("[SYNC-RESEND] Query error:", messagesError);
      return new Response(JSON.stringify({ error: messagesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{
      id: string;
      resend_id: string;
      old_status: string;
      new_status: string;
      updated: boolean;
      error?: string;
    }> = [];

    for (const msg of messages ?? []) {
      const resendId = msg.resend_id as string;
      const oldStatus = (msg.status as string) || "sent";

      try {
        const fetched = await fetchResendEmail(resendId, resendApiKey);

        if (!fetched.ok) {
          console.error("[SYNC-RESEND] Resend fetch failed:", resendId, fetched.status, fetched.data);
          results.push({
            id: msg.id,
            resend_id: resendId,
            old_status: oldStatus,
            new_status: oldStatus,
            updated: false,
            error: `Resend API error (${fetched.status})`,
          });
          continue;
        }

        const resendStatus: ResendEmailStatus =
          fetched.data?.status || fetched.data?.last_event || fetched.data?.lastEvent || "sent";

        const mapped = mapResendStatusToInboxStatus(resendStatus);

        const updated = mapped !== oldStatus && !(oldStatus === "sent" && mapped === "sent");

        if (updated) {
          const currentMetadata = (msg.metadata as Record<string, unknown> | null) || {};
          const nextMetadata = {
            ...currentMetadata,
            resend_last_status: resendStatus,
            resend_last_synced_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from("admin_inbox_messages")
            .update({ status: mapped, metadata: nextMetadata })
            .eq("id", msg.id);

          if (updateError) {
            console.error("[SYNC-RESEND] Update failed:", msg.id, updateError);
            results.push({
              id: msg.id,
              resend_id: resendId,
              old_status: oldStatus,
              new_status: oldStatus,
              updated: false,
              error: updateError.message,
            });
          } else {
            results.push({
              id: msg.id,
              resend_id: resendId,
              old_status: oldStatus,
              new_status: mapped,
              updated: true,
            });
          }
        } else {
          results.push({
            id: msg.id,
            resend_id: resendId,
            old_status: oldStatus,
            new_status: mapped,
            updated: false,
          });
        }
      } catch (e: any) {
        console.error("[SYNC-RESEND] Unexpected error:", msg.id, e);
        results.push({
          id: msg.id,
          resend_id: resendId,
          old_status: oldStatus,
          new_status: oldStatus,
          updated: false,
          error: e?.message || "Unknown error",
        });
      }
    }

    const summary = {
      checked: results.length,
      updated: results.filter((r) => r.updated).length,
      errors: results.filter((r) => r.error).length,
      results,
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[SYNC-RESEND] Fatal error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
