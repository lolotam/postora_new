import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("Missing user_id");
    }

    console.log("Fetching Pinterest boards for user:", user_id);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the user's Pinterest account(s) - handle multiple accounts
    const { data: accounts, error: accountError } = await supabase
      .from("social_accounts")
      .select("access_token, platform_username")
      .eq("user_id", user_id)
      .eq("platform", "pinterest")
      .eq("is_active", true);

    if (accountError) {
      console.error("Database error:", accountError);
      throw new Error("Failed to fetch Pinterest account");
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ boards: [], error: "No Pinterest account connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the first active account (or could aggregate from all)
    const account = accounts[0];

    // Fetch boards from Pinterest API
    const boardsResponse = await fetch("https://api.pinterest.com/v5/boards", {
      headers: {
        "Authorization": `Bearer ${account.access_token}`,
      },
    });

    const boardsData = await boardsResponse.json();
    console.log("Pinterest boards response:", boardsResponse.status);

    if (!boardsResponse.ok) {
      console.error("Pinterest API error:", boardsData);
      
      if (boardsResponse.status === 401) {
        throw new Error("Pinterest token expired. Please reconnect your account.");
      }
      
      throw new Error(boardsData.message || "Failed to fetch Pinterest boards");
    }

    const boards = (boardsData.items || []).map((board: any) => ({
      id: board.id,
      name: board.name,
      description: board.description,
      privacy: board.privacy,
      pin_count: board.pin_count,
      image_url: board.media?.image_cover_url || null,
    }));

    console.log(`Found ${boards.length} Pinterest boards`);

    return new Response(JSON.stringify({ boards, username: account.platform_username }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Pinterest boards error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, boards: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
