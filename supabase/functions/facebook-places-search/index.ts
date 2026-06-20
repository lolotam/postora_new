import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string };
    const { query, account_id, platform } = await req.json();

    console.log(`[facebook-places-search] query="${query}", account_id=${account_id || "none"}, user=${user.id}`);

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ places: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Try Meta Pages Search API if account_id is provided ───
    if (account_id) {
      const metaResult = await searchMetaPlaces(query, account_id, user.id, SUPABASE_URL, platform);
      if (metaResult) {
        return new Response(JSON.stringify(metaResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Fallback: OpenStreetMap Nominatim ───
    return await searchNominatim(query, corsHeaders);
  } catch (error) {
    console.error("[facebook-places-search] Error:", error);
    return new Response(
      JSON.stringify({
        places: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Meta Pages Search ───
async function searchMetaPlaces(
  query: string,
  accountId: string,
  userId: string,
  supabaseUrl: string,
  platform?: "facebook" | "instagram"
): Promise<{ places: any[]; source: string; error?: string } | null> {
  try {
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    const { data: accountData, error: accountError } = await adminClient
      .from("social_accounts")
      .select("access_token, platform, account_metadata")
      .eq("id", accountId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (accountError || !accountData?.access_token) {
      console.warn("[facebook-places-search] Account lookup failed:", accountError?.message);
      return null;
    }

    const userToken = accountData.account_metadata?.user_token;
    const tokensToTry = userToken
      ? [userToken, accountData.access_token]
      : [accountData.access_token];

    for (const token of tokensToTry) {
      const metaUrl = new URL("https://graph.facebook.com/v22.0/pages/search");
      metaUrl.searchParams.set("q", query);
      metaUrl.searchParams.set("fields", "id,name,location,link,category,category_list,verification_status");
      metaUrl.searchParams.set("access_token", token);

      console.log(`[facebook-places-search] Calling Meta Pages Search API for: "${query}"`);
      const metaResponse = await fetch(metaUrl.toString());
      const metaData = await metaResponse.json();

      console.log(`[facebook-places-search] Meta API status=${metaResponse.status}, hasError=${!!metaData.error}, results=${metaData.data?.length || 0}`);

      if (metaData.error) {
        const errCode = metaData.error.code;
        const errMsg = metaData.error.message;
        console.warn(`[facebook-places-search] Meta error: code=${errCode}, message=${errMsg}`);

        // Permission error — return actionable reconnect message
        if (errCode === 10 || errCode === 200 || errMsg?.includes("permission")) {
          return {
            places: [],
            source: "meta",
            error: "RECONNECT_REQUIRED",
          };
        }
        // Try next token
        continue;
      }

      if (metaData.data && metaData.data.length > 0) {
        const placesWithLocation = metaData.data.filter((page: any) => page.location);
        if (placesWithLocation.length > 0) {
          // Heuristic FB taggability: must have location + place-like category and not osm
          const placeLikeCategory = (cat?: string, list?: any[]) => {
            const hay = [cat, ...(Array.isArray(list) ? list.map((c: any) => c?.name) : [])]
              .filter(Boolean).join(" ").toLowerCase();
            return /place|local|landmark|restaurant|cafe|hotel|store|business|park|attraction|airport|venue|city|town/.test(hay);
          };

          // Pre-check IG eligibility for top 8 (paid by latency budget; cheap calls)
          const top = placesWithLocation.slice(0, 8);
          const eligibility: Record<string, { ig?: boolean; reason?: string }> = {};
          if (platform === "instagram") {
            await Promise.all(top.map(async (page: any) => {
              try {
                const res = await fetch(
                  `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,location,is_eligible_for_location_tag&access_token=${encodeURIComponent(token)}`
                );
                const data = await res.json();
                const loc = data?.location;
                const eligible = data?.is_eligible_for_location_tag === true && !!loc && (loc.latitude || loc.longitude);
                eligibility[page.id] = {
                  ig: !!eligible,
                  reason: eligible ? undefined : (data?.is_eligible_for_location_tag === false ? "not_eligible_flag" : "missing_coordinates"),
                };
              } catch {
                eligibility[page.id] = { ig: undefined, reason: "eligibility_check_failed" };
              }
            }));
          }

          const places = placesWithLocation.map((page: any) => {
            const fbTaggable = !String(page.id).startsWith("osm_") && !!page.location && placeLikeCategory(page.category, page.category_list);
            const igInfo = eligibility[page.id];
            return {
              id: page.id,
              name: page.name,
              address: page.location?.street || null,
              city: page.location?.city || null,
              country: page.location?.country || null,
              latitude: page.location?.latitude ?? null,
              longitude: page.location?.longitude ?? null,
              source: "facebook",
              taggable_on_facebook: fbTaggable,
              taggable_on_instagram:
                platform === "instagram" ? (typeof igInfo?.ig === "boolean" ? igInfo.ig : null) : null,
              eligibility_reason: igInfo?.reason,
            };
          });
          console.log(`[facebook-places-search] Meta returned ${places.length} places (platform=${platform || "none"})`);
          return { places, source: "meta" };
        }
      }
    }

    console.log("[facebook-places-search] Meta search returned no usable results, falling back");
    return null;
  } catch (err) {
    console.warn("[facebook-places-search] Meta search failed:", err);
    return null;
  }
}

// ─── Nominatim Fallback ───
async function searchNominatim(
  query: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log(`[facebook-places-search] Using Nominatim fallback for: "${query}"`);

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", query);
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("limit", "10");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("featuretype", "settlement");

  const hasArabic = /[\u0600-\u06FF]/.test(query);
  nominatimUrl.searchParams.set("accept-language", hasArabic ? "ar" : "en");

  const searchResponse = await fetch(nominatimUrl.toString(), {
    headers: {
      "User-Agent": "Postora/1.0 (contact: support@postora.cloud; https://postora.cloud)",
      "Accept": "application/json",
    },
  });

  if (searchResponse.status === 429) {
    console.warn("[facebook-places-search] Nominatim rate-limited (429)");
    return new Response(JSON.stringify({
      places: [],
      error: "Location search is temporarily rate-limited. Please wait a moment and try again.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!searchResponse.ok) {
    console.error("[facebook-places-search] Nominatim error:", searchResponse.status);
    return new Response(JSON.stringify({
      places: [],
      error: "Location search temporarily unavailable. Please try again.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const searchData = await searchResponse.json();

  // Filter to prioritize meaningful place types (cities, countries, states, towns)
  const validTypes = ["city", "town", "village", "state", "country", "administrative", "suburb", "municipality", "hamlet"];
  const filtered = (searchData || []).filter((item: any) => {
    const type = item.type || "";
    const category = item.class || "";
    return validTypes.includes(type) || category === "place" || category === "boundary";
  });

  // Use filtered results if available, otherwise fall back to all results
  const resultsToUse = filtered.length > 0 ? filtered : searchData || [];

  const places = resultsToUse.map((item: any) => ({
    id: `osm_${item.osm_type}_${item.osm_id}`,
    name: item.display_name?.split(",")[0] || item.name || "Unknown",
    city: item.address?.city || item.address?.town || item.address?.village || null,
    country: item.address?.country || null,
  }));

  return new Response(JSON.stringify({ places, source: "nominatim" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
