import fs from "node:fs";
import { it } from "vitest";

it("allows Supabase Realtime and blob workers without broad CSP wildcards", () => {
  const nginxConfig = fs.readFileSync("nginx.conf", "utf8");
  const cspDirective = nginxConfig.match(
    /^\s*add_header Content-Security-Policy "[^"]+" always;\s*$/m,
  )?.[0];

  if (!cspDirective) {
    throw new Error("Content-Security-Policy directive not found in nginx.conf");
  }

  const connectSrc = cspDirective.match(/connect-src [^;]+;/)?.[0];

  if (!connectSrc?.includes("wss://supabase.postora.cloud")) {
    throw new Error(
      `Supabase Realtime WebSocket host missing from connect-src: ${JSON.stringify(connectSrc)}`,
    );
  }

  if (!cspDirective.includes("worker-src 'self' blob:;")) {
    throw new Error(
      `Required worker-src segment missing from CSP: ${JSON.stringify(cspDirective)}`,
    );
  }

  const broadWildcard = cspDirective.match(/(?:wss|https):\/\/\*/)?.[0];

  if (broadWildcard) {
    throw new Error(
      `Broad wildcard forbidden in CSP: ${JSON.stringify(broadWildcard)}`,
    );
  }
});
