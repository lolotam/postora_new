import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";

const resetPasswordPath = "src/pages/ResetPassword.tsx";
const passwordResetOptionsPath = "src/components/auth/PasswordResetOptions.tsx";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function assertTokenAbsent(relativePath: string, forbiddenToken: string): void {
  const source = readSource(relativePath);

  if (source.includes(forbiddenToken)) {
    throw new Error(`${relativePath} must not contain forbidden token ${forbiddenToken}`);
  }
}

function assertGenericExistenceMessage(relativePath: string): void {
  const source = readSource(relativePath);

  if (!source.includes("account exists") && !source.includes("email exists")) {
    throw new Error(`${relativePath} must contain a generic account or email exists message`);
  }
}

it("ResetPassword does not reference userExists", () => {
  assertTokenAbsent(resetPasswordPath, "userExists");
});

it("ResetPassword does not reference factorId", () => {
  assertTokenAbsent(resetPasswordPath, "factorId");
});

it("ResetPassword does not invoke check-user-mfa", () => {
  assertTokenAbsent(resetPasswordPath, "check-user-mfa");
});

it("PasswordResetOptions does not reference userExists", () => {
  assertTokenAbsent(passwordResetOptionsPath, "userExists");
});

it("PasswordResetOptions does not reference factorId", () => {
  assertTokenAbsent(passwordResetOptionsPath, "factorId");
});

it("PasswordResetOptions does not invoke check-user-mfa", () => {
  assertTokenAbsent(passwordResetOptionsPath, "check-user-mfa");
});

it("ResetPassword uses a generic account-existence message", () => {
  assertGenericExistenceMessage(resetPasswordPath);
});

it("PasswordResetOptions uses a generic account-existence message", () => {
  assertGenericExistenceMessage(passwordResetOptionsPath);
});
