import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsOptions, jsonResponse, errorResponse, unauthorizedResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions();

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse();

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return unauthorizedResponse();

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return unauthorizedResponse("Admin access required");

    if (req.method === "GET") {
      // Fetch all cron jobs
      const { data: jobs, error: jobsError } = await supabaseAdmin.rpc("get_cron_jobs");
      if (jobsError) {
        console.error("Error fetching cron jobs:", jobsError);
        // Fallback: try direct SQL via a simpler approach
        return errorResponse("Failed to fetch cron jobs: " + jobsError.message);
      }

      return jsonResponse({ jobs: jobs || [] });
    }

    if (req.method === "POST") {
      const { jobid, active } = await req.json();
      if (typeof jobid !== "number" || typeof active !== "boolean") {
        return errorResponse("Invalid request: jobid (number) and active (boolean) required", 400);
      }

      const { data, error: toggleError } = await supabaseAdmin.rpc("toggle_cron_job", {
        _jobid: jobid,
        _active: active,
      });

      if (toggleError) {
        console.error("Error toggling cron job:", toggleError);
        return errorResponse("Failed to toggle cron job: " + toggleError.message);
      }

      return jsonResponse({ success: true, jobid, active });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("manage-cron-jobs error:", err);
    return errorResponse(err.message || "Internal server error");
  }
});
