import { readFile } from "node:fs/promises";
export async function suspiciousText(text: string) {
  const words: unknown = JSON.parse(
    await readFile(
      /* turbopackIgnore: true */ process.env.KEYWORD_BLOCKLIST_FILE ||
        "./config/blocked-keywords.json",
      "utf8",
    ),
  );
  if (!Array.isArray(words) || !words.every((w) => typeof w === "string"))
    throw new Error("Invalid keyword blocklist");
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u0591-\u05c7\u200b-\u200f\u202a-\u202e]/g, "")
    .toLowerCase();
  return words.some(
    (w) => w && normalized.includes(w.normalize("NFKC").toLowerCase()),
  );
}
