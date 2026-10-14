import { db } from "@/lib/db";
import { assertOrigin, ipAddress, limit } from "@/lib/security";
import { displayPhone } from "@/lib/phone";
import { errorMessage } from "@/lib/validation";
export const dynamic = "force-dynamic";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let content = "",
    status = 200;
  try {
    await assertOrigin();
    const ip = await ipAddress();
    const { id } = await params;
    await limit("reveal-ip", ip, 20, 3600);
    await limit("reveal-listing-ip", `${id}:${ip}`, 5, 3600);
    const listing = await db.listing.findFirst({
      where: {
        id,
        status: "ACTIVE",
        verifiedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
      select: { phone: true, title: true },
    });
    if (!listing) return new Response("המודעה אינה זמינה", { status: 404 });
    const text = encodeURIComponent(
      `שלום, ראיתי בספר חוזר את הספר ״${listing.title}״. האם הוא עדיין זמין?`,
    );
    content = `<p>פרטי קשר עבור</p><h1>${escape(listing.title)}</h1><p class="number" dir="ltr">${escape(displayPhone(listing.phone))}</p><div class="actions"><a class="button" href="tel:${listing.phone}">התקשר</a><a class="button" href="https://wa.me/${listing.phone.slice(1)}?text=${text}" rel="noreferrer">וואטסאפ</a></div><p>מתאמים איסוף ישירות עם המוכר.</p><a href="/listing/${encodeURIComponent(id)}">חזרה למודעה ←</a>`;
  } catch (error) {
    status = 429;
    content = `<h1>לא ניתן להציג כרגע</h1><p>${escape(errorMessage(error))}</p><a href="/">חזרה ללוח</a>`;
  }
  // This POST-only document works with scripts disabled. Never cache revealed data.
  return new Response(
    `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>יצירת קשר | ספר חוזר</title><style>body{font:18px/1.7 Arial,sans-serif;background:#faf9f6;color:#244c40;margin:0;padding:30px}main{max-width:600px;margin:60px auto;background:white;border:1px solid #dfe5d9;border-radius:12px;padding:30px}h1{font-size:28px}.number{font-size:32px;font-weight:bold;text-align:right}.actions{display:flex;gap:12px}.button{background:#244c40;color:white;border-radius:7px;padding:13px 24px;text-decoration:none;display:inline-block}a{color:#244c40}</style></head><body><main>${content}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
