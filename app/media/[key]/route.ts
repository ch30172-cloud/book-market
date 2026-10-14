import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { isAdmin } from "@/lib/security";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-f0-9-]+\.webp$/.test(key))
    return new Response(null, { status: 404 });
  // Do not serve images of drafts, removed listings or expired listings.
  const image = await db.image.findFirst({
    where: {
      path: key,
      listing: {
        status: "ACTIVE",
        verifiedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
    },
    select: { id: true },
  });
  let privateImage = false;
  if (!image) {
    if (
      !(await isAdmin()) ||
      !(await db.image.findUnique({
        where: { path: key },
        select: { id: true },
      }))
    )
      return new Response(null, { status: 404 });
    privateImage = true;
  }
  try {
    return new Response(new Uint8Array(await storage.get(key)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": privateImage
          ? "private, no-store"
          : "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
