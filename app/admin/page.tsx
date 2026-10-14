import { AdminListingPreview } from "@/components/AdminListingPreview";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/security";
import { statuses } from "@/lib/labels";
import { Status } from "@prisma/client";
import { Notice } from "@/components/Notice";
export const metadata = {
  title: "ניהול הלוח",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const params = await searchParams;
  if (!(await isAdmin()))
    return (
      <div className="container page narrow">
        <h1>כניסת מנהל</h1>
        <Notice error={params.error} />
        <form
          action="/api/forms/admin-login"
          method="post"
          className="panel form-stack"
        >
          <label>
            סיסמה
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <button>כניסה</button>
        </form>
      </div>
    );
  const status =
    params.status && Object.hasOwn(statuses, params.status)
      ? (params.status as Status)
      : undefined;
  const page = Math.max(1, Math.min(10000, parseInt(params.page || "1") || 1));
  const [listings, reports, blocked, total] = await Promise.all([
    db.listing.findMany({
      where: { status },
      include: {
        images: { select: { path: true } },
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
    db.report.findMany({
      where: { handled: false },
      include: { listing: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.blockedPhone.findMany({ take: 50 }),
    db.listing.count({ where: { status } }),
  ]);
  return (
    <div className="container page">
      <div className="results-heading">
        <h1>ניהול הלוח</h1>
        <form action="/api/forms/admin-logout" method="post">
          <button className="secondary">יציאה</button>
        </form>
      </div>
      <Notice error={params.error} success={params.success} />
      <nav className="admin-nav">
        <a className="button secondary" href="/admin">
          הכול ({total})
        </a>
        {Object.entries(statuses).map(([v, l]) => (
          <a
            className={`button ${status === v ? "" : "secondary"}`}
            key={v}
            href={`/admin?status=${v}`}
          >
            {l}
          </a>
        ))}
      </nav>
      <section className="panel">
        <h2>מודעות</h2>
        {listings.length ? (
          listings.map((l) => (
            <div className="admin-row" key={l.id}>
              <div>
                <strong>{l.title}</strong>
                <p>
                  {statuses[l.status]} ·{" "}
                  {l.verifiedAt ? "טלפון אומת" : "טרם אומת"} · {l.city} ·{" "}
                  <bdi>{l.phone}</bdi>
                  {l.suspicious ? " · מילת סינון" : ""} · {l._count.reports}{" "}
                  דיווחים
                </p>
                <AdminListingPreview listing={l} />
              </div>
              <div className="actions">
                {[
                  ["approve", "אישור"],
                  ["sold", "נמכרה"],
                  ["remove", "הסרה"],
                ].map(([operation, label]) => (
                  <form action="/api/forms/admin" method="post" key={operation}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="operation" value={operation} />
                    <button className="secondary">{label}</button>
                  </form>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="muted">אין מודעות להצגה.</p>
        )}
        <nav className="pagination">
          {page > 1 && (
            <a href={`/admin?page=${page - 1}&status=${status || ""}`}>הקודם</a>
          )}
          <span>עמוד {page}</span>
          {page * 30 < total && (
            <a href={`/admin?page=${page + 1}&status=${status || ""}`}>הבא</a>
          )}
        </nav>
      </section>
      <section className="panel wanted">
        <h2>דיווחים הממתינים לטיפול</h2>
        {reports.length ? (
          reports.map((r) => (
            <div className="admin-row" key={r.id}>
              <div>
                <strong>{r.listing.title}</strong>
                <p>{r.reason}</p>
              </div>
              <form action="/api/forms/admin" method="post">
                <input type="hidden" name="operation" value="handle-report" />
                <input type="hidden" name="id" value={r.id} />
                <button className="secondary">סימון כטופל</button>
              </form>
            </div>
          ))
        ) : (
          <p className="muted">אין דיווחים פתוחים.</p>
        )}
      </section>
      <section className="panel wanted">
        <h2>חסימת מספר טלפון</h2>
        <form action="/api/forms/admin" method="post" className="form-grid">
          <input type="hidden" name="operation" value="block" />
          <label>
            מספר טלפון
            <input name="phone" type="tel" dir="ltr" required maxLength={30} />
          </label>
          <label>
            סיבה
            <input name="reason" required minLength={2} maxLength={300} />
          </label>
          <button className="danger">חסימת המספר והסרת מודעותיו</button>
        </form>
        {blocked.map((b) => (
          <p key={b.phone} className="small">
            <bdi>{b.phone}</bdi> — {b.reason}
          </p>
        ))}
      </section>
    </div>
  );
}
