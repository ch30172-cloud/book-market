import { categories, conditions, priceLabel } from "@/lib/labels";
import type { Category, Condition } from "@prisma/client";
type ListingPreview = {
  title: string;
  authorPublisher: string | null;
  category: Category;
  condition: Condition;
  price: number | null;
  institution: string | null;
  grade: string | null;
  images: { path: string }[];
};
export function AdminListingPreview({ listing }: { listing: ListingPreview }) {
  return (
    <details>
      <summary className="small" style={{ cursor: "pointer", paddingBlock: 8 }}>
        בדיקת פרטי המודעה ותמונות
      </summary>
      <p>
        {categories[listing.category]} · {conditions[listing.condition]} ·{" "}
        {priceLabel(listing.price)}
      </p>
      <p>
        {[listing.authorPublisher, listing.institution, listing.grade]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="previews">
        {listing.images.map((i, n) => (
          <a
            key={i.path}
            href={`/media/${i.path}`}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={`/media/${i.path}`}
              alt={`תמונה ${n + 1} של ${listing.title}`}
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </details>
  );
}
