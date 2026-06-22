import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const FUNCTION_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/stripe-webhook";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.test("stripe-webhook: handles CORS preflight request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { apikey: ANON_KEY },
  });

  assertEquals(response.status, 200);
});

Deno.test("stripe-webhook: rejects invalid signature", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "stripe-signature": "invalid_signature",
    },
    body: JSON.stringify({ id: "evt_test_123", type: "checkout.session.completed" }),
  });

  assertEquals(response.status, 400);
});

Deno.test("stripe-webhook: rejects missing signature", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ id: "evt_test_missing", type: "unknown.event.type" }),
  });

  assertEquals(response.status === 400 || response.status === 401, true);
});

Deno.test("stripe-webhook: does not process unsigned unknown events", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ id: "evt_test_unknown", type: "unknown.event.type" }),
  });

  assertEquals(response.status === 200, false);
});

Deno.test("stripe-webhook: rejects unsigned invalid JSON before parsing", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: "not valid json",
  });

  assertEquals(response.status === 200, false);
});

Deno.test("stripe-webhook: does not process unsigned checkout metadata", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      id: "evt_test_no_metadata",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_no_metadata" } },
    }),
  });

  assertEquals(response.status === 200, false);
});
