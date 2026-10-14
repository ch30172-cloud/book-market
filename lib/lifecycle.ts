export const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
export const expiryDate = (now = new Date()) =>
  new Date(now.getTime() + THIRTY_DAYS);
export const isExpired = (expiresAt: Date, now = new Date()) =>
  expiresAt.getTime() <= now.getTime();
export function publicationStatus(
  suspicious: boolean,
  approval = process.env.REQUIRE_ADMIN_APPROVAL === "true",
): "PENDING" | "ACTIVE" {
  return suspicious || approval ? "PENDING" : "ACTIVE";
}
