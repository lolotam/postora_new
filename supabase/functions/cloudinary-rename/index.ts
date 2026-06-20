import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenameRequest {
  fileId: string;
  newName: string; // New filename (without extension)
}

interface RenameResponse {
  success: boolean;
  newUrl?: string;
  newPublicId?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Cloudinary credentials
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Cloudinary not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileId, newName }: RenameRequest = await req.json();

    if (!fileId || !newName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: fileId, newName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the file from database
    const { data: file, error: fetchError } = await supabase
      .from("media_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !file) {
      console.error("File fetch error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.storage_bucket !== "cloudinary" || !file.cloudinary_public_id) {
      return new Response(
        JSON.stringify({ success: false, error: "File is not stored in Cloudinary" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentPublicId = file.cloudinary_public_id;
    
    // Extract folder path from current public_id
    const lastSlashIndex = currentPublicId.lastIndexOf("/");
    const folder = lastSlashIndex > -1 ? currentPublicId.substring(0, lastSlashIndex) : "";
    
    // Clean the new name
    const cleanNewName = newName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const newPublicId = folder ? `${folder}/${cleanNewName}` : cleanNewName;

    console.log(`Renaming file: ${currentPublicId} -> ${newPublicId}`);

    // Build timestamp and signature for Cloudinary API
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureParams = [
      `from_public_id=${currentPublicId}`,
      `timestamp=${timestamp}`,
      `to_public_id=${newPublicId}`,
    ].sort().join("&");

    // Create SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureParams + apiSecret);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Determine resource type from file type
    const resourceType = file.file_type === "video" ? "video" : "image";
    
    // Call Cloudinary rename API
    const renameUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/rename`;
    
    const formData = new FormData();
    formData.append("from_public_id", currentPublicId);
    formData.append("to_public_id", newPublicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    console.log(`Calling Cloudinary rename API: ${renameUrl}`);
    const renameResponse = await fetch(renameUrl, {
      method: "POST",
      body: formData,
    });

    if (!renameResponse.ok) {
      const errorText = await renameResponse.text();
      console.error("Cloudinary rename failed:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Rename failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await renameResponse.json();
    console.log("Cloudinary rename successful:", result);

    // Update database with new URL and public_id
    const { error: updateError } = await supabase
      .from("media_files")
      .update({
        file_path: result.secure_url,
        cloudinary_public_id: result.public_id,
      })
      .eq("id", fileId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Database update failed: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response: RenameResponse = {
      success: true,
      newUrl: result.secure_url,
      newPublicId: result.public_id,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Cloudinary rename error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
