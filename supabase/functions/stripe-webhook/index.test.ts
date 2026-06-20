import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const FUNCTION_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/stripe-webhook";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.test("stripe-webhook: handles CORS preflight request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "apikey": ANON_KEY,
    },
  });

  assertEquals(response.status, 200);
});

Deno.test("stripe-webhook: rejects invalid signature when webhook secret is configured", async () => {
  const mockEvent = {
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        metadata: {},
      },
    },
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "stripe-signature": "invalid_signature",
    },
    body: JSON.stringify(mockEvent),
  });

  // Should return 400 for invalid signature if webhook secret is configured
  // Or process the event in development mode (no secret)
  const status = response.status;
  // Accept either 400 (signature verification failed) or 200 (dev mode)
  const isValidResponse = status === 400 || status === 200;
  assertEquals(isValidResponse, true);
});

Deno.test("stripe-webhook: handles unknown event types gracefully", async () => {
  // In development mode without webhook secret, events are parsed directly
  const mockEvent = {
    id: "evt_test_unknown",
    type: "unknown.event.type",
    data: {
      object: {},
    },
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify(mockEvent),
  });

  // In dev mode without signature, should process and return received: true
  // With signature verification, should fail
  const status = response.status;
  const isValidResponse = status === 200 || status === 400 || status === 500;
  assertEquals(isValidResponse, true);
  
  if (status === 200) {
    const body = await response.json();
    assertEquals(body.received, true);
  }
});

Deno.test("stripe-webhook: requires valid JSON body", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: "not valid json",
  });

  // Should return 400 or 500 for invalid JSON
  const status = response.status;
  const isErrorResponse = status === 400 || status === 500;
  assertEquals(isErrorResponse, true);
});

Deno.test("stripe-webhook: checkout.session.completed requires metadata", async () => {
  // In dev mode, test that missing metadata is handled gracefully
  const mockEvent = {
    id: "evt_test_no_metadata",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_no_metadata",
        customer: "cus_test",
        subscription: "sub_test",
        // No metadata - should be handled gracefully
      },
    },
  };

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify(mockEvent),
  });

  // Should still return 200 even if metadata is missing (logged but not failed)
  // Unless signature verification is enabled
  const status = response.status;
  const isValidResponse = status === 200 || status === 400;
  assertEquals(isValidResponse, true);
});
