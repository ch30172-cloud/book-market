import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
const directory = resolve("test-results", randomUUID());
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, "integration.db"), "");
const env = {
  ...process.env,
  DATABASE_URL: `file:${resolve(directory, "integration.db").replaceAll("\\", "/")}`,
  OTP_SECRET: "integration-only-otp-secret-32-characters",
  SESSION_SECRET: "integration-only-session-secret-32-chars",
  REQUIRE_ADMIN_APPROVAL: "false",
  OTP_PROVIDER: "mock",
};
try {
  for (const args of [
    ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
    ["--import", "tsx", "--test", "tests/integration/flow.test.ts"],
  ]) {
    const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      break;
    }
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
