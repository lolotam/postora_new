import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CheckMFARequest {
  email: string;
}

interface CheckMFAResponse {
  hasMFA: boolean;
  factorId?: string;
  userExists: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email }: CheckMFARequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking MFA status for: ${email}`);

    // Create admin client to check user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`User not found: ${email}`);
      return new Response(
        JSON.stringify({ 
          hasMFA: false, 
          userExists: false 
        } as CheckMFAResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's MFA factors
    const { data: factorsData, error: factorsError } = await supabase.auth.admin.mfa.listFactors({
      userId: user.id,
    });

    if (factorsError) {
      console.error("Error getting MFA factors:", factorsError);
      throw factorsError;
    }

    const verifiedFactors = factorsData?.factors?.filter(f => f.status === "verified") || [];
    const hasMFA = verifiedFactors.length > 0;
    const factorId = verifiedFactors[0]?.id;

    console.log(`User ${email} MFA status: ${hasMFA ? "enabled" : "disabled"}`);

    return new Response(
      JSON.stringify({ 
        hasMFA, 
        factorId,
        userExists: true 
      } as CheckMFAResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-user-mfa:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
