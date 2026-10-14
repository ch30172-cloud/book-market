export const categories = {
  TEXTBOOK: "ספרי לימוד",
  READING: "ספרי קריאה",
  RELIGIOUS: "ספרי קודש",
};
export const conditions = {
  NEW: "חדש",
  GOOD: "מצב טוב",
  USED: "משומש",
  WRITTEN_IN: "עם כתיבה",
};
export const statuses = {
  PENDING: "ממתינה",
  ACTIVE: "פעילה",
  SOLD: "נמכרה",
  EXPIRED: "פג תוקף",
  REMOVED: "הוסרה",
};
export const priceLabel = (price: number | null) =>
  price ? `${price} ₪` : "למסירה";
