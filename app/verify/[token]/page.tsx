import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Notice } from "@/components/Notice";
export const metadata = {
  title: "אימות טלפון",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Verify({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { token } = await params;
  const listing = await db.listing.findUnique({
    where: { manageToken: token },
    select: { title: true, verifiedAt: true, status: true },
  });
  if (!listing || listing.status === "REMOVED") notFound();
  if (listing.verifiedAt) redirect(`/manage/${token}`);
  const messages = await searchParams;
  return (
    <div className="container page narrow">
      <h1>עוד רגע, הספר על הלוח</h1>
      <p className="muted">
        אימות הטלפון עבור ״{listing.title}״. הקוד תקף ל־10 דקות.
      </p>
      <Notice {...messages} />
      <div className="panel form-stack">
        <form
          action="/api/forms/otp-verify"
          method="post"
          className="form-stack"
        >
          <input name="token" type="hidden" value={token} />
          <label>
            קוד אימות בן 6 ספרות
            <input
              name="code"
              pattern="[0-9]{6}"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              minLength={6}
              required
            />
          </label>
          <button>אימות ופרסום</button>
        </form>
        <form action="/api/forms/otp-send" method="post" className="form-stack">
          <input name="token" type="hidden" value={token} />
          <label>
            לא קיבלתם קוד?
            <select name="channel">
              <option value="sms">שלחו שוב במסרון</option>
              <option value="voice">קבלו קוד בשיחה קולית</option>
            </select>
          </label>
          <button className="secondary">שליחת קוד חדש</button>
        </form>
        <p className="small muted">
          שמרו את הכתובת הזאת כדי להשלים את האימות מאוחר יותר. זהו קישור אישי
          וסודי.
        </p>
      </div>
    </div>
  );
}
