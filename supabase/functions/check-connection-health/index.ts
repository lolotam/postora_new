import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions, jsonResponse, errorResponse, badRequestResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface HealthCheckResult {
  success: boolean;
  message: string;
  tokenStatus?: "valid" | "expired";
  daysUntilExpiry?: number;
}

async function testTikTokConnection(accessToken: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      return { success: true, message: "TikTok connection is working" };
    } else {
      const data = await response.json();
      return { success: false, message: data.error?.message || "TikTok API returned an error" };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect to TikTok" };
  }
}

async function testFacebookConnection(accessToken: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);

    if (response.ok) {
      return { success: true, message: "Facebook connection is working" };
    } else {
      const data = await response.json();
      return { success: false, message: data.error?.message || "Facebook API returned an error" };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect to Facebook" };
  }
}

async function testInstagramConnection(accessToken: string): Promise<HealthCheckResult> {
  // Instagram via Facebook page - uses the same token as Facebook
  return testFacebookConnection(accessToken);
}

async function testInstagramBusinessLoginConnection(accessToken: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );

    if (response.ok) {
      return { success: true, message: "Instagram (Direct) connection is working" };
    } else {
      const data = await response.json();
      return { success: false, message: data.error?.message || "Instagram API returned an error" };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect to Instagram" };
  }
}

async function testPinterestConnection(accessToken: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      return { success: true, message: "Pinterest connection is working" };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || "Pinterest API returned an error" };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect to Pinterest" };
  }
}

async function testYouTubeConnection(accessToken: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      return { success: true, message: "YouTube connection is working" };
    } else {
      const data = await response.json();
      return { success: false, message: data.error?.message || "YouTube API returned an error" };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to connect to YouTube" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions();
  }

  try {
    const { account_id, action } = await req.json();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the account
    const { data: account, error: fetchError } = await supabase
      .from("social_accounts")
      .select("id, platform, access_token, token_expires_at, account_metadata")
      .eq("id", account_id)
      .single();

    if (fetchError || !account) {
      throw new Error("Account not found");
    }

    // Test the connection
    if (action === "test") {
      let result: HealthCheckResult;

      switch (account.platform) {
        case "tiktok":
          result = await testTikTokConnection(account.access_token);
          break;
        case "facebook":
          result = await testFacebookConnection(account.access_token);
          break;
        case "instagram": {
          const igMeta = account.account_metadata as Record<string, unknown> | null;
          if (igMeta?.account_type === "business_login") {
            result = await testInstagramBusinessLoginConnection(account.access_token);
          } else {
            result = await testInstagramConnection(account.access_token);
          }
          break;
        }
        case "pinterest":
          result = await testPinterestConnection(account.access_token);
          break;
        case "youtube":
          result = await testYouTubeConnection(account.access_token);
          break;
        default:
          result = { success: false, message: `Testing not supported for ${account.platform}` };
      }

      return jsonResponse(result);
    }

    // Get health status
    if (action === "status") {
      let tokenStatus: "valid" | "expired" = "valid";
      let daysUntilExpiry: number | undefined;

      if (account.token_expires_at) {
        const now = new Date();
        const expiry = new Date(account.token_expires_at);
        const diffMs = expiry.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          tokenStatus = "expired";
        }
      }

      return jsonResponse({
        success: true,
        tokenStatus,
        daysUntilExpiry,
        message: tokenStatus === "expired"
          ? "Token has expired"
          : "Token is valid",
      });
    }

    return badRequestResponse("Invalid action");

  } catch (error: unknown) {
    console.error("Connection health check error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message);
  }
});
