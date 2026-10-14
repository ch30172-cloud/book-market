import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Notice } from "@/components/Notice";
export const metadata = { title: "דיווח על מודעה", robots: { index: false } };
export default async function Report({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const listing = await db.listing.findFirst({
    where: {
      id,
      status: "ACTIVE",
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
    select: { title: true },
  });
  if (!listing) notFound();
  return (
    <div className="container page narrow">
      <a className="breadcrumb" href={`/listing/${id}`}>
        חזרה למודעה ←
      </a>
      <h1>דיווח על מודעה</h1>
      <p>״{listing.title}״</p>
      <Notice {...await searchParams} />
      <form
        action="/api/forms/report"
        method="post"
        className="panel form-stack"
      >
        <input type="hidden" name="listingId" value={id} />
        <label>
          מה הבעיה במודעה?
          <textarea name="reason" required minLength={2} maxLength={300} />
        </label>
        <button>שליחת דיווח</button>
      </form>
    </div>
  );
}
