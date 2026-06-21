// Frontend-safe Supabase Studio URL (admin "open dashboard" links).
// Public URL only — no secrets. Defaults to the self-hosted Studio.
export const SUPABASE_STUDIO_URL: string =
  (import.meta.env.VITE_SUPABASE_STUDIO_URL as string | undefined) ||
  "https://supabase.postora.cloud";
