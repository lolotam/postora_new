import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const CALLER_JWT = Deno.env.get("CALLER_JWT");
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/facebook-oauth`;

if (SUPABASE_URL && ANON_KEY) {
  Deno.test("facebook-oauth: handles CORS preflight request", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "OPTIONS",
      headers: { "apikey": ANON_KEY },
    });

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  });

  Deno.test("facebook-oauth: rejects unsupported methods", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "GET",
      headers: { "apikey": ANON_KEY },
    });

    assertEquals(response.status, 405);
  });

  Deno.test("facebook-oauth: returns 401 when Authorization header is missing", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({ action: "list_pages" }),
    });

    assertEquals(response.status, 401);
    assertExists((await response.json()).error);
  });
}

if (SUPABASE_URL && ANON_KEY && CALLER_JWT) {
  const authenticatedHeaders = {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${CALLER_JWT}`,
  };

  Deno.test("facebook-oauth: returns 400 for an empty request body", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: authenticatedHeaders,
    });

    assertEquals(response.status, 400);
    assertExists((await response.json()).error);
  });

  Deno.test("facebook-oauth: returns 400 for malformed JSON", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: authenticatedHeaders,
      body: "{",
    });

    assertEquals(response.status, 400);
    assertExists((await response.json()).error);
  });
}
