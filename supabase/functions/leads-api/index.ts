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
    const { action, social_account_id, page_id, form_id } = body;

    let accessToken: string | null = null;
    if (social_account_id) {
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
      accessToken = account.access_token;
    }

    let result: unknown;

    switch (action) {
      case "sync_lead_forms": {
        if (!page_id || !accessToken) {
          return new Response(JSON.stringify({ error: "page_id and social_account_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${page_id}/leadgen_forms?fields=id,name,status,created_time&access_token=${accessToken}`;
        const res = await fetch(url);
        const formsData = await res.json();

        if (formsData.error) {
          return new Response(JSON.stringify({ error: formsData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert forms into DB
        const forms = formsData.data || [];
        for (const form of forms) {
          await supabase.from("lead_forms").upsert({
            user_id: user.id,
            social_account_id,
            page_id,
            form_id: form.id,
            form_name: form.name,
            form_status: form.status || "active",
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "form_id" });
        }

        result = { synced: forms.length, forms };
        break;
      }

      case "get_leads": {
        if (!form_id || !accessToken) {
          return new Response(JSON.stringify({ error: "form_id and social_account_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${form_id}/leads?fields=id,created_time,field_data&limit=100&access_token=${accessToken}`;
        const res = await fetch(url);
        const leadsData = await res.json();

        if (leadsData.error) {
          return new Response(JSON.stringify({ error: leadsData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get the internal form record
        const { data: formRecord } = await supabase
          .from("lead_forms")
          .select("id")
          .eq("form_id", form_id)
          .eq("user_id", user.id)
          .single();

        if (formRecord) {
          const leads = leadsData.data || [];
          for (const lead of leads) {
            const leadDataObj: Record<string, string> = {};
            for (const field of lead.field_data || []) {
              leadDataObj[field.name] = field.values?.[0] || "";
            }

            await supabase.from("leads").upsert({
              user_id: user.id,
              form_id: formRecord.id,
              meta_lead_id: lead.id,
              lead_data: leadDataObj,
              created_at: lead.created_time,
            }, { onConflict: "meta_lead_id" });
          }
        }

        result = leadsData;
        break;
      }

      case "get_lead_form_fields": {
        if (!form_id || !accessToken) {
          return new Response(JSON.stringify({ error: "form_id and social_account_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const url = `${GRAPH_API_BASE}/${form_id}?fields=id,name,questions&access_token=${accessToken}`;
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
    console.error("Leads API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
