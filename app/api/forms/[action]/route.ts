import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assertOrigin,
  ipAddress,
  limit,
  token,
  adminLogin,
  adminLogout,
  requireAdmin,
} from "@/lib/security";
import { parseListing, shortText, errorMessage } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { storage, processUploads } from "@/lib/storage";
import { suspiciousText } from "@/lib/moderation";
import { expiryDate, publicationStatus } from "@/lib/lifecycle";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { Prisma } from "@prisma/client";
import { boundedForm } from "@/lib/form";
export const runtime = "nodejs";
function go(path: string, message?: string, error = false) {
  const url = new URL(path, process.env.APP_URL || "http://localhost:3000");
  if (message) url.searchParams.set(error ? "error" : "success", message);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  let back = "/";
  let uploaded: string[] = [];
  let committed = false;
  try {
    await assertOrigin();
    const ip = await ipAddress();
    // Reject oversized bodies before loading or decoding image uploads.
    if (Number(request.headers.get("content-length") || 0) > 17 * 1024 * 1024)
      throw new Error("הקבצים גדולים מדי");
    await limit("form-ip", ip, 100, 3600);
    const form = await boundedForm(request);
    const value = (k: string) =>
      typeof form.get(k) === "string" ? String(form.get(k)) : "";
    if (action === "create") {
      back = "/post";
      await limit("post-ip", ip, 10, 3600);
      const data = parseListing(form);
      await limit("post-phone", data.phone, 10, 86400);
      if (await db.blockedPhone.findUnique({ where: { phone: data.phone } }))
        throw new Error("לא ניתן לפרסם ממספר זה");
      const count = await db.listing.count({
        where: {
          phone: data.phone,
          status: { in: ["ACTIVE", "PENDING"] },
          expiresAt: { gt: new Date() },
        },
      });
      if (count >= 10)
        throw new Error("ניתן לפרסם עד 10 מודעות פעילות למספר טלפון");
      if (value("website")) throw new Error("לא ניתן לפרסם את המודעה");
      const suspicious = await suspiciousText(Object.values(data).join(" "));
      uploaded = await processUploads(form);
      const listing = await db.listing.create({
        data: {
          ...data,
          suspicious,
          manageToken: token(),
          expiresAt: expiryDate(),
          images: { create: uploaded.map((path) => ({ path })) },
        },
      });
      committed = true;
      back = `/verify/${listing.manageToken}`;
      await issueOtp(listing.id, ip, value("channel"));
      return go(back, "קוד אימות נשלח. בסביבת פיתוח הקוד מופיע במסוף השרת.");
    }
    if (
      action === "otp-send" ||
      action === "otp-verify" ||
      action === "manage"
    ) {
      const manageToken = value("token");
      if (!/^[a-f0-9]{64}$/.test(manageToken)) throw new Error("קישור לא תקין");
      const listing = await db.listing.findUnique({
        where: { manageToken },
        include: { images: true },
      });
      if (!listing) throw new Error("המודעה אינה קיימת");
      back = `/${action === "manage" ? "manage" : "verify"}/${manageToken}`;
      if (action === "otp-send") {
        await issueOtp(listing.id, ip, value("channel"));
        return go(back, "נשלח קוד חדש");
      }
      if (action === "otp-verify") {
        await limit("verify-ip", ip, 30, 3600);
        await verifyOtp(listing.id, value("code"));
        return go(
          `/manage/${manageToken}`,
          "הטלפון אומת בהצלחה. שמרו את קישור הניהול.",
        );
      }
      if (!listing.verifiedAt || listing.status === "REMOVED")
        throw new Error("לא ניתן לשנות מודעה זו");
      const operation = value("operation");
      if (operation === "delete") {
        await db.listing.update({
          where: { id: listing.id },
          data: { status: "REMOVED" },
        });
        await db.image.deleteMany({ where: { listingId: listing.id } });
        await Promise.all(listing.images.map((i) => storage.remove(i.path)));
        return go(back, "המודעה הוסרה");
      }
      if (await db.blockedPhone.findUnique({ where: { phone: listing.phone } }))
        throw new Error("לא ניתן לפרסם ממספר זה");
      if (operation === "sold") {
        await db.listing.update({
          where: { id: listing.id },
          data: { status: "SOLD" },
        });
        return go(back, "המודעה סומנה כנמכרה");
      }
      if (operation === "extend") {
        if (!["ACTIVE", "PENDING", "EXPIRED"].includes(listing.status))
          throw new Error("לא ניתן להאריך מודעה שנמכרה");
        await db.$transaction(
          async (tx) => {
            const count = await tx.listing.count({
              where: {
                id: { not: listing.id },
                phone: listing.phone,
                verifiedAt: { not: null },
                status: { in: ["ACTIVE", "PENDING"] },
                expiresAt: { gt: new Date() },
              },
            });
            if (count >= 10) throw new Error("ניתן לפרסם עד 10 מודעות פעילות");
            await tx.listing.update({
              where: { id: listing.id },
              data: {
                expiresAt: expiryDate(),
                expiryNotifiedAt: null,
                status:
                  listing.status === "EXPIRED"
                    ? publicationStatus(listing.suspicious)
                    : listing.status,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return go(back, "המודעה הוארכה ב־30 יום");
      }
      if (operation === "edit") {
        form.set("phone", listing.phone); // Phone changes require a new verified listing.
        const data = parseListing(form);
        const suspicious = await suspiciousText(Object.values(data).join(" "));
        const hasFiles = form
          .getAll("images")
          .some((f) => typeof f !== "string" && f.size > 0);
        if (hasFiles) uploaded = await processUploads(form);
        await db.$transaction(async (tx) => {
          await tx.listing.update({
            where: { id: listing.id },
            data: {
              ...data,
              suspicious,
              status:
                listing.status === "SOLD" || listing.status === "EXPIRED"
                  ? listing.status
                  : publicationStatus(suspicious),
            },
          });
          if (hasFiles) {
            await tx.image.deleteMany({ where: { listingId: listing.id } });
            await tx.image.createMany({
              data: uploaded.map((path) => ({ path, listingId: listing.id })),
            });
          }
        });
        committed = true;
        if (hasFiles)
          await Promise.all(listing.images.map((i) => storage.remove(i.path)));
        return go(back, "השינויים נשמרו");
      }
      throw new Error("פעולה לא תקינה");
    }
    if (action === "report") {
      const id = value("listingId");
      back = `/listing/${encodeURIComponent(id)}/report`;
      await limit("report-ip", ip, 5, 3600);
      const listing = await db.listing.findFirst({
        where: {
          id,
          status: "ACTIVE",
          verifiedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
      });
      if (!listing) throw new Error("המודעה אינה זמינה");
      await db.report.create({
        data: { listingId: id, reason: shortText(form.get("reason")) },
      });
      return go(back, "תודה. הדיווח נשלח לבדיקה.");
    }
    if (action === "admin-login") {
      back = "/admin";
      await limit("admin-login", ip, 5, 900);
      await adminLogin(value("password"));
      return go("/admin");
    }
    if (action === "admin-logout") {
      await adminLogout();
      return go("/admin");
    }
    if (action === "admin") {
      back = "/admin";
      await requireAdmin();
      const operation = value("operation"),
        id = value("id");
      if (operation === "handle-report") {
        await db.report.update({ where: { id }, data: { handled: true } });
        return go(back, "הדיווח סומן כטופל");
      }
      if (operation === "block") {
        const phone = normalizePhone(value("phone"));
        const reason = shortText(form.get("reason"));
        await db.$transaction([
          db.blockedPhone.upsert({
            where: { phone },
            create: { phone, reason },
            update: { reason },
          }),
          db.listing.updateMany({
            where: { phone, status: { in: ["ACTIVE", "PENDING"] } },
            data: { status: "REMOVED" },
          }),
        ]);
        return go(back, "המספר נחסם ומודעותיו הוסרו");
      }
      const listing = await db.listing.findUniqueOrThrow({ where: { id } });
      if (operation === "approve") {
        if (
          !listing.verifiedAt ||
          listing.status !== "PENDING" ||
          listing.expiresAt <= new Date()
        )
          throw new Error("לא ניתן לאשר: נדרשת מודעה ממתינה, מאומתת ובתוקף");
        if (
          await db.blockedPhone.findUnique({ where: { phone: listing.phone } })
        )
          throw new Error("מספר זה חסום");
        await db.listing.update({ where: { id }, data: { status: "ACTIVE" } });
      } else if (operation === "remove" || operation === "sold")
        await db.listing.update({
          where: { id },
          data: { status: operation === "remove" ? "REMOVED" : "SOLD" },
        });
      else throw new Error("פעולה לא תקינה");
      return go(back, "המודעה עודכנה");
    }
    throw new Error("פעולה לא קיימת");
  } catch (error) {
    if (!committed) await Promise.all(uploaded.map((k) => storage.remove(k)));
    return go(back, errorMessage(error), true);
  }
}
