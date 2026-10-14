import { z } from "zod";
import { normalizePhone } from "./phone";
const clean = (value: unknown) =>
  typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f<>]/g, "")
    : "";
const text = (max: number) => z.preprocess(clean, z.string().max(max));
export const listingSchema = z.object({
  title: text(120).pipe(z.string().min(2, "יש להזין שם ספר (לפחות 2 תווים)")),
  authorPublisher: text(120),
  category: z.enum(["TEXTBOOK", "READING", "RELIGIOUS"]),
  institution: text(120),
  grade: text(40),
  condition: z.enum(["NEW", "GOOD", "USED", "WRITTEN_IN"]),
  price: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(0).max(100000).nullable(),
  ),
  city: text(60).pipe(z.string().min(2, "יש להזין עיר")),
  neighborhood: text(80),
  phone: text(30).transform((value, ctx) => {
    try {
      return normalizePhone(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "מספר הטלפון אינו תקין" });
      return z.NEVER;
    }
  }),
  isbn: text(20).refine(
    (v) => !v || /^[\dXx -]{10,20}$/.test(v),
    "ISBN אינו תקין",
  ),
});
export function parseListing(form: FormData) {
  return listingSchema.parse(Object.fromEntries(form));
}
export function shortText(value: FormDataEntryValue | null, max = 300) {
  const result = clean(value);
  if (result.length < 2 || result.length > max)
    throw new Error(`יש להזין בין 2 ל־${max} תווים`);
  return result;
}
export function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    const message = error.issues[0].message;
    return /[\u0590-\u05ff]/.test(message)
      ? message
      : "אחד הפרטים אינו תקין. בדקו את השדות ואת אורך הטקסט.";
  }
  return error instanceof Error &&
    /[\u0590-\u05ff]/.test(error.message) &&
    !/prisma|database|SQL|ENOENT/i.test(error.message)
    ? error.message
    : "אירעה שגיאה. נסו שוב מאוחר יותר.";
}
