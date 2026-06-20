import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAuthEvent } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// Email template generator functions
function generateVerificationEmail(userName: string, token: string, token_hash: string, supabase_url: string, redirect_to: string, email_action_type: string): string {
  const verifyUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border-radius: 12px;">
        <span style="font-size: 28px; font-weight: bold; color: #8b5cf6;">Postora</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #1a1a24; border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">✉️</span>
      </div>
      
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">Verify your email</h1>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Hey ${userName}! 👋
      </p>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Thanks for signing up for Postora! Please verify your email address by clicking the button below.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #71717a; font-size: 13px; line-height: 20px; text-align: center; margin: 24px 0;">
        Or use this verification code: <strong style="color: #8b5cf6; font-size: 18px; letter-spacing: 2px;">${token}</strong>
      </p>
      
      <p style="color: #71717a; font-size: 13px; line-height: 20px; text-align: center; margin: 24px 0;">
        If you didn't create a Postora account, you can safely ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px;">© 2026 Postora. All rights reserved.</p>
      <p style="color: #52525b; font-size: 12px; margin: 0;">
        <a href="https://postora.cloud/privacy" style="color: #8b5cf6; text-decoration: none;">Privacy Policy</a>
        &bull;
        <a href="https://postora.cloud/terms" style="color: #8b5cf6; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generatePasswordResetEmail(userName: string, token_hash: string, supabase_url: string, redirect_to: string, email_action_type: string): string {
  const resetUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border-radius: 12px;">
        <span style="font-size: 28px; font-weight: bold; color: #8b5cf6;">Postora</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #1a1a24; border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">🔐</span>
      </div>
      
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">Reset your password</h1>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Hey ${userName}! 👋
      </p>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        We received a request to reset the password for your Postora account. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Reset Password
        </a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <p style="color: #f59e0b; font-size: 14px; margin: 0;">⏰ This link expires in 1 hour</p>
      </div>
      
      <p style="color: #71717a; font-size: 13px; line-height: 20px; text-align: center; margin: 24px 0;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <div style="background-color: rgba(34, 197, 94, 0.1); border-radius: 8px; padding: 16px; margin-top: 24px; border: 1px solid rgba(34, 197, 94, 0.2);">
        <p style="color: #22c55e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">🛡️ Security tip</p>
        <p style="color: #a1a1aa; font-size: 13px; line-height: 20px; margin: 0;">
          After resetting your password, we recommend enabling two-factor authentication for added security.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px;">© 2026 Postora. All rights reserved.</p>
      <p style="color: #52525b; font-size: 12px; margin: 0;">
        <a href="https://postora.cloud/privacy" style="color: #8b5cf6; text-decoration: none;">Privacy Policy</a>
        &bull;
        <a href="https://postora.cloud/terms" style="color: #8b5cf6; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateMagicLinkEmail(userName: string, token: string, token_hash: string, supabase_url: string, redirect_to: string, email_action_type: string): string {
  const magicLinkUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border-radius: 12px;">
        <span style="font-size: 28px; font-weight: bold; color: #8b5cf6;">Postora</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #1a1a24; border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">🔗</span>
      </div>
      
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">Your login link</h1>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Hey ${userName}! 👋
      </p>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Click the button below to securely sign in to your Postora account. This link will expire in 1 hour.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Sign In to Postora
        </a>
      </div>
      
      <p style="color: #71717a; font-size: 13px; line-height: 20px; text-align: center; margin: 24px 0;">
        If you didn't request this login link, you can safely ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px;">© 2026 Postora. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateWelcomeEmail(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border-radius: 12px;">
        <span style="font-size: 28px; font-weight: bold; color: #8b5cf6;">Postora</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #1a1a24; border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">🎉</span>
      </div>
      
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">Welcome to Postora!</h1>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Hey ${userName}! 👋
      </p>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Welcome aboard! You're now part of the Postora family. We're excited to help you manage your social media presence across all platforms.
      </p>
      
      <div style="background-color: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid rgba(139, 92, 246, 0.2);">
        <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 12px;">🚀 Get started in 3 steps:</p>
        <p style="color: #a1a1aa; font-size: 14px; line-height: 24px; margin: 0;">
          1. Connect your social accounts<br>
          2. Create your first post<br>
          3. Schedule and watch the magic happen!
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://postora.cloud/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Go to Dashboard
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px;">© 2026 Postora. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateTwoFactorEmail(userName: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0f0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border-radius: 12px;">
        <span style="font-size: 28px; font-weight: bold; color: #8b5cf6;">Postora</span>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: #1a1a24; border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 48px;">🔒</span>
      </div>
      
      <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; text-align: center; margin: 0 0 24px;">Your verification code</h1>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Hey ${userName}! 👋
      </p>
      
      <p style="color: #a1a1aa; font-size: 16px; line-height: 26px; margin: 16px 0;">
        Use this verification code to complete your sign-in:
      </p>
      
      <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3);">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8b5cf6;">${code}</span>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <p style="color: #f59e0b; font-size: 14px; margin: 0;">⏰ This code expires in 10 minutes</p>
      </div>
      
      <p style="color: #71717a; font-size: 13px; line-height: 20px; text-align: center; margin: 24px 0;">
        If you didn't try to sign in, someone may be trying to access your account. Please change your password immediately.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px;">© 2026 Postora. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    
    let data: AuthEmailPayload;
    
    try {
      data = JSON.parse(payload) as AuthEmailPayload;
    } catch (parseError) {
      console.error("Failed to parse payload:", parseError);
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: "Invalid JSON payload" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user, email_data } = data;
    
    if (!user || !email_data) {
      console.error("Missing user or email_data in payload");
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: "Missing user or email_data" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, token_hash, redirect_to, email_action_type } = email_data;
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || "there";

    console.log(`Processing ${email_action_type} email for ${user.email}`);

    let subject = "";
    let html = "";

    switch (email_action_type) {
      case "signup":
      case "email_verification":
        subject = "Verify your Postora account";
        html = generateVerificationEmail(userName, token, token_hash, SUPABASE_URL, redirect_to, email_action_type);
        break;

      case "recovery":
      case "password_reset":
        subject = "Reset your Postora password";
        html = generatePasswordResetEmail(userName, token_hash, SUPABASE_URL, redirect_to, email_action_type);
        break;

      case "magiclink":
        subject = "Your Postora login link";
        html = generateMagicLinkEmail(userName, token, token_hash, SUPABASE_URL, redirect_to, email_action_type);
        break;

      case "invite":
        subject = "Welcome to Postora!";
        html = generateWelcomeEmail(userName);
        break;

      case "email_change":
        subject = "Confirm your new email address";
        html = generateVerificationEmail(userName, token, token_hash, SUPABASE_URL, redirect_to, email_action_type);
        break;

      default:
        console.log(`Unknown email action type: ${email_action_type}, using verification template`);
        subject = "Verify your email - Postora";
        html = generateVerificationEmail(userName, token || "", token_hash, SUPABASE_URL, redirect_to || "", email_action_type);
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Postora <auth@postora.cloud>",
        to: [user.email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: { http_code: 500, message: emailResult.message || "Failed to send email" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent successfully to ${user.email}:`, emailResult);

    // Log auth event to database
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const eventType = email_action_type === 'signup' || email_action_type === 'email_verification'
      ? 'signup'
      : email_action_type === 'recovery' || email_action_type === 'password_reset'
      ? 'password_reset'
      : 'email_verified';
    
    await logAuthEvent(
      supabaseAdmin,
      eventType,
      undefined, // user_id not available in email hook
      user.email,
      { email_action_type, resend_id: emailResult.id }
    );

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-auth-email:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
