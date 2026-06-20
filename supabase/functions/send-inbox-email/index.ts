import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAttachment {
  filename: string;
  path: string;
  content?: string;
  content_type?: string;
}

interface SendEmailRequest {
  to: string;
  cc?: string[];
  bcc?: string[];
  from?: "admin@postora.cloud" | "support@postora.cloud";
  subject: string;
  html: string;
  text?: string;
  replyToMessageId?: string;
  attachments?: EmailAttachment[];
  scheduledAt?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }

    const body: SendEmailRequest = await req.json();
    
    // Validate required fields
    if (!body.to || !body.subject || !body.html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // Ensure from address is one of our allowed addresses
    const allowedFromAddresses = ["admin@postora.cloud", "support@postora.cloud"];
    const fromAddress = body.from || "admin@postora.cloud";
    
    if (!allowedFromAddresses.includes(fromAddress)) {
      throw new Error(`Invalid from address. Must be one of: ${allowedFromAddresses.join(", ")}`);
    }

    // Handle scheduled emails
    if (body.scheduledAt) {
      const scheduledDate = new Date(body.scheduledAt);
      if (scheduledDate > new Date()) {
        console.log(`Scheduling email for ${body.scheduledAt}`);
        
        // Store in scheduled_emails table
        const { data: scheduled, error: scheduleError } = await supabase
          .from("scheduled_emails")
          .insert({
            admin_id: user.id,
            from_email: fromAddress,
            to_email: body.to,
            cc_email: body.cc?.join(", ") || null,
            bcc_email: body.bcc?.join(", ") || null,
            subject: body.subject,
            html_body: body.html,
            text_body: body.text || body.html.replace(/<[^>]*>/g, ""),
            attachments: body.attachments || [],
            scheduled_at: body.scheduledAt,
            status: "pending",
            reply_to_message_id: body.replyToMessageId || null,
          })
          .select()
          .single();

        if (scheduleError) {
          console.error("Error scheduling email:", scheduleError);
          throw new Error("Failed to schedule email");
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            scheduled: true,
            scheduledId: scheduled.id,
            scheduledAt: body.scheduledAt
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    console.log(`Sending email from ${fromAddress} to ${body.to}`);
    if (body.cc?.length) console.log(`CC: ${body.cc.join(", ")}`);
    if (body.bcc?.length) console.log(`BCC: ${body.bcc.join(", ")}`);

    // Prepare recipients
    const recipients = [body.to];
    
    // Prepare attachments for Resend
    const resendAttachments = body.attachments?.map(att => ({
      filename: att.filename,
      path: att.path,
    })) || [];

    // Send email via Resend
    const resendPayload: Record<string, unknown> = {
      from: `Postora <${fromAddress}>`,
      to: recipients,
      subject: body.subject,
      html: body.html,
      text: body.text || body.html.replace(/<[^>]*>/g, ""),
      reply_to: fromAddress,
    };

    // Add CC if present
    if (body.cc && body.cc.length > 0) {
      resendPayload.cc = body.cc;
    }

    // Add BCC if present
    if (body.bcc && body.bcc.length > 0) {
      resendPayload.bcc = body.bcc;
    }

    // Add attachments if present
    if (resendAttachments.length > 0) {
      resendPayload.attachments = resendAttachments;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData.message || "Unknown error"}`);
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData.id);

    // Store the outbound message in admin_inbox_messages
    let threadId = null;
    if (body.replyToMessageId) {
      const { data: originalMessage } = await supabase
        .from("admin_inbox_messages")
        .select("id, thread_id")
        .eq("id", body.replyToMessageId)
        .single();
      
      if (originalMessage) {
        threadId = originalMessage.thread_id || originalMessage.id;
      }
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from("admin_inbox_messages")
      .insert({
        from_email: fromAddress,
        to_email: body.to,
        subject: body.subject,
        body: body.text || body.html.replace(/<[^>]*>/g, ""),
        html_body: body.html,
        resend_id: resendData.id,
        direction: "outbound",
        status: "sent",
        is_read: true,
        admin_id: user.id,
        reply_to_id: body.replyToMessageId || null,
        thread_id: threadId,
        message_type: "email",
        attachments: body.attachments || null,
        metadata: {
          cc: body.cc || [],
          bcc: body.bcc || [],
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing outbound message:", insertError);
    }

    // If this is a reply, update the original message status
    if (body.replyToMessageId) {
      await supabase
        .from("admin_inbox_messages")
        .update({ 
          status: "replied",
          thread_id: threadId || body.replyToMessageId,
        })
        .eq("id", body.replyToMessageId);
    }

    // Save contacts for autocomplete
    const allRecipients = [body.to, ...(body.cc || []), ...(body.bcc || [])];
    for (const email of allRecipients) {
      const { data: existing } = await supabase
        .from("email_contacts")
        .select("id, use_count")
        .eq("email", email.toLowerCase())
        .eq("admin_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("email_contacts")
          .update({
            use_count: (existing.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("email_contacts").insert({
          email: email.toLowerCase(),
          admin_id: user.id,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: resendData.id,
        messageId: insertedMessage?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    console.error("Send email error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage === "Unauthorized" || errorMessage === "Admin access required";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: isAuthError ? 403 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
