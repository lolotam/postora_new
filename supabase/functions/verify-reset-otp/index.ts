import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
  mfaCode: string;
  newPassword: string;
}

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// MFA verification is handled through Supabase's challenge/verify API
// We don't need a custom TOTP implementation

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, mfaCode, newPassword }: VerifyOTPRequest = await req.json();

    // Validate inputs
    if (!email || !otp || !mfaCode || !newPassword) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
      return new Response(
        JSON.stringify({ error: "MFA code must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.toLowerCase();

    // Find the OTP record
    const otpHash = await hashOTP(otp);
    const { data: otpRecord, error: otpError } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code_hash", otpHash)
      .eq("used", false)
      .single();

    if (otpError || !otpRecord) {
      console.error("OTP lookup error:", otpError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase
        .from("password_reset_otps")
        .delete()
        .eq("id", otpRecord.id);
      
      return new Response(
        JSON.stringify({ error: "Reset code has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      await supabase
        .from("password_reset_otps")
        .delete()
        .eq("id", otpRecord.id);
      
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempt counter
    await supabase
      .from("password_reset_otps")
      .update({ attempts: (otpRecord.attempts || 0) + 1 })
      .eq("id", otpRecord.id);

    // Find the user via our profiles table (listUsers is paginated and may miss users)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Reset service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.id) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;

    // Get MFA factors
    const { data: factors } = await supabase.auth.admin.mfa.listFactors({ userId });
    const verifiedFactor = factors?.factors?.find((f: { factor_type: string; status: string }) => 
      f.factor_type === "totp" && f.status === "verified"
    );

    if (!verifiedFactor) {
      return new Response(
        JSON.stringify({ error: "MFA is not enabled for this account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify MFA using Supabase Auth's factor challenge/verify endpoints.
    // Note: Supabase's admin SDK doesn't currently expose these calls, so we use the Auth endpoints.
    const factorId = verifiedFactor.id;

    const challengeResponse = await fetch(`${supabaseUrl}/auth/v1/factors/${factorId}/challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!challengeResponse.ok) {
      const details = await challengeResponse.text();
      console.error("Failed to create MFA challenge:", challengeResponse.status, details);
      return new Response(
        JSON.stringify({ error: "MFA verification is temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const challengeData = await challengeResponse.json();

    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/factors/${factorId}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        challenge_id: challengeData.id,
        code: mfaCode,
      }),
    });

    if (!verifyResponse.ok) {
      const details = await verifyResponse.text();
      console.error("MFA verification failed:", verifyResponse.status, details);
      return new Response(
        JSON.stringify({ error: "Invalid MFA code. Please check your authenticator app." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabase
      .from("password_reset_otps")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up used OTPs
    await supabase.rpc("cleanup_expired_otps");

    console.log(`Password reset successful for ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully. You can now sign in with your new password." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-reset-otp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
