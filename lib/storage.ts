import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
export interface ImageStorage {
  put(bytes: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
const root = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage",
  );
function safeKey(key: string) {
  if (!/^[a-f0-9-]+\.webp$/.test(key)) throw new Error("Invalid image key");
  return key;
}
export const storage: ImageStorage = {
  async put(bytes) {
    const key = `${randomUUID()}.webp`;
    await mkdir(root(), { recursive: true });
    await writeFile(path.join(root(), key), bytes, { flag: "wx" });
    return key;
  },
  async get(key) {
    return readFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ root(),
        safeKey(key),
      ),
    );
  },
  async remove(key) {
    await unlink(
      path.join(/* turbopackIgnore: true */ root(), safeKey(key)),
    ).catch(() => undefined);
  },
};
export async function processUploads(form: FormData) {
  const files = form
    .getAll("images")
    .filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length < 1 || files.length > 3)
    throw new Error("יש לצרף בין תמונה אחת לשלוש תמונות");
  const keys: string[] = [];
  try {
    for (const file of files) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("תמונות JPG, PNG או WebP בלבד, עד 5MB לתמונה");
      const source = sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const meta = await source.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format || "") ||
        (meta.pages || 1) > 1
      )
        throw new Error("קובץ תמונה אינו נתמך");
      // sharp strips EXIF and other metadata unless explicitly asked to retain it.
      const bytes = await source
        .rotate()
        .resize({
          width: 1000,
          height: 1400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
      keys.push(await storage.put(bytes));
    }
    return keys;
  } catch (error) {
    await Promise.all(keys.map((k) => storage.remove(k)));
    throw error;
  }
}
