import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, social_account_id, ad_account_id } = body;

    const { data: account } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("id", social_account_id)
      .eq("user_id", user.id)
      .single();

    if (!account?.access_token) {
      return new Response(JSON.stringify({ error: "Social account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = account.access_token;
    let result: unknown;

    switch (action) {
      case "create_campaign": {
        const { name, objective, status: campStatus = "PAUSED", daily_budget, special_ad_categories = [] } = body;
        if (!ad_account_id || !name || !objective) {
          return new Response(JSON.stringify({ error: "ad_account_id, name, and objective required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const params = new URLSearchParams({
          name,
          objective,
          status: campStatus,
          access_token: accessToken,
        });
        if (daily_budget) params.set("daily_budget", daily_budget);
        if (special_ad_categories.length) params.set("special_ad_categories", JSON.stringify(special_ad_categories));

        const res = await fetch(`${GRAPH_API_BASE}/${ad_account_id}/campaigns`, {
          method: "POST",
          body: params,
        });
        result = await res.json();
        break;
      }

      case "update_campaign_status": {
        const { campaign_id, status: newStatus } = body;
        if (!campaign_id || !newStatus) {
          return new Response(JSON.stringify({ error: "campaign_id and status required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const res = await fetch(`${GRAPH_API_BASE}/${campaign_id}`, {
          method: "POST",
          body: new URLSearchParams({ status: newStatus, access_token: accessToken }),
        });
        result = await res.json();
        break;
      }

      case "create_adset": {
        const { campaign_id, name, daily_budget: adsetBudget, billing_event = "IMPRESSIONS", optimization_goal, targeting, start_time } = body;
        if (!ad_account_id || !campaign_id || !name || !optimization_goal || !targeting) {
          return new Response(JSON.stringify({ error: "Missing required adset fields" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const params = new URLSearchParams({
          campaign_id,
          name,
          billing_event,
          optimization_goal,
          targeting: JSON.stringify(targeting),
          status: "PAUSED",
          access_token: accessToken,
        });
        if (adsetBudget) params.set("daily_budget", adsetBudget);
        if (start_time) params.set("start_time", start_time);

        const res = await fetch(`${GRAPH_API_BASE}/${ad_account_id}/adsets`, {
          method: "POST",
          body: params,
        });
        result = await res.json();
        break;
      }

      case "delete_campaign": {
        const { campaign_id } = body;
        if (!campaign_id) {
          return new Response(JSON.stringify({ error: "campaign_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const res = await fetch(`${GRAPH_API_BASE}/${campaign_id}`, {
          method: "DELETE",
          body: new URLSearchParams({ access_token: accessToken }),
        });
        result = await res.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ad Manager API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
