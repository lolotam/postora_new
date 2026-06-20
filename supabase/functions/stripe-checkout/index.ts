import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

// Price IDs for each plan
const PRICE_IDS = {
  pro: {
    monthly: "price_1TMF1W07RNvknHFcjDqtIPiG",  // $19.99/month (live)
    yearly: "price_1TMF1W07RNvknHFce9mxczSu",   // $199.99/year (live)
  },
  business: {
    monthly: "price_1TMF1X07RNvknHFcCXqavjD7",  // $49.99/month (live)
    yearly: "price_1TMF1Y07RNvknHFcnV3Lan1K",   // $499.99/year (live)
  },
};

// Promotional price IDs for first 100 users (live)
const PROMO_PRICE_IDS = {
  pro: {
    monthly: "price_1TMF1a07RNvknHFcuZUDzZSb",  // $5.00/month promo (live)
    yearly: "price_1TMF1b07RNvknHFckI9I49oD",   // $99.99/year promo (live)
  },
};

const PROMO_USER_LIMIT = 100;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
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

    const { plan_id, price_type, coupon_code, referral_code } = await req.json();

    if (!plan_id || !price_type) {
      throw new Error("Missing plan_id or price_type");
    }

    logStep("Checkout request", { plan_id, price_type, coupon_code, referral_code });

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    logStep("Plan found", { slug: plan.slug, name: plan.name });

    // Get the price ID based on plan slug and billing type
    const priceConfig = PRICE_IDS[plan.slug as keyof typeof PRICE_IDS];
    if (!priceConfig) {
      throw new Error(`No price configuration found for plan: ${plan.slug}`);
    }

    // Check if promotional pricing applies (first 100 users for Pro plan)
    let priceId = price_type === "yearly" ? priceConfig.yearly : priceConfig.monthly;
    let promoApplied = false;

    if (plan.slug === "pro" && PROMO_PRICE_IDS.pro) {
      try {
        // Count total active subscriptions in Stripe
        const allSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        const totalActiveSubscribers = allSubs.data.length;
        logStep("Active subscriber count", { totalActiveSubscribers, limit: PROMO_USER_LIMIT });

        if (totalActiveSubscribers < PROMO_USER_LIMIT) {
          priceId = price_type === "yearly" 
            ? PROMO_PRICE_IDS.pro.yearly 
            : PROMO_PRICE_IDS.pro.monthly;
          promoApplied = true;
          logStep("Promotional price applied", { priceId, remainingSlots: PROMO_USER_LIMIT - totalActiveSubscribers });
        }
      } catch (promoErr) {
        logStep("Error checking promo eligibility, using regular price", { error: String(promoErr) });
      }
    }

    logStep("Using price ID", { priceId, priceType: price_type, promoApplied });

    // Check for existing active subscription in Stripe to prevent duplicates
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const existingCustomerId = existingCustomers.data[0].id;
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: existingCustomerId,
        status: "active",
        limit: 1,
      });

      if (activeSubscriptions.data.length > 0) {
        const activeSub = activeSubscriptions.data[0];
        logStep("User already has active subscription", { 
          subscriptionId: activeSub.id,
          status: activeSub.status,
        });
        throw new Error("You already have an active subscription. Please manage your existing subscription from the billing portal.");
      }
    }

    // Validate coupon if provided
    let validCoupon = null;
    let discountAmount = 0;
    let discountPercent = 0;

    if (coupon_code) {
      logStep("Validating coupon", { couponCode: coupon_code });
      
      const { data: coupon, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (couponError) {
        console.error("Coupon lookup error:", couponError);
      }

      if (coupon) {
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        // Check validity
        if (validFrom && now < validFrom) {
          throw new Error("This coupon is not yet valid");
        }
        if (validUntil && now > validUntil) {
          throw new Error("This coupon has expired");
        }
        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          throw new Error("This coupon has reached its usage limit");
        }

        validCoupon = coupon;
        discountAmount = coupon.discount_amount || 0;
        discountPercent = coupon.discount_percent || 0;
        logStep("Valid coupon found", { discountAmount, discountPercent });
      } else {
        throw new Error("Invalid or expired coupon code");
      }
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
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

    // Create Stripe coupon if we have a valid coupon
    let stripeCouponId: string | undefined;

    if (validCoupon) {
      try {
        const stripeCoupon = await stripe.coupons.create({
          ...(discountPercent > 0 
            ? { percent_off: discountPercent }
            : { amount_off: Math.round(discountAmount * 100), currency: "usd" }
          ),
          duration: "once",
          name: `Promo: ${validCoupon.code}`,
          metadata: {
            postora_coupon_id: validCoupon.id,
            postora_coupon_code: validCoupon.code,
          },
        });
        stripeCouponId = stripeCoupon.id;
        logStep("Created Stripe coupon", { stripeCouponId });
      } catch (err) {
        console.error("Failed to create Stripe coupon:", err);
      }
    }

    // Get the origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://postora.cloud";

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancel`,
      allow_promotion_codes: !stripeCouponId,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_slug: plan.slug,
        plan_name: plan.name,
        price_type: price_type,
        coupon_id: validCoupon?.id || "",
        coupon_code: validCoupon?.code || "",
        referral_code: referral_code || "",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
        },
      },
    };

    // Apply Stripe coupon if we created one
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Increment coupon usage if applied
    if (validCoupon) {
      await supabase
        .from("coupons")
        .update({ current_uses: (validCoupon.current_uses || 0) + 1 })
        .eq("id", validCoupon.id);
    }

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id,
        discount_applied: !!validCoupon,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
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
