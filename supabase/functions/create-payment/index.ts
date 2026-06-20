import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

// One-time purchase products with volume discounts
// price_1SpPCO0hJJ11XlNO7S1yrgRE = 100 credits ($9)
const CREDIT_PACKS = {
  credits_50: {
    price_id: "price_1TMF1c07RNvknHFcL81qVgkC", // 100 credits price (live)
    credits: 50,
    name: "50 AI Credits",
  },
  credits_100: {
    price_id: "price_1TMF1c07RNvknHFcL81qVgkC", // 100 credits price (live)
    credits: 100,
    name: "100 AI Credits",
  },
  credits_200: {
    price_id: "price_1TMF1c07RNvknHFcL81qVgkC", // 100 credits price (live)
    credits: 200,
    name: "200 AI Credits",
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your secrets.");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { product_type, quantity = 1 } = await req.json();

    if (!product_type) {
      throw new Error("Missing product_type");
    }

    logStep("Payment request", { product_type, quantity });

    // Get the product configuration
    const productConfig = CREDIT_PACKS[product_type as keyof typeof CREDIT_PACKS];
    if (!productConfig) {
      throw new Error(`Unknown product type: ${product_type}`);
    }

    logStep("Product found", productConfig);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // Check for existing subscription with customer ID
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      // Check if customer exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: profile?.email || user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: profile?.email || user.email,
          name: profile?.full_name || undefined,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;
      }
    }

    logStep("Customer resolved", { customerId });

    // Get the origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://postora.cloud";

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: productConfig.price_id,
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&product=${product_type}&credits=${productConfig.credits * quantity}`,
      cancel_url: `${origin}/credits`,
      metadata: {
        user_id: user.id,
        product_type: product_type,
        credits: (productConfig.credits * quantity).toString(),
        quantity: quantity.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id,
        credits: productConfig.credits * quantity,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
