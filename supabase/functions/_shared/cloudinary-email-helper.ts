/**
 * Shared helper for uploading email attachments to Cloudinary.
 * Used by resend-webhook, fetch-email-content, and cloudinary-email-upload.
 */

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  filename: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file buffer to Cloudinary in the admin/email folder structure.
 */
export async function uploadToCloudinaryEmail(
  fileBuffer: ArrayBuffer | Uint8Array,
  filename: string,
  contentType: string,
  folder: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<CloudinaryUploadResult> {
  const base64Data = arrayBufferToBase64(fileBuffer);
  const dataUri = `data:${contentType};base64,${base64Data}`;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, "");

  const paramsToSign: Record<string, string> = {
    folder,
    public_id: sanitizedFilename,
    timestamp,
  };

  const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("folder", folder);
  formData.append("public_id", sanitizedFilename);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);
  formData.append("resource_type", "auto");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Cloudinary upload failed: ${response.status}`, errorText);
    throw new Error(`Cloudinary upload failed: ${response.status}`);
  }

  const result = await response.json();

  return {
    url: result.secure_url,
    publicId: result.public_id,
    filename,
    size: result.bytes || 0,
    contentType: result.resource_type === "image" ? `image/${result.format}` : contentType,
  };
}

/**
 * Delete a file from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign: Record<string, string> = {
    public_id: publicId,
    timestamp,
  };

  const signature = await generateCloudinarySignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    console.error(`Cloudinary delete failed: ${response.status}`);
    return false;
  }

  const result = await response.json();
  return result.result === "ok";
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const signatureString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + apiSecret;

  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
