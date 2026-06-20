import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("Missing session_id");
    }

    logStep("Verifying session", { session_id, userId: user.id });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error("Session not found");
    }

    logStep("Session retrieved", { 
      status: session.payment_status, 
      metadata: session.metadata 
    });

    // Verify the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: "Payment not completed" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credits = parseInt(session.metadata?.credits || "0");
    const productType = session.metadata?.product_type;

    if (credits <= 0) {
      throw new Error("Invalid credit amount");
    }

    // Check if this session has already been processed
    const { data: existingTx } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existingTx) {
      logStep("Session already processed", { transactionId: existingTx.id });
      
      // Get current balance
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true, 
          already_processed: true,
          credits_added: credits,
          new_balance: currentCredits?.balance || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add credits to user's balance
    const { data: newBalance, error: creditError } = await supabase.rpc("add_user_credits", {
      p_user_id: user.id,
      p_amount: credits,
      p_transaction_type: "purchase",
      p_description: `Purchased ${productType}`,
      p_stripe_session_id: session_id,
    });

    if (creditError) {
      logStep("Error adding credits", { error: creditError });
      throw new Error("Failed to add credits to balance");
    }

    logStep("Credits added successfully", { credits, newBalance });

    // Send confirmation email
    try {
      const emailResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/send-subscription-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "credits_purchased",
            user_id: user.id,
            data: {
              credits: credits,
              new_balance: newBalance,
              product_type: productType,
            },
          }),
        }
      );

      if (emailResponse.ok) {
        logStep("Credit purchase email sent");
      } else {
        logStep("Failed to send credit purchase email", await emailResponse.text());
      }
    } catch (emailErr) {
      logStep("Error sending email", { error: emailErr });
      // Don't fail the whole request if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits_added: credits,
        new_balance: newBalance,
        product_type: productType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
