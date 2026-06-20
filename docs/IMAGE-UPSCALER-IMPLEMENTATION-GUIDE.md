# Image Upscaler Implementation Guide

> **Complete guide to implement dual-provider image upscaling (Cloudinary + AtlasCloud) in a React + TypeScript + Supabase project.**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites & Secrets](#prerequisites--secrets)
3. [Database Schema](#database-schema)
4. [Edge Functions](#edge-functions)
5. [Frontend Types & Constants](#frontend-types--constants)
6. [Frontend Components](#frontend-components)
7. [Admin Settings (Feature Flags)](#admin-settings-feature-flags)
8. [API Usage Examples](#api-usage-examples)
9. [File Structure](#file-structure)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Frontend UI                     │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │FeatureToggles│    │   UpscaleOptions       │  │
│  │ [x] Upscale  │    │ Provider: Cloudinary ▼ │  │
│  └──────┬───────┘    │ Mode: Standard ▼       │  │
│         │            └───────────┬─────────────┘  │
│         └────────────────────────┘                │
│                      │                            │
│              ┌───────▼────────┐                   │
│              │ImageToolsDialog│                   │
│              └───────┬────────┘                   │
└──────────────────────┼────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   platform parameter    │
          │   "cloudinary" or       │
          │   "atlascloud"          │
          └────────┬────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼                             ▼
┌────────────────┐     ┌──────────────────┐
│   Cloudinary   │     │  AtlasCloud API  │
│  URL Transform │     │  (async polling) │
│   c_scale,2x   │     │  4K upscale      │
│   e_sharpen    │     │  AI restoration  │
└────────────────┘     └──────────────────┘
```

**Two Providers:**

| Feature | Cloudinary (Standard) | AtlasCloud (Premium) |
|---------|----------------------|---------------------|
| Scale | 2x | Up to 4K |
| Method | URL transformations | Async API + polling |
| Cost | Free-tier compatible | Paid API credits |
| Speed | Instant | Up to 2 minutes |
| Quality | Good (sharpen+improve) | Premium AI restoration |

---

## Prerequisites & Secrets

### Required Supabase Secrets

Set these via Supabase Dashboard → Settings → Edge Functions → Secrets:

| Secret Name | Where to Get It | Required For |
|-------------|----------------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard → Settings | Cloudinary upscaling |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard → Settings | Cloudinary upscaling |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard → Settings | Cloudinary upscaling |
| `ATLASCLOUD_API_KEY` | [AtlasCloud Dashboard](https://atlascloud.ai) | AtlasCloud 4K upscaling |
| `SUPABASE_URL` | Auto-set by Supabase | Both |
| `SUPABASE_ANON_KEY` | Auto-set by Supabase | Both |

### Required npm Packages

```bash
npm install @supabase/supabase-js @radix-ui/react-switch @radix-ui/react-select lucide-react
```

---

## Database Schema

### Optional: Feature Flags Table

If you want admin-controlled provider visibility, create a feature flags table:

```sql
-- Migration: Create feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default flag for AtlasCloud visibility
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('atlascloudUpscale', false, 'Show AtlasCloud 4K as an upscale provider option')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read flags
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Only admins can update flags
CREATE POLICY "Admins can update feature flags"
  ON public.feature_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Optional: Media Operations History

Track upscale operations for analytics:

```sql
CREATE TABLE IF NOT EXISTS public.media_operations_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  media_file_id UUID,
  operation_type TEXT NOT NULL, -- 'upscale', 'background_removal', etc.
  source_url TEXT,
  result_url TEXT,
  file_name TEXT,
  operation_details JSONB,
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  error_message TEXT,
  duration_ms INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.media_operations_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own operations"
  ON public.media_operations_history FOR ALL
  USING (auth.uid() = user_id);
```

---

## Edge Functions

### 1. Shared CORS Helpers

**File: `supabase/functions/_shared/cors.ts`**

```typescript
/**
 * Shared CORS headers for Supabase Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCorsOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, 401);
}

export function badRequestResponse(message = "Bad Request"): Response {
  return errorResponse(message, 400);
}
```

### 2. Unified Upscale Edge Function

**File: `supabase/functions/upscale-image/index.ts`**

This is the main edge function that routes between Cloudinary and AtlasCloud based on the `platform` parameter.

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  handleCorsOptions,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from "../_shared/cors.ts";

const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions();
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let userId: string;
    let userEmail: string = "unknown";

    // ─── Authentication (supports API key + JWT) ───
    const apiKey = req.headers.get("x-api-key") || "";
    const authHeader = req.headers.get("authorization") || "";

    if (apiKey && apiKey.startsWith("your-prefix-")) {
      // API key auth (for external integrations like n8n)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("api_key", apiKey)
        .single();

      if (profileError || !profile) {
        return unauthorizedResponse("Invalid API key");
      }
      userId = profile.id;
      userEmail = profile.email;
    } else if (authHeader.startsWith("Bearer ")) {
      // JWT auth (from browser session via supabase.functions.invoke)
      const token = authHeader.replace("Bearer ", "");
      const supabaseWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const {
        data: { user },
        error: userError,
      } = await supabaseWithAuth.auth.getUser();

      if (userError || !user) {
        return unauthorizedResponse("Invalid or expired session");
      }
      userId = user.id;
      userEmail = user.email || "unknown";
    } else {
      return unauthorizedResponse("Missing authentication");
    }

    console.log(`Upscale request from: ${userEmail}`);

    // ─── Parse Request Body ───
    let imageUrl: string | null = null;
    let imageBase64: string | null = null;
    let scale: number = 2;
    let platform: string = "cloudinary";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const urlParam = formData.get("image_url") as string | null;
      const scaleParam = formData.get("scale") as string | null;
      const platformParam = formData.get("platform") as string | null;

      if (file) {
        const buffer = await file.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      } else if (urlParam) {
        imageUrl = urlParam;
      }

      if (scaleParam) {
        scale = Math.min(4, Math.max(1, parseInt(scaleParam) || 2));
      }
      if (platformParam) {
        platform = platformParam;
      }
    } else {
      const body = await req.json();
      imageUrl = body.image_url || null;
      imageBase64 = body.image_base64 || null;
      scale = Math.min(4, Math.max(1, body.scale || 2));
      platform = body.platform || "cloudinary";
    }

    if (!imageUrl && !imageBase64) {
      return badRequestResponse(
        "Please provide image_url, image_base64, or file in form-data"
      );
    }

    console.log(`Platform: ${platform}, Scale: ${scale}x`);

    // ═══════════════════════════════════════════
    // ROUTE: AtlasCloud 4K Upscaling
    // ═══════════════════════════════════════════
    if (platform === "atlascloud") {
      const ATLASCLOUD_API_KEY = Deno.env.get("ATLASCLOUD_API_KEY");
      if (!ATLASCLOUD_API_KEY) {
        return errorResponse("AtlasCloud API key not configured", 500);
      }

      // AtlasCloud requires a URL — upload base64 to Cloudinary first if needed
      let targetImageUrl = imageUrl;
      if (!targetImageUrl && imageBase64) {
        if (
          !CLOUDINARY_CLOUD_NAME ||
          !CLOUDINARY_API_KEY ||
          !CLOUDINARY_API_SECRET
        ) {
          return errorResponse(
            "Cloudinary config missing for base64 upload",
            500
          );
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const folder = `uploads/${userId}/temp`;
        const signParams = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(signParams);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const uploadFormData = new FormData();
        uploadFormData.append("api_key", CLOUDINARY_API_KEY);
        uploadFormData.append("timestamp", timestamp.toString());
        uploadFormData.append("signature", signature);
        uploadFormData.append("folder", folder);
        uploadFormData.append(
          "file",
          `data:image/png;base64,${imageBase64}`
        );

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: uploadFormData }
        );

        if (!cloudinaryResponse.ok) {
          const errorText = await cloudinaryResponse.text();
          return errorResponse(
            `Failed to upload for AtlasCloud: ${errorText}`,
            500
          );
        }

        const cloudinaryData = await cloudinaryResponse.json();
        targetImageUrl = cloudinaryData.secure_url;
      }

      // Determine target resolution
      let targetResolution = "4k";
      if (scale <= 2) targetResolution = "2k";

      console.log(`Starting AtlasCloud upscale: ${targetResolution}`);

      // Step 1: Start generation
      const generateResponse = await fetch(
        "https://api.atlascloud.ai/api/v1/model/generateImage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ATLASCLOUD_API_KEY}`,
          },
          body: JSON.stringify({
            model: "atlascloud/image-upscaler",
            image: targetImageUrl,
            creativity: 2,
            output_format: "jpeg",
            enable_sync_mode: false,
            target_resolution: targetResolution,
            enable_base64_output: false,
          }),
        }
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("AtlasCloud generate error:", errorText);

        // Parse specific AtlasCloud errors
        if (
          generateResponse.status === 402 ||
          errorText.includes("insufficient_balance")
        ) {
          return errorResponse(
            "AtlasCloud credits exhausted. Use Cloudinary upscaling instead.",
            402
          );
        }
        if (generateResponse.status === 401) {
          return errorResponse("AtlasCloud API key invalid or expired.", 401);
        }
        if (generateResponse.status === 429) {
          return errorResponse("AtlasCloud rate limit exceeded.", 429);
        }

        return errorResponse(
          `AtlasCloud generation failed: ${errorText}`,
          generateResponse.status
        );
      }

      const generateJson = await generateResponse.json();
      if (generateJson.code !== 200 || !generateJson.data?.id) {
        if (
          generateJson.message?.toLowerCase().includes("balance") ||
          generateJson.message?.toLowerCase().includes("credit")
        ) {
          return errorResponse(
            "AtlasCloud credits exhausted. Use Cloudinary upscaling.",
            402
          );
        }
        return errorResponse(
          `AtlasCloud failed: ${generateJson.message || "Unknown error"}`,
          500
        );
      }

      const predictionId = generateJson.data.id;
      console.log(`AtlasCloud prediction started: ${predictionId}`);

      // Step 2: Poll for result (max ~2 minutes)
      const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`;
      let attempts = 0;
      const maxAttempts = 60; // 60 × 2s = 2 minutes
      let upscaledUrl: string | null = null;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;

        const pollResponse = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${ATLASCLOUD_API_KEY}` },
        });

        if (!pollResponse.ok) continue;

        const result = await pollResponse.json();
        console.log(`Poll attempt ${attempts}:`, result.data?.status);

        if (result.data?.status === "completed") {
          upscaledUrl = result.data.outputs?.[0];
          break;
        } else if (result.data?.status === "failed") {
          return errorResponse(
            `AtlasCloud failed: ${result.data.error || "Unknown error"}`,
            500
          );
        }
      }

      if (!upscaledUrl) {
        return errorResponse("AtlasCloud upscale timed out", 504);
      }

      return jsonResponse({
        success: true,
        original_url: imageUrl || "base64_upload",
        upscaled_url: upscaledUrl,
        prediction_id: predictionId,
        target_resolution: targetResolution,
        scale: scale,
        platform: "atlascloud",
      });
    }

    // ═══════════════════════════════════════════
    // ROUTE: Cloudinary Upscaling (Default)
    // ═══════════════════════════════════════════
    if (
      !CLOUDINARY_CLOUD_NAME ||
      !CLOUDINARY_API_KEY ||
      !CLOUDINARY_API_SECRET
    ) {
      return errorResponse("Cloudinary configuration missing", 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `uploads/${userId}/upscaled`;

    // Create signature
    const signParams = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signParams);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Build upload form
    const uploadFormData = new FormData();
    uploadFormData.append("api_key", CLOUDINARY_API_KEY);
    uploadFormData.append("timestamp", timestamp.toString());
    uploadFormData.append("signature", signature);
    uploadFormData.append("folder", folder);

    if (imageUrl) {
      uploadFormData.append("file", imageUrl);
    } else if (imageBase64) {
      uploadFormData.append("file", `data:image/png;base64,${imageBase64}`);
    }

    console.log(`Uploading to Cloudinary for ${scale}x upscaling...`);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: uploadFormData }
    );

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      return errorResponse(`Upscale upload failed: ${errorText}`, 500);
    }

    const cloudinaryData = await cloudinaryResponse.json();
    console.log("Upload successful:", cloudinaryData.public_id);

    // Generate upscaled URL using Cloudinary transformations
    const upscaledUrl = cloudinaryData.secure_url.replace(
      "/upload/",
      `/upload/e_upscale,w_${cloudinaryData.width * scale},h_${
        cloudinaryData.height * scale
      }/`
    );

    const enhancedUrl = cloudinaryData.secure_url.replace(
      "/upload/",
      "/upload/e_improve,e_sharpen/"
    );

    return jsonResponse({
      success: true,
      original_url: imageUrl || "base64_upload",
      upscaled_url: upscaledUrl,
      enhanced_url: enhancedUrl,
      public_id: cloudinaryData.public_id,
      original_width: cloudinaryData.width,
      original_height: cloudinaryData.height,
      upscaled_width: cloudinaryData.width * scale,
      upscaled_height: cloudinaryData.height * scale,
      scale: scale,
      platform: "cloudinary",
      format: cloudinaryData.format,
    });
  } catch (error) {
    console.error("Upscale image error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
```

### 3. Supabase Config (TOML)

Add to your `supabase/config.toml`:

```toml
[functions.upscale-image]
verify_jwt = false
```

> `verify_jwt = false` because the function handles auth internally (supports both API key and JWT).

---

## Frontend Types & Constants

### Types (`src/components/image-tools/types.ts`)

```typescript
export type UpscaleMode = "standard" | "enhance" | "restore";
export type UpscalePlatform = "cloudinary" | "atlascloud";
export type ResizeMode = "original" | "square" | "portrait" | "landscape" | "custom";
export type CropMode = "fill" | "fit" | "scale" | "crop" | "pad";
export type QualityPreset = "auto" | "best" | "high" | "medium" | "low" | "eco";
export type OutputFormat = "auto" | "jpg" | "png" | "webp";
export type ArtisticFilter =
  | "none"
  | "al_dente" | "athena" | "audrey" | "aurora" | "daguerre"
  | "eucalyptus" | "fes" | "frost" | "hairspray" | "hokusai"
  | "incognito" | "linen" | "peacock" | "primavera" | "quartz"
  | "red_rock" | "refresh" | "sizzle" | "sonnet" | "ukulele" | "zorro";

export interface ImageToolsFile {
  id: string;
  publicUrl: string;
  cloudinary_public_id?: string;
  storage_bucket: string;
  folder_path?: string;
  file_path: string;
}

export interface ImageToolsDialogProps {
  open: boolean;
  onClose: () => void;
  file: ImageToolsFile | null;
  cloudName: string;
  onProcessComplete?: () => void;
}

export interface TempCloudinaryData {
  publicId: string;
  cloudName: string;
  url: string;
}
```

### Constants (`src/components/image-tools/constants.ts`)

```typescript
import { ResizeMode, CropMode, ArtisticFilter, QualityPreset } from "./types";

export const RESIZE_PRESETS: Record<ResizeMode, { label: string; width: number | null; height: number | null }> = {
  original: { label: "Original", width: null, height: null },
  square: { label: "Square (1:1)", width: 1024, height: 1024 },
  portrait: { label: "Portrait (4:5)", width: 1080, height: 1350 },
  landscape: { label: "Landscape (16:9)", width: 1920, height: 1080 },
  custom: { label: "Custom", width: null, height: null },
};

export const CROP_MODES: Record<CropMode, { label: string; description: string }> = {
  fill: { label: "Fill (crop to fit)", description: "Crops image to exact dimensions" },
  fit: { label: "Fit (contain)", description: "Fits within dimensions, may add padding" },
  scale: { label: "Scale", description: "Scales to dimensions, may distort" },
  crop: { label: "Crop (center)", description: "Crops from center" },
  pad: { label: "Pad", description: "Adds padding to fit dimensions" },
};

export const QUALITY_PRESETS: Record<QualityPreset, { label: string; value: string }> = {
  auto: { label: "Auto (recommended)", value: "auto" },
  best: { label: "Best Quality", value: "100" },
  high: { label: "High (80%)", value: "80" },
  medium: { label: "Medium (60%)", value: "60" },
  low: { label: "Low (40%)", value: "40" },
  eco: { label: "Eco (20%)", value: "20" },
};
```

---

## Frontend Components

### 1. UpscaleOptions Component

```tsx
// src/components/image-tools/options/UpscaleOptions.tsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZoomIn, Cloud, Sparkles } from "lucide-react";
import { UpscaleMode, UpscalePlatform } from "../types";

interface UpscaleOptionsProps {
  upscaleMode: UpscaleMode;
  onUpscaleModeChange: (mode: UpscaleMode) => void;
  upscalePlatform?: UpscalePlatform;
  onUpscalePlatformChange?: (platform: UpscalePlatform) => void;
  showAtlasCloud?: boolean; // Feature flag — hide AtlasCloud when false
}

export function UpscaleOptions({
  upscaleMode,
  onUpscaleModeChange,
  upscalePlatform = "cloudinary",
  onUpscalePlatformChange,
  showAtlasCloud = false,
}: UpscaleOptionsProps) {
  // Auto-reset to cloudinary if AtlasCloud is hidden
  if (
    !showAtlasCloud &&
    upscalePlatform === "atlascloud" &&
    onUpscalePlatformChange
  ) {
    onUpscalePlatformChange("cloudinary");
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <ZoomIn className="w-4 h-4" />
        AI Upscale Settings
      </Label>

      {/* Platform Selection (only shown when AtlasCloud is enabled) */}
      {onUpscalePlatformChange && showAtlasCloud && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Upscale Platform
          </Label>
          <Select
            value={upscalePlatform}
            onValueChange={(v) =>
              onUpscalePlatformChange(v as UpscalePlatform)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cloudinary">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <div>
                    <span>Cloudinary</span>
                    <p className="text-xs text-muted-foreground">
                      Up to 4x upscale with AI enhancement
                    </p>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="atlascloud">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <span>AtlasCloud 4K</span>
                    <p className="text-xs text-muted-foreground">
                      Premium 4K upscaling with AI restoration
                    </p>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mode Selection (Cloudinary only) */}
      {upscalePlatform === "cloudinary" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Upscale Mode</Label>
          <Select
            value={upscaleMode}
            onValueChange={(v) => onUpscaleModeChange(v as UpscaleMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">
                <div>
                  <span>Standard Upscale</span>
                  <p className="text-xs text-muted-foreground">
                    AI Super Resolution for higher quality
                  </p>
                </div>
              </SelectItem>
              <SelectItem value="enhance">
                <div>
                  <span>Upscale + Enhance</span>
                  <p className="text-xs text-muted-foreground">
                    Also improves colors and lighting
                  </p>
                </div>
              </SelectItem>
              <SelectItem value="restore">
                <div>
                  <span>Upscale + Restore</span>
                  <p className="text-xs text-muted-foreground">
                    Best for old or damaged photos
                  </p>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {upscalePlatform === "atlascloud" &&
            "Uses AtlasCloud's premium AI to upscale images to 4K resolution with advanced detail restoration."}
          {upscalePlatform === "cloudinary" &&
            upscaleMode === "standard" &&
            "Uses AI Super Resolution to increase image quality and prevent pixelation."}
          {upscalePlatform === "cloudinary" &&
            upscaleMode === "enhance" &&
            "Upscales and enhances colors, contrast, and lighting for a vibrant result."}
          {upscalePlatform === "cloudinary" &&
            upscaleMode === "restore" &&
            "Upscales and restores old, damaged, or low-quality photos."}
        </p>
      </div>
    </div>
  );
}
```

### 2. FeatureToggles Component

```tsx
// src/components/image-tools/FeatureToggles.tsx
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ZoomIn, Scissors, Maximize2, Palette, Sparkles } from "lucide-react";

interface FeatureTogglesProps {
  enableBgRemoval: boolean;
  enableResize: boolean;
  enableUpscale: boolean;
  enableFilters: boolean;
  enableQuality: boolean;
  onToggleBgRemoval: (enabled: boolean) => void;
  onToggleResize: (enabled: boolean) => void;
  onToggleUpscale: (enabled: boolean) => void;
  onToggleFilters: (enabled: boolean) => void;
  onToggleQuality: (enabled: boolean) => void;
}

export function FeatureToggles({
  enableBgRemoval,
  enableResize,
  enableUpscale,
  enableFilters,
  enableQuality,
  onToggleBgRemoval,
  onToggleResize,
  onToggleUpscale,
  onToggleFilters,
  onToggleQuality,
}: FeatureTogglesProps) {
  const toggles = [
    { icon: Scissors, label: "BG Remove", checked: enableBgRemoval, onChange: onToggleBgRemoval },
    { icon: Maximize2, label: "Resize", checked: enableResize, onChange: onToggleResize },
    { icon: ZoomIn, label: "Upscale", checked: enableUpscale, onChange: onToggleUpscale },
    { icon: Palette, label: "Filters", checked: enableFilters, onChange: onToggleFilters },
    { icon: Sparkles, label: "Quality", checked: enableQuality, onChange: onToggleQuality },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg">
      {toggles.map(({ icon: Icon, label, checked, onChange }) => (
        <div
          key={label}
          className="flex items-center justify-between p-2 border rounded-md bg-background"
        >
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-primary" />
            <Label className="text-[11px] font-medium">{label}</Label>
          </div>
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            className="scale-75"
          />
        </div>
      ))}
    </div>
  );
}
```

### 3. Cloudinary URL Builder (utils.ts)

This builds Cloudinary transformation URLs for client-side upscaling (no edge function needed for Cloudinary):

```typescript
// src/components/image-tools/utils.ts
import { UpscaleMode, QualityPreset, OutputFormat, ArtisticFilter, ResizeMode, CropMode } from "./types";
import { RESIZE_PRESETS, QUALITY_PRESETS } from "./constants";

interface BuildUrlOptions {
  enableBgRemoval: boolean;
  enableResize: boolean;
  enableUpscale: boolean;
  enableFilters: boolean;
  enableQuality: boolean;
  edgeMode: "none" | "fine";
  resizeMode: ResizeMode;
  cropMode: CropMode;
  customWidth: number;
  customHeight: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpening: number;
  noiseReduction: number;
  artisticFilter: ArtisticFilter;
  upscaleMode: UpscaleMode;
  qualityPreset: QualityPreset;
  outputFormat: OutputFormat;
}

/**
 * Build a Cloudinary transformation URL with upscale support
 *
 * NOTE: e_upscale requires Cloudinary Plus plan.
 * This implementation uses c_scale with e_improve/e_sharpen as a
 * free-tier-compatible alternative.
 */
export function buildCloudinaryUrl(
  publicId: string,
  cloudName: string,
  options: BuildUrlOptions
): string {
  const transformations: string[] = [];

  // 1. Resize
  if (options.enableResize && options.resizeMode !== "original") {
    const preset = RESIZE_PRESETS[options.resizeMode];
    let width = preset.width;
    let height = preset.height;

    if (options.resizeMode === "custom") {
      width = options.customWidth;
      height = options.customHeight;
    }

    if (width && height) {
      transformations.push(`w_${width},h_${height},c_${options.cropMode}`);
    }
  }

  // 2. Background removal
  if (options.enableBgRemoval) {
    if (options.edgeMode === "fine") {
      transformations.push("e_background_removal:fineedges_y");
    } else {
      transformations.push("e_background_removal");
    }
  }

  // 3. Upscale (Cloudinary — 2x scale with quality enhancement)
  if (options.enableUpscale) {
    transformations.push("c_scale,w_2.0,h_2.0");

    if (options.upscaleMode === "enhance") {
      transformations.push("e_improve");
      transformations.push("e_sharpen:100");
    } else if (options.upscaleMode === "restore") {
      transformations.push("e_improve:indoor");
      transformations.push("e_sharpen:80");
    } else {
      // Standard — light sharpening
      transformations.push("e_sharpen:60");
    }
  }

  // 4. Filters
  if (options.enableFilters) {
    const filterParts: string[] = [];
    if (options.brightness !== 0) filterParts.push(`e_brightness:${options.brightness}`);
    if (options.contrast !== 0) filterParts.push(`e_contrast:${options.contrast}`);
    if (options.saturation !== 0) filterParts.push(`e_saturation:${options.saturation}`);
    if (options.blur > 0) filterParts.push(`e_blur:${options.blur * 10}`);
    if (options.sharpening > 0) filterParts.push(`e_sharpen:${Math.round(options.sharpening * 10)}`);
    if (options.noiseReduction > 0) filterParts.push(`e_improve:indoor:${Math.round(options.noiseReduction)}`);
    if (options.artisticFilter !== "none") filterParts.push(`e_art:${options.artisticFilter}`);

    if (filterParts.length > 0) {
      transformations.push(filterParts.join(","));
    }
  }

  // 5. Quality & Format
  if (options.enableQuality) {
    const qualityParts: string[] = [];
    if (options.qualityPreset === "auto") {
      qualityParts.push("q_auto");
    } else {
      qualityParts.push(`q_${QUALITY_PRESETS[options.qualityPreset].value}`);
    }
    qualityParts.push(options.outputFormat !== "auto" ? `f_${options.outputFormat}` : "f_auto");

    if (qualityParts.length > 0) {
      transformations.push(qualityParts.join(","));
    }
  }

  const transformString = transformations.join("/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}
```

### 4. Calling the Upscaler from Your Dialog

Here's the key logic for invoking the upscale from a React component:

```tsx
// Inside your ImageToolsDialog or processing component:

import { supabase } from "@/integrations/supabase/client";

// ─── AtlasCloud 4K upscaling (via edge function) ───
if (enableUpscale && upscalePlatform === "atlascloud") {
  const sourceImageUrl = file.publicUrl; // or Cloudinary URL

  const { data, error } = await supabase.functions.invoke("upscale-image", {
    body: {
      image_url: sourceImageUrl,
      platform: "atlascloud",
      scale: 4,
    },
  });

  if (error) throw new Error(error.message || "AtlasCloud upscale failed");
  if (!data?.success) throw new Error(data?.error || "AtlasCloud upscale failed");

  const resultUrl = data.upscaled_url;
  // Display or save resultUrl
}

// ─── Cloudinary upscaling (via URL transformations, no edge function) ───
if (enableUpscale && upscalePlatform === "cloudinary") {
  const url = buildCloudinaryUrl(publicId, cloudName, {
    enableBgRemoval: false,
    enableResize: false,
    enableUpscale: true,
    enableFilters: false,
    enableQuality: false,
    edgeMode: "none",
    resizeMode: "original",
    cropMode: "fill",
    customWidth: 1024,
    customHeight: 1024,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    sharpening: 0,
    noiseReduction: 0,
    artisticFilter: "none",
    upscaleMode: upscaleMode, // "standard" | "enhance" | "restore"
    qualityPreset: "auto",
    outputFormat: "auto",
  });

  // Poll until ready (Cloudinary may return 423 while processing)
  let attempts = 0;
  while (attempts < 30) {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      // resultUrl = url; — ready to display
      break;
    } else if (response.status === 423) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
    } else {
      throw new Error(`Cloudinary error: ${response.status}`);
    }
  }
}
```

---

## Admin Settings (Feature Flags)

### Admin Settings Card Component

Add this card to your admin settings page to toggle AtlasCloud visibility:

```tsx
// src/components/admin/UpscalerProviderSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ZoomIn, Cloud, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function UpscalerProviderSettings() {
  const [atlascloudEnabled, setAtlascloudEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFlag();
  }, []);

  const loadFlag = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "atlascloudUpscale")
      .single();

    if (data) setAtlascloudEnabled(data.enabled);
    setLoading(false);
  };

  const toggleFlag = async (enabled: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("key", "atlascloudUpscale");

    if (error) {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAtlascloudEnabled(enabled);
      toast({
        title: enabled ? "AtlasCloud Enabled" : "AtlasCloud Disabled",
        description: enabled
          ? "Users can now select AtlasCloud 4K upscaling"
          : "AtlasCloud option is hidden from users",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZoomIn className="w-5 h-5" />
          Upscaler Providers
        </CardTitle>
        <CardDescription>
          Configure which upscaling providers are available to users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cloudinary (always on) */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">Cloudinary</p>
              <p className="text-sm text-muted-foreground">
                Standard 2x upscale with AI enhancement (free tier)
              </p>
            </div>
          </div>
          <Switch checked={true} disabled />
        </div>

        {/* AtlasCloud (toggleable) */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-medium">AtlasCloud 4K</p>
              <p className="text-sm text-muted-foreground">
                Premium AI upscaling to 4K resolution (paid API)
              </p>
            </div>
          </div>
          <Switch
            checked={atlascloudEnabled}
            onCheckedChange={toggleFlag}
            disabled={saving}
          />
        </div>

        {atlascloudEnabled && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              ⚠️ AtlasCloud requires a valid API key set in Supabase secrets
              (ATLASCLOUD_API_KEY). Each upscale consumes AtlasCloud credits.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Using the Feature Flag in UpscaleOptions

```tsx
// In your ImageToolsDialog, read the flag and pass it:
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Inside component:
const [showAtlasCloud, setShowAtlasCloud] = useState(false);

useEffect(() => {
  const loadFlag = async () => {
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "atlascloudUpscale")
      .single();
    setShowAtlasCloud(data?.enabled ?? false);
  };
  loadFlag();
}, []);

// Then pass to UpscaleOptions:
<UpscaleOptions
  upscaleMode={upscaleMode}
  onUpscaleModeChange={setUpscaleMode}
  upscalePlatform={upscalePlatform}
  onUpscalePlatformChange={setUpscalePlatform}
  showAtlasCloud={showAtlasCloud}
/>
```

---

## API Usage Examples

### curl: Cloudinary Upscale

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/upscale-image' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your-prefix-xxxxxxxx' \
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "platform": "cloudinary",
    "scale": 2
  }'
```

### curl: AtlasCloud 4K Upscale

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/upscale-image' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your-prefix-xxxxxxxx' \
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "platform": "atlascloud",
    "scale": 4
  }'
```

### Frontend: supabase.functions.invoke

```typescript
import { supabase } from "@/integrations/supabase/client";

// Cloudinary upscale
const { data, error } = await supabase.functions.invoke("upscale-image", {
  body: {
    image_url: "https://example.com/photo.jpg",
    platform: "cloudinary",
    scale: 2,
  },
});

// AtlasCloud 4K upscale
const { data, error } = await supabase.functions.invoke("upscale-image", {
  body: {
    image_url: "https://example.com/photo.jpg",
    platform: "atlascloud",
    scale: 4,
  },
});

// Response shape:
// {
//   success: true,
//   original_url: "...",
//   upscaled_url: "...",       // ← Use this
//   platform: "cloudinary" | "atlascloud",
//   scale: 2 | 4,
//   ...
// }
```

---

## File Structure

```
your-project/
├── src/
│   └── components/
│       ├── image-tools/
│       │   ├── types.ts              ← Types (UpscaleMode, UpscalePlatform, etc.)
│       │   ├── constants.ts          ← Presets (resize, quality, filters)
│       │   ├── utils.ts              ← buildCloudinaryUrl()
│       │   ├── FeatureToggles.tsx     ← Toggle switches for each tool
│       │   ├── ImageToolsDialog.tsx   ← Main dialog (integrates everything)
│       │   └── options/
│       │       ├── UpscaleOptions.tsx ← Provider & mode selection
│       │       └── index.ts          ← Re-exports
│       └── admin/
│           └── UpscalerProviderSettings.tsx ← Admin toggle card
├── supabase/
│   ├── config.toml                   ← Add [functions.upscale-image]
│   └── functions/
│       ├── _shared/
│       │   └── cors.ts               ← Shared CORS helpers
│       └── upscale-image/
│           └── index.ts              ← Dual-provider edge function
└── docs/
    └── IMAGE-UPSCALER-IMPLEMENTATION-GUIDE.md ← This file
```

---

## Checklist

- [ ] Set Supabase secrets: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Set Supabase secret: `ATLASCLOUD_API_KEY` (if using AtlasCloud)
- [ ] Create `supabase/functions/_shared/cors.ts`
- [ ] Create `supabase/functions/upscale-image/index.ts`
- [ ] Add `[functions.upscale-image] verify_jwt = false` to `supabase/config.toml`
- [ ] Create frontend types, constants, utils
- [ ] Create `UpscaleOptions` component
- [ ] Create `FeatureToggles` component
- [ ] Integrate into your image dialog
- [ ] (Optional) Create `feature_flags` table for admin control
- [ ] (Optional) Create `UpscalerProviderSettings` admin card
- [ ] (Optional) Create `media_operations_history` table for tracking
- [ ] Deploy edge function: `npx supabase functions deploy upscale-image --project-ref YOUR_REF`
