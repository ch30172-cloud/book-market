import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Notice } from "@/components/Notice";
import { ListingFields } from "@/components/ListingFields";
import { statuses } from "@/lib/labels";
export const metadata = {
  title: "ניהול המודעה שלי",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Manage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { token } = await params;
  const listing = await db.listing.findUnique({
    where: { manageToken: token },
  });
  if (!listing) notFound();
  if (!listing.verifiedAt && listing.status !== "REMOVED")
    redirect(`/verify/${token}`);
  const messages = await searchParams;
  return (
    <div className="container page narrow">
      <h1>המודעה שלי</h1>
      <Notice {...messages} />
      <div className="panel">
        <h2>{listing.title}</h2>
        <p>
          מצב: <strong>{statuses[listing.status]}</strong> · תוקף עד{" "}
          {listing.expiresAt.toLocaleDateString("he-IL", {
            timeZone: "Asia/Jerusalem",
          })}
        </p>
        {listing.status === "PENDING" && (
          <p className="notice">המודעה ממתינה לאישור מנהל.</p>
        )}
        <p className="small muted">
          שמרו את הקישור הזה. הוא מאפשר לערוך ולהסיר את המודעה ללא סיסמה. אין
          להעביר אותו לאחרים.
        </p>
        <a className="manage-link" href={`/manage/${token}`}>
          {process.env.APP_URL || "http://localhost:3000"}/manage/{token}
        </a>
        {listing.status !== "REMOVED" && (
          <div className="actions">
            {[
              ["sold", "הספר נמכר"],
              ["extend", "הארכה ב־30 יום"],
              ["delete", "מחיקת מודעה"],
            ].map(([op, label]) => (
              <form action="/api/forms/manage" method="post" key={op}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="operation" value={op} />
                <button className={op === "delete" ? "danger" : "secondary"}>
                  {label}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
      {listing.status !== "REMOVED" && (
        <details className="panel wanted">
          <summary>עריכת פרטי המודעה</summary>
          <form
            action="/api/forms/manage"
            method="post"
            encType="multipart/form-data"
            className="form-stack"
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="operation" value="edit" />
            <ListingFields values={listing} />
            <p className="small muted">
              הטלפון המאומת נשאר קבוע. החלפת תמונות תחליף את כל התמונות הקיימות.
              שינויים עשויים להצריך אישור מחדש.
            </p>
            <button>שמירת שינויים</button>
          </form>
        </details>
      )}
    </div>
  );
}
