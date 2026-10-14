import { Prisma, Category, Condition } from "@prisma/client";
import { db } from "@/lib/db";
import { categories, conditions, priceLabel } from "@/lib/labels";
import { BookIcon, SearchIcon } from "@/components/Icons";
import { Notice } from "@/components/Notice";
export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const get = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string).slice(0, 120) : "";
  const q = get("q"),
    category = get("category"),
    city = get("city"),
    institution = get("institution"),
    grade = get("grade"),
    condition = get("condition"),
    free = get("free") === "1";
  const page = Math.max(1, Math.min(10000, Number.parseInt(get("page")) || 1));
  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    verifiedAt: { not: null },
    expiresAt: { gt: new Date() },
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { authorPublisher: { contains: q } },
            { isbn: { contains: q } },
          ],
        }
      : {}),
    ...(Object.hasOwn(categories, category)
      ? { category: category as Category }
      : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(institution ? { institution: { contains: institution } } : {}),
    ...(grade ? { grade: { contains: grade } } : {}),
    ...(Object.hasOwn(conditions, condition)
      ? { condition: condition as Condition }
      : {}),
    ...(free ? { AND: [{ OR: [{ price: null }, { price: 0 }] }] } : {}),
  };
  const [total, listings] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      skip: (page - 1) * 12,
      select: {
        id: true,
        title: true,
        authorPublisher: true,
        category: true,
        condition: true,
        price: true,
        city: true,
        createdAt: true,
        images: { select: { path: true }, take: 1 },
      },
    }),
  ]);
  const query = (changes: Record<string, string>) => {
    const s = new URLSearchParams();
    for (const key of [
      "q",
      "category",
      "city",
      "institution",
      "grade",
      "condition",
      "free",
    ])
      if (get(key)) s.set(key, get(key));
    Object.entries(changes).forEach(([k, v]) =>
      v ? s.set(k, v) : s.delete(k),
    );
    return "/?" + s.toString();
  };
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">לוח הספרים של הקהילה</div>
            <h1>ספרים טובים. ידיים טובות.</h1>
            <p>ספרי לימוד, קריאה וקודש מיד שנייה — קרוב לבית, במחיר נעים.</p>
            <form action="/" method="get" role="search" className="search-row">
              <SearchIcon />
              <input
                name="q"
                aria-label="חיפוש ספר, מחבר או ISBN"
                placeholder="איזה ספר אתם מחפשים?"
                defaultValue={q}
              />
              <button type="submit">חיפוש</button>
            </form>
            <div className="hero-note">
              בלי תיווך, בלי משלוחים. מוצאים ספר, מתקשרים ואוספים.
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="illustration-book" />
            <div className="illustration-book" />
            <span className="book-symbol">
              <BookIcon size={31} />
            </span>
          </div>
        </div>
      </section>
      <div className="container board">
        <Notice error={get("error")} success={get("success")} />
        <div className="board-layout">
          <aside className="sidebar">
            <h2>מוצאים בדיוק את הספר</h2>
            <form action="/" method="get" className="filter-form">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="category" value={category} />
              <label>
                עיר
                <input name="city" placeholder="כל הערים" defaultValue={city} />
              </label>
              <label>
                מוסד לימודים
                <input
                  name="institution"
                  placeholder="כל המוסדות"
                  defaultValue={institution}
                />
              </label>
              <label>
                כיתה
                <input
                  name="grade"
                  placeholder="כל הכיתות"
                  defaultValue={grade}
                />
              </label>
              <label>
                מצב הספר
                <select name="condition" defaultValue={condition}>
                  <option value="">כל המצבים</option>
                  {Object.entries(conditions).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="free"
                  value="1"
                  defaultChecked={free}
                />{" "}
                ספרים למסירה בלבד
              </label>
              <button type="submit">סינון תוצאות</button>
              <a className="reset" href="/">
                ניקוי הסינון
              </a>
            </form>
            <p className="filter-help">
              יש לכם ספרים שמחכים לקורא הבא?
              <br />
              <a href="/post">פרסום מודעה הוא פשוט וחינם ←</a>
            </p>
          </aside>
          <section aria-label="מודעות ספרים">
            <nav className="category-tabs" aria-label="סוגי ספרים">
              <a
                href={query({ category: "", page: "" })}
                className={!category ? "active" : ""}
              >
                כל הספרים
              </a>
              {Object.entries(categories).map(([v, l]) => (
                <a
                  key={v}
                  className={category === v ? "active" : ""}
                  href={query({ category: v, page: "" })}
                >
                  {l}
                </a>
              ))}
            </nav>
            <div className="results-heading">
              <h2>
                {q ? `תוצאות עבור ״${q}״` : "חדש על המדף"}{" "}
                <span>({total} ספרים)</span>
              </h2>
              <span>לפי המודעות החדשות ביותר</span>
            </div>
            {listings.length ? (
              <div className="listing-grid">
                {listings.map((l) => (
                  <a
                    className="listing-card"
                    href={`/listing/${l.id}`}
                    key={l.id}
                  >
                    <div className="card-image">
                      {l.images[0] && (
                        <img
                          src={`/media/${l.images[0].path}`}
                          alt={`כריכת ${l.title}`}
                          loading="lazy"
                          width={260}
                          height={198}
                        />
                      )}
                      <span className="category-label">
                        {categories[l.category]}
                      </span>
                    </div>
                    <div className="card-info">
                      <h3>{l.title}</h3>
                      <p className="card-author">
                        {l.authorPublisher || "מיד ליד, לקורא הבא"}
                      </p>
                      <div className="card-detail">
                        <span>⌖ {l.city}</span>
                        <span className="condition-tag">
                          {conditions[l.condition]}
                        </span>
                      </div>
                      <div className="card-bottom">
                        <strong className={!l.price ? "free" : ""}>
                          {priceLabel(l.price)}
                        </strong>
                        <span>
                          {l.createdAt.toLocaleDateString("he-IL", {
                            day: "numeric",
                            month: "numeric",
                            timeZone: "Asia/Jerusalem",
                          })}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty">
                <BookIcon size={38} />
                <h2>הספר הבא עוד בדרך</h2>
                <p>לא נמצאו ספרים בסינון הזה. נסו להרחיב את החיפוש.</p>
                <a className="button secondary" href="/">
                  לכל הספרים
                </a>
              </div>
            )}
            {total > 12 && (
              <nav className="pagination" aria-label="עמודי תוצאות">
                {page > 1 && (
                  <a href={query({ page: String(page - 1) })}>הקודם</a>
                )}
                <span>
                  עמוד {page} מתוך {Math.max(1, Math.ceil(total / 12))}
                </span>
                {page * 12 < total && (
                  <a href={query({ page: String(page + 1) })}>הבא</a>
                )}
              </nav>
            )}
            <div className="how-strip">
              <BookIcon size={30} />
              <div>
                <strong>ספר שכבר קראתם, סיפור חדש למישהו אחר.</strong>
                <p>
                  מעלים תמונה, מוסיפים פרטים ומעבירים הלאה. הפרסום בלוח בחינם.
                </p>
              </div>
              <a href="/post">לפרסום מודעה ←</a>
            </div>
            <details className="wanted">
              <summary>לא מצאתם? שמרו בקשה לספר מבוקש</summary>
              <form action="/api/wanted" method="post" className="form-grid">
                <label>
                  שם הספר או מילות חיפוש
                  <input
                    name="keywords"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </label>
                <label>
                  טלפון
                  <input
                    name="phone"
                    type="tel"
                    dir="ltr"
                    required
                    maxLength={30}
                  />
                </label>
                <p className="small muted">
                  הבקשה נשמרת בלבד. שירות ההתראות עדיין אינו פעיל.
                </p>
                <button>שמירת בקשה</button>
              </form>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
