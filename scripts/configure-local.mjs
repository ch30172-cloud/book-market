import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const file = ".env";
let contents = readFileSync(existsSync(file) ? file : ".env.example", "utf8");
for (const name of ["ADMIN_PASSWORD", "SESSION_SECRET", "OTP_SECRET"]) {
  const pattern = new RegExp(`^${name}="replace[^\\n]*`, "m");
  contents = contents.replace(
    pattern,
    `${name}="${randomBytes(32).toString("hex")}"`,
  );
}
writeFileSync(file, contents, { mode: 0o600 });
console.info(
  "Local secrets configured in .env. Existing custom secrets preserved.",
);
