import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { categories, conditions, priceLabel } from "@/lib/labels";
export const dynamic = "force-dynamic";
export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Explicit public projection: phone and management token never enter HTML/RSC.
  const listing = await db.listing.findFirst({
    where: {
      id,
      status: "ACTIVE",
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      title: true,
      authorPublisher: true,
      category: true,
      condition: true,
      price: true,
      city: true,
      neighborhood: true,
      institution: true,
      grade: true,
      isbn: true,
      createdAt: true,
      images: { select: { path: true } },
    },
  });
  if (!listing) notFound();
  return (
    <div className="container page">
      <a className="breadcrumb" href="/">
        לוח הספרים ← {categories[listing.category]}
      </a>
      <div className="detail-grid">
        <section>
          <span className="detail-tag">{categories[listing.category]}</span>
          <h1>{listing.title}</h1>
          <p className="muted">{listing.authorPublisher}</p>
          <p className="detail-price">{priceLabel(listing.price)}</p>
          <dl className="specs">
            {[
              ["מצב הספר", conditions[listing.condition]],
              [
                "מיקום",
                [listing.city, listing.neighborhood].filter(Boolean).join(", "),
              ],
              ["מוסד", listing.institution],
              ["כיתה", listing.grade],
              ["ISBN", listing.isbn],
              [
                "תאריך פרסום",
                listing.createdAt.toLocaleDateString("he-IL", {
                  timeZone: "Asia/Jerusalem",
                }),
              ],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          <div className="contact-box">
            <form action={`/api/listings/${listing.id}/phone`} method="post">
              <button>הצג טלפון</button>
            </form>
            <p>יוצרים קשר ישירות עם המוכר ומתאמים איסוף. אין תשלום דרך האתר.</p>
          </div>
          <a className="report-link" href={`/listing/${id}/report`}>
            דווח על מודעה
          </a>
        </section>
        <div className="gallery">
          {listing.images.map((image, i) => (
            <img
              className="detail-image"
              key={image.path}
              src={`/media/${image.path}`}
              alt={`תמונה ${i + 1} של ${listing.title}`}
              width={600}
              height={440}
              loading={i ? "lazy" : "eager"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
