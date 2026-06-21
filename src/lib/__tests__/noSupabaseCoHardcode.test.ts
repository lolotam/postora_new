import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";

const hostedUrlPattern = /\$\{[A-Za-z0-9_$.]*\}\.supabase\.co/;
const selfHostedDomain = "self-hosted-curemed.supabase.co";

function collectSourceFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);

      if (fullPath.includes("__tests__")) return [];
      if (entry.isDirectory()) return collectSourceFiles(fullPath);
      if (!entry.isFile()) return [];
      if (!/\.tsx?$/.test(entry.name)) return [];
      if (/\.(?:test|spec)\./.test(entry.name)) return [];

      return [fullPath];
    })
    .sort();
}

it("no frontend source hardcodes a *.supabase.co hosted URL from an env project id", () => {
  const sourceRoot = path.resolve(process.cwd(), "src");
  const sourceFiles = collectSourceFiles(sourceRoot);

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    const hostedUrlMatch = source.match(hostedUrlPattern)?.[0];
    const selfHostedDomainMatch = source.includes(selfHostedDomain)
      ? selfHostedDomain
      : undefined;
    const offendingText = hostedUrlMatch ?? selfHostedDomainMatch;

    if (offendingText) {
      const relativePath = path.relative(process.cwd(), filePath);
      throw new Error(
        `Forbidden Supabase hosted URL in ${relativePath}: ${JSON.stringify(offendingText)}`,
      );
    }
  }
});
