import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertOrigin, ipAddress, limit } from "@/lib/security";
import { normalizePhone } from "@/lib/phone";
import { shortText, errorMessage } from "@/lib/validation";
import { boundedForm } from "@/lib/form";
export async function POST(request: Request) {
  const url = new URL("/", process.env.APP_URL || "http://localhost:3000");
  try {
    await assertOrigin();
    await limit("wanted", await ipAddress(), 3, 86400);
    const f = await boundedForm(request, 4096);
    const phone = normalizePhone(String(f.get("phone") || ""));
    if (await db.blockedPhone.findUnique({ where: { phone } }))
      throw new Error("לא ניתן לשמור בקשה");
    await db.wanted.create({
      data: { phone, keywords: shortText(f.get("keywords"), 120) },
    });
    url.searchParams.set(
      "success",
      "הבקשה נשמרה. שירות ההתראות עדיין אינו פעיל.",
    );
  } catch (error) {
    url.searchParams.set("error", errorMessage(error));
  }
  return NextResponse.redirect(url, 303);
}
