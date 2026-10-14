import { PrismaClient, Category } from "@prisma/client";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { storage } from "../lib/storage";
import { expiryDate } from "../lib/lifecycle";
const db = new PrismaClient();
const books: [string, string, Category, string, string, number | null][] = [
  ["שבילים פלוס לכיתה ד׳", "מטח", "TEXTBOOK", "בני ברק", "כיתה ד׳", 25],
  ["כה עשו חכמינו", "יוכבד סגל", "READING", "ירושלים", "", 40],
  ["משנה ברורה — חלק א׳", "החפץ חיים", "RELIGIOUS", "מודיעין עילית", "", 35],
  ["מסע אל עולם החשבון", "הוצאת יבנה", "TEXTBOOK", "בית שמש", "כיתה ג׳", 20],
  ["סיפורים מבית סבא", "ספריית המשפחה", "READING", "אלעד", "", null],
  ["חומש בראשית עם רש״י", "הוצאת המאור", "RELIGIOUS", "בני ברק", "", 30],
  ["עברית בהנאה", "הוצאת רכס", "TEXTBOOK", "ירושלים", "כיתה ה׳", 15],
  ["הילדים מרחוב השקד", "ספרי אור", "READING", "ביתר עילית", "", 25],
  ["מסילת ישרים", "רבי משה חיים לוצאטו", "RELIGIOUS", "בית שמש", "", null],
  [
    "מדעים לחטיבה הצעירה",
    "הוצאת יסודות",
    "TEXTBOOK",
    "מודיעין עילית",
    "כיתה ו׳",
    30,
  ],
  ["הרפתקה בסמטאות ירושלים", "ספריית אור", "READING", "בני ברק", "", 20],
  ["פרקי אבות מבואר", "הוצאת עוז והדר", "RELIGIOUS", "אלעד", "", 15],
  ["אוצר המילים באנגלית", "הוצאת דעת", "TEXTBOOK", "ירושלים", "כיתה ז׳", 35],
  ["סיפורי צדיקים לילדים", "ספרי אור", "READING", "ביתר עילית", "", 18],
  ["סידור תפילת כל פה", "הוצאת אשכול", "RELIGIOUS", "רכסים", "", null],
  ["הבנת הנקרא — חלק ב׳", "הוצאת יסודות", "TEXTBOOK", "בני ברק", "כיתה ד׳", 22],
  ["הלב הטוב", "ספריית המשפחה", "READING", "בית שמש", "", 12],
  ["הלכות שבת למשפחה", "הוצאת הלכה", "RELIGIOUS", "ירושלים", "", 45],
  ["גאומטריה בקלות", "הוצאת יבנה", "TEXTBOOK", "אלעד", "כיתה ח׳", 28],
  ["סיפורים לשולחן שבת", "הוצאת אור", "READING", "מודיעין עילית", "", null],
];
async function seed() {
  if (await db.listing.count()) {
    console.info("Database already has listings; seed skipped.");
    return;
  }
  for (let i = 0; i < books.length; i++) {
    const [title, authorPublisher, category, city, grade, price] = books[i];
    const colors = ["#42614f", "#b19266", "#77735e", "#536b7a", "#7c5650"];
    // Original illustrated demo covers, clearly marked; no stock or remote imagery.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="620"><rect width="560" height="620" fill="#eceae2"/><ellipse cx="285" cy="557" rx="150" ry="15" fill="#d8d5ca"/><rect x="136" y="48" width="290" height="505" rx="7" fill="#d3cebd"/><rect x="130" y="42" width="290" height="505" rx="6" fill="${colors[i % colors.length]}"/><rect x="137" y="42" width="12" height="505" fill="#000" opacity=".12"/><rect x="163" y="77" width="223" height="430" fill="none" stroke="#f0e6cc" opacity=".6"/><text x="275" y="210" fill="#fff7df" text-anchor="middle" font-family="Arial" font-size="27" direction="rtl">${category === "TEXTBOOK" ? "ספר לימוד" : category === "RELIGIOUS" ? "ספר קודש" : "ספר קריאה"}</text><path d="M230 280Q252 270 275 282Q298 270 320 280V335Q298 325 275 337Q252 325 230 335Z M275 282V337" stroke="#e7d6ac" fill="none" stroke-width="2"/><text x="275" y="430" fill="#eee3c9" text-anchor="middle" font-family="Arial" font-size="17" direction="rtl">כריכה להמחשה בלבד</text></svg>`;
    const image = await storage.put(
      await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer(),
    );
    await db.listing.create({
      data: {
        title,
        authorPublisher,
        category,
        city,
        grade: grade || null,
        institution: category === "TEXTBOOK" ? "בית יעקב" : null,
        neighborhood: i % 2 ? "מרכז העיר" : null,
        condition:
          i % 4 === 0
            ? "NEW"
            : i % 4 === 1
              ? "GOOD"
              : i % 4 === 2
                ? "USED"
                : "WRITTEN_IN",
        price,
        phone: i < 10 ? "+972500000000" : "+972500000001",
        status: "ACTIVE",
        verifiedAt: new Date(),
        expiresAt: expiryDate(),
        createdAt: new Date(Date.now() - i * 3600000),
        manageToken: randomBytes(32).toString("hex"),
        images: { create: { path: image } },
      },
    });
  }
  console.info(
    "Seeded 20 Hebrew demo listings. All use a non-real demo phone.",
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
