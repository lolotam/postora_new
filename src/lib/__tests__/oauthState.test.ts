import { describe, it, expect } from "vitest";
import { encodeOAuthState, decodeOAuthState } from "../oauthState";

describe("oauthState Utility", () => {
    it("should encode and decode state correctly", () => {
        const state = { user_id: "u123", social_profile_id: "p456" };
        const encoded = encodeOAuthState(state);
        const decoded = decodeOAuthState(encoded);
        expect(decoded).toEqual(state);
    });

    it("should return null for invalid strings", () => {
        expect(decodeOAuthState("invalid-base64")).toBeNull();
    });
});
