import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenFailureAlert {
  platform: string;
  accountId: string;
  username?: string;
  userId: string;
  userEmail?: string;
  errorMessage: string;
  failedAt: string;
  failureCount?: number;
  needsReauth?: boolean;
}

interface HealthAlert {
  healthPercentage: number;
  threshold: number;
  totalAccounts: number;
  healthyCount: number;
  expiredCount: number;
  needsReauthCount: number;
  timestamp: string;
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  threads: 'Threads',
  bluesky: 'Bluesky',
  reddit: 'Reddit',
};

function getPlatformDisplayName(platform: string): string {
  return PLATFORM_DISPLAY_NAMES[platform.toLowerCase()] || platform;
}

function generateUserReconnectEmail(failure: TokenFailureAlert, reconnectUrl: string): string {
  const platformName = getPlatformDisplayName(failure.platform);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 32px 24px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
              🔄 Action Required: Reconnect Your ${platformName} Account
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
              Hi there,
            </p>
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
              We're having trouble keeping your <strong>${platformName}</strong> account${failure.username ? ` (${failure.username})` : ''} connected to Postora. This means scheduled posts to this account may not be published.
            </p>
            
            <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Why did this happen?</strong><br>
                This usually occurs when your ${platformName} password changed, you revoked app access, or the connection expired. Don't worry — reconnecting takes just a few seconds!
              </p>
            </div>
            
            <div style="margin: 24px 0; text-align: center;">
              <a href="${reconnectUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reconnect ${platformName} Now
              </a>
            </div>
            
            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
              Or go to your <a href="https://postora.cloud/connection-health" style="color: #3b82f6; text-decoration: none;">Connection Health</a> page to manage all your accounts.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
              You're receiving this because your ${platformName} account needs to be reconnected. This is a one-time notification — we won't email you again for 24 hours about this account.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { failures, healthAlert }: { failures?: TokenFailureAlert[]; healthAlert?: HealthAlert } = body;

    // Check admin email settings for health and failure alerts
    const settingKeys = ["admin_email_token_health_alerts", "admin_email_token_failure_alerts"];
    const { data: settingsRows } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", settingKeys);

    const settingsMap: Record<string, boolean> = {};
    for (const row of settingsRows || []) {
      const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      settingsMap[row.key] = parsed !== false; // default true for admin
    }
    const healthAlertsEnabled = settingsMap["admin_email_token_health_alerts"] !== false;
    const failureAlertsEnabled = settingsMap["admin_email_token_failure_alerts"] !== false;

    // Handle health threshold alert
    if (healthAlert) {
      if (!healthAlertsEnabled) {
        console.log("Token health alerts disabled by admin, skipping");
        return new Response(
          JSON.stringify({ success: true, message: "Health alerts disabled by admin" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Processing health alert: ${healthAlert.healthPercentage}% health`);
      
      const healthEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 32px 24px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                  🚨 Token Health Alert
                </h1>
                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                  Overall health dropped below ${healthAlert.threshold}%
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e ${healthAlert.healthPercentage}%, #ef4444 ${healthAlert.healthPercentage}%); position: relative;">
                    <div style="position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px; font-weight: 700; color: ${healthAlert.healthPercentage < 50 ? '#dc2626' : '#f59e0b'};">${healthAlert.healthPercentage}%</span>
                    </div>
                  </div>
                  <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 14px;">Current Health</p>
                </div>
                
                <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Metric</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Count</th>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Total Accounts</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${healthAlert.totalAccounts}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #22c55e;">✅ Healthy</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #22c55e;">${healthAlert.healthyCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #ef4444;">❌ Expired</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #ef4444;">${healthAlert.expiredCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; color: #dc2626;">🔄 Needs Reconnect</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #dc2626;">${healthAlert.needsReauthCount}</td>
                  </tr>
                </table>
                
                <div style="margin: 24px 0; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>Immediate Action Required:</strong> Token health has dropped to ${healthAlert.healthPercentage}%, which is below the ${healthAlert.threshold}% threshold. This may affect post scheduling for multiple users.
                  </p>
                </div>
                
                <div style="margin-top: 24px; text-align: center;">
                  <a href="https://postora.cloud/admin/token-health" style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    View Token Health Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                  This alert is sent when overall token health drops below ${healthAlert.threshold}%. Next alert in 6 hours.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Send to specific admin email
      const adminEmail = 'dr.vet.waleedtam@gmail.com';
      
      await resend.emails.send({
        from: 'Postora Alerts <admin@postora.cloud>',
        to: [adminEmail],
        subject: `🚨 Token Health Alert: ${healthAlert.healthPercentage}% (Below ${healthAlert.threshold}% threshold)`,
        html: healthEmailHtml,
      });

      console.log(`Health alert sent to ${adminEmail}`);

      return new Response(
        JSON.stringify({ success: true, message: `Health alert sent to ${adminEmail}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!failures || failures.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No failures to report' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${failures.length} token failure alerts`);

    // Separate failures into user notifications and admin notifications
    const needsReauthFailures = failures.filter(f => f.needsReauth && f.userEmail);
    const allFailuresForAdmin = failures;

    // 1. Send individual emails to users whose accounts need reconnection
    let userEmailsSent = 0;
    for (const failure of needsReauthFailures) {
      if (!failure.userEmail) continue;
      
      try {
        // Check if user has email notifications enabled
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email_notifications_enabled')
          .eq('email', failure.userEmail)
          .single();

        if (!profile?.email_notifications_enabled) {
          console.log(`Skipping user email for ${failure.userEmail} - notifications disabled`);
          continue;
        }

        const reconnectUrl = `https://postora.cloud/connection-health?reconnect=${failure.platform}&accountId=${failure.accountId}`;
        const emailHtml = generateUserReconnectEmail(failure, reconnectUrl);

        const platformName = getPlatformDisplayName(failure.platform);
        
        await resend.emails.send({
          from: 'Postora <notifications@postora.cloud>',
          to: [failure.userEmail],
          subject: `🔄 Reconnect your ${platformName} account to keep posting`,
          html: emailHtml,
        });

        console.log(`User notification sent to ${failure.userEmail} for ${failure.platform}`);
        userEmailsSent++;
      } catch (userEmailError) {
        console.error(`Failed to send user email to ${failure.userEmail}:`, userEmailError);
      }
    }

    // 2. Send admin summary email (if enabled)
    if (!failureAlertsEnabled) {
      console.log("Token failure alerts disabled by admin, skipping admin summary");
      return new Response(
        JSON.stringify({ success: true, userEmailsSent, message: "Admin failure alerts disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admins:', adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found to notify');
      return new Response(
        JSON.stringify({ message: 'No admins to notify', userEmailsSent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .in('id', adminUserIds)
      .eq('email_notifications_enabled', true);

    if (profileError) {
      console.error('Error fetching admin profiles:', profileError);
      throw profileError;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log('No admin users with notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No admins with notifications enabled', userEmailsSent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group failures by platform
    const failuresByPlatform = allFailuresForAdmin.reduce((acc, f) => {
      if (!acc[f.platform]) acc[f.platform] = [];
      acc[f.platform].push(f);
      return acc;
    }, {} as Record<string, TokenFailureAlert[]>);

    // Build email content
    const platformRows = Object.entries(failuresByPlatform).map(([platform, pFailures]) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${getPlatformDisplayName(platform)}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #ef4444; font-weight: 600;">
          ${pFailures.length} failed
        </td>
      </tr>
      ${pFailures.map(f => `
        <tr style="background-color: ${f.needsReauth ? '#fef2f2' : '#fefce8'};">
          <td style="padding: 8px 12px 8px 24px; border-bottom: 1px solid ${f.needsReauth ? '#fecaca' : '#fef3c7'}; font-size: 14px;">
            ${f.username || 'Unknown account'}
            ${f.needsReauth ? '<span style="color: #dc2626; font-size: 11px; margin-left: 8px;">NEEDS REAUTH</span>' : ''}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid ${f.needsReauth ? '#fecaca' : '#fef3c7'}; font-size: 14px; color: #6b7280;">
            ${f.errorMessage}${f.failureCount ? ` (attempt #${f.failureCount})` : ''}
          </td>
        </tr>
      `).join('')}
    `).join('');

    const totalFailures = allFailuresForAdmin.length;
    const affectedPlatforms = Object.keys(failuresByPlatform).length;
    const needsReauthCount = allFailuresForAdmin.filter(f => f.needsReauth).length;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 32px 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ⚠️ Token Refresh Failures
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${totalFailures} account${totalFailures > 1 ? 's' : ''} need attention across ${affectedPlatforms} platform${affectedPlatforms > 1 ? 's' : ''}
                ${needsReauthCount > 0 ? `• ${needsReauthCount} require reconnection` : ''}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              ${userEmailsSent > 0 ? `
                <div style="margin-bottom: 16px; padding: 12px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #065f46; font-size: 14px;">
                    ✅ <strong>${userEmailsSent} user${userEmailsSent > 1 ? 's' : ''}</strong> notified to reconnect their account${userEmailsSent > 1 ? 's' : ''}.
                  </p>
                </div>
              ` : ''}
              
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px;">
                The following social media accounts failed to refresh their tokens:
              </p>
              
              <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Platform / Account</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Status / Error</th>
                  </tr>
                </thead>
                <tbody>
                  ${platformRows}
                </tbody>
              </table>
              
              <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Action Required:</strong> Accounts marked "NEEDS REAUTH" require users to disconnect and reconnect. Users have been notified via email (if notifications enabled).
                </p>
              </div>
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="https://postora.cloud/admin/token-health" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  View Token Health Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated alert from Postora. Alerts are limited to once per 24 hours per account.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email to all admins
    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
    
    console.log(`Sending token failure alert to ${adminEmails.length} admins`);

    const emailResponse = await resend.emails.send({
      from: 'Postora Alerts <admin@postora.cloud>',
      to: adminEmails,
      subject: `⚠️ Token Refresh Failed: ${totalFailures} account${totalFailures > 1 ? 's' : ''} need attention`,
      html: emailHtml,
    });

    console.log('Admin email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Alert sent to ${adminEmails.length} admins, ${userEmailsSent} users notified`,
        userEmailsSent,
        adminEmailsSent: adminEmails.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending token failure alert:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
