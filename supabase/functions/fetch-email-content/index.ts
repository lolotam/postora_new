import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch full inbound email content from Resend Receiving API
async function fetchEmailContent(
  emailId: string,
  apiKey: string
): Promise<{
  text: string;
  html: string | null;
}> {
  console.log(`Fetching inbound email content for email_id: ${emailId}`);

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch inbound email content: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error("Error response:", errorText);
    throw new Error(`Failed to fetch inbound email: ${response.status}`);
  }

  const json = await response.json();
  const email = (json?.data ?? json) as { text?: string; html?: string | null };

  return {
    text: email?.text || "",
    html: email?.html || null,
  };
}

// Fetch inbound attachments from Resend Receiving API and upload to Cloudinary
async function fetchAndStoreAttachments(
  emailId: string,
  apiKey: string
): Promise<
  Array<{
    id: string;
    filename: string;
    content_type: string;
    size: number;
    url: string;
    publicId: string;
  }>
> {
  const { uploadToCloudinaryEmail } = await import("../_shared/cloudinary-email-helper.ts");

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;
  const cloudApiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
  const cloudApiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;

  console.log(`Fetching inbound attachments for email_id: ${emailId}`);

  const listResponse = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}/attachments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!listResponse.ok) {
    console.error(`Failed to fetch attachments list: ${listResponse.status} ${listResponse.statusText}`);
    return [];
  }

  const attachmentsJson = await listResponse.json();
  const attachments = (Array.isArray(attachmentsJson?.data)
    ? attachmentsJson.data
    : Array.isArray(attachmentsJson)
      ? attachmentsJson
      : []) as Array<{
    id?: string;
    filename?: string;
    content_type?: string;
    contentType?: string;
    download_url?: string;
    url?: string;
  }>;

  if (attachments.length === 0) {
    console.log("No attachments found");
    return [];
  }

  const storedAttachments: Array<{
    id: string;
    filename: string;
    content_type: string;
    size: number;
    url: string;
    publicId: string;
  }> = [];

  for (const attachment of attachments) {
    try {
      const filename = attachment.filename || "attachment";
      const downloadUrl = attachment.download_url || attachment.url;
      if (!downloadUrl) continue;

      let fileResponse = await fetch(downloadUrl);
      if (!fileResponse.ok && (fileResponse.status === 401 || fileResponse.status === 403)) {
        fileResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      }
      if (!fileResponse.ok) continue;

      const fileBlob = await fileResponse.blob();
      const fileBuffer = await fileBlob.arrayBuffer();
      const contentType = attachment.content_type || attachment.contentType || "application/octet-stream";

      const result = await uploadToCloudinaryEmail(
        new Uint8Array(fileBuffer),
        filename,
        contentType,
        `admin/email/inbound/${emailId}`,
        cloudName,
        cloudApiKey,
        cloudApiSecret
      );

      storedAttachments.push({
        id: crypto.randomUUID(),
        filename,
        content_type: contentType,
        size: fileBlob.size,
        url: result.url,
        publicId: result.publicId,
      });

      console.log(`Successfully stored attachment: ${filename}`);
    } catch (attError) {
      console.error(`Error processing attachment ${attachment.filename}:`, attError);
    }
  }

  return storedAttachments;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messageId } = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: "Missing messageId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching content for message: ${messageId}`);

    // Get the message from database
    const { data: message, error: fetchError } = await supabase
      .from("admin_inbox_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      console.error("Message not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get resend_id from message, or extract from metadata
    let resendId = message.resend_id;
    
    // If resend_id is not directly stored, try to extract from metadata
    if (!resendId && message.metadata) {
      const metadata = message.metadata as { raw_event?: { data?: { email_id?: string } } };
      resendId = metadata.raw_event?.data?.email_id || null;
      
      // If we found it in metadata, update the message record for future use
      if (resendId) {
        console.log(`Found email_id in metadata: ${resendId}, updating message record`);
        await supabase
          .from("admin_inbox_messages")
          .update({ resend_id: resendId })
          .eq("id", messageId);
      }
    }
    
    if (!resendId) {
      return new Response(
        JSON.stringify({ error: "No Resend ID found in message or metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching content from Resend for email_id: ${resendId}`);

    // Fetch email content
    let textBody = "";
    let htmlBody: string | null = null;
    let fetchedContent = false;

    try {
      const emailContent = await fetchEmailContent(resendId, resendApiKey);
      textBody = emailContent.text;
      htmlBody = emailContent.html;
      fetchedContent = true;
      console.log(`Fetched body - text: ${textBody.length} chars, html: ${htmlBody ? "yes" : "no"}`);
    } catch (error) {
      console.error("Failed to fetch email content:", error);
    }

    // Fetch and store attachments
    let storedAttachments: Array<{
      id: string;
      filename: string;
      content_type: string;
      size: number;
      url: string;
      publicId: string;
    }> = [];

    try {
      storedAttachments = await fetchAndStoreAttachments(resendId, resendApiKey);
      console.log(`Stored ${storedAttachments.length} attachments`);
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    }

    // Update the message in database
    const updateData: Record<string, unknown> = {};
    
    if (textBody) {
      updateData.body = textBody;
    }
    if (htmlBody) {
      updateData.html_body = htmlBody;
    }
    if (storedAttachments.length > 0) {
      // Merge with existing attachments that might have URLs
      const existingAttachments = Array.isArray(message.attachments) ? message.attachments : [];
      const existingWithUrls = existingAttachments.filter((a: any) => a.url);
      updateData.attachments = [...existingWithUrls, ...storedAttachments];
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("admin_inbox_messages")
        .update(updateData)
        .eq("id", messageId);

      if (updateError) {
        console.error("Failed to update message:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update message" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fetched: {
          body: fetchedContent,
          bodyLength: textBody.length,
          hasHtml: !!htmlBody,
          attachments: storedAttachments.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
