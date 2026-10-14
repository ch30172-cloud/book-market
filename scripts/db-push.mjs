import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL || "";
if (url.startsWith("file:")) {
  const file = resolve("prisma", url.slice(5));
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, "", { flag: "wx" });
}
// Creating the empty file first avoids a Windows Prisma SQLite creation failure.
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "db", "push"],
  { env: process.env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
