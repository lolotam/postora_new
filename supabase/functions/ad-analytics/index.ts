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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, social_account_id } = body;

    // Get access token and account metadata
    const { data: account } = await supabase
      .from("social_accounts")
      .select("access_token, platform_user_id, platform, account_metadata")
      .eq("id", social_account_id)
      .eq("user_id", userId)
      .single();

    if (!account?.access_token) {
      return new Response(JSON.stringify({ error: "Social account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token: accessToken, platform_user_id: platformUserId } = account;
    // User-level token for ad account queries (me/adaccounts requires user token, not page token)
    const userToken = (account.account_metadata as Record<string, unknown>)?.user_token as string | undefined;
    let result: unknown;

    switch (action) {
      case "get_ad_accounts": {
        // me/adaccounts requires a user-level token, not a page token
        const adToken = userToken || accessToken;
        if (!userToken) {
          console.warn("No user_token found in account_metadata, falling back to page token (may fail)");
        }
        const url = `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,account_status,currency,balance,amount_spent&access_token=${adToken}`;
        const res = await fetch(url);
        result = await res.json();
        break;
      }

      case "get_campaigns": {
        const { ad_account_id, date_preset = "last_30d" } = body;
        if (!ad_account_id) {
          return new Response(JSON.stringify({ error: "ad_account_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${ad_account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(${date_preset}){impressions,reach,clicks,spend,cpc,cpm,ctr,actions}&limit=50&access_token=${accessToken}`;
        const res = await fetch(url);
        result = await res.json();
        break;
      }

      case "get_adsets": {
        const { campaign_id, date_preset = "last_30d" } = body;
        if (!campaign_id) {
          return new Response(JSON.stringify({ error: "campaign_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${campaign_id}/adsets?fields=id,name,status,targeting,daily_budget,lifetime_budget,insights.date_preset(${date_preset}){impressions,reach,clicks,spend,cpc,cpm,ctr,actions}&limit=50&access_token=${accessToken}`;
        const res = await fetch(url);
        result = await res.json();
        break;
      }

      case "get_ads": {
        const { adset_id, date_preset = "last_30d" } = body;
        if (!adset_id) {
          return new Response(JSON.stringify({ error: "adset_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${adset_id}/ads?fields=id,name,status,creative{title,body,image_url,thumbnail_url},insights.date_preset(${date_preset}){impressions,reach,clicks,spend,cpc,cpm,ctr,actions}&limit=50&access_token=${accessToken}`;
        const res = await fetch(url);
        result = await res.json();
        break;
      }

      case "get_account_insights": {
        const { ad_account_id, date_preset = "last_30d", time_increment = 1 } = body;
        if (!ad_account_id) {
          return new Response(JSON.stringify({ error: "ad_account_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${ad_account_id}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type&date_preset=${date_preset}&time_increment=${time_increment}&access_token=${accessToken}`;
        const res = await fetch(url);
        result = await res.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ad Analytics API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
