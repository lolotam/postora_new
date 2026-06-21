import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientSource = fs.readFileSync(
  path.resolve(testDirectory, "../supabase/client.ts"),
  "utf8",
);

describe("Supabase client credential regression guard", () => {
  it("keeps the client env-driven and fail-closed after the hosted-project leak fix", () => {
    expect(clientSource).not.toContain("efruibswazzuuupgyzmf");
    expect(clientSource).not.toContain(
      "A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA",
    );
    expect(clientSource).toContain("import.meta.env.VITE_SUPABASE_URL");
    expect(clientSource).toContain(
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY",
    );
    expect(clientSource).toContain("Missing");
    expect(clientSource).toMatch(
      /if\s*\(\s*!SUPABASE_URL\s*\)\s*\{[\s\S]{0,250}throw new Error/,
    );
  });
});
