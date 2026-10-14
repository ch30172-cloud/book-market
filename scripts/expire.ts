import { db } from "../lib/db";
export async function expireListings(now = new Date()) {
  const expiring = await db.listing.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING"] },
      verifiedAt: { not: null },
      expiresAt: { gt: now, lte: new Date(now.getTime() + 3 * 86400000) },
      expiryNotifiedAt: null,
    },
    select: { id: true },
  });
  for (const l of expiring) {
    const claimed = await db.listing.updateMany({
      where: { id: l.id, expiryNotifiedAt: null },
      data: { expiryNotifiedAt: now },
    });
    // Hook: replace with a notification provider later. Do not log phone/token.
    if (claimed.count) console.info(`[expiry reminder hook] listing=${l.id}`);
  }
  const expired = await db.listing.updateMany({
    where: { status: { in: ["ACTIVE", "PENDING"] }, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  await db.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.otpChallenge.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 86400000) } },
  });
  return expired.count;
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/expire.ts")) {
  expireListings()
    .then((count) => console.info(`Expired ${count} listings`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
