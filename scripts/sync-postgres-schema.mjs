import { readFileSync, writeFileSync } from "node:fs";
writeFileSync(
  "prisma/schema.postgres.prisma",
  readFileSync("prisma/schema.prisma", "utf8").replace(
    'provider = "sqlite"',
    'provider = "postgresql"',
  ),
);
console.info("PostgreSQL schema synchronized from SQLite models.");
