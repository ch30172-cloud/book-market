import type { Metadata } from "next";
import "./globals.css";
import { BookIcon } from "@/components/Icons";
// Runtime environment controls banners/contact information, including in Docker.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "ספר חוזר | ספרים מיד ליד", template: "%s | ספר חוזר" },
  description:
    "לוח ספרי לימוד, קריאה וקודש מיד שנייה. מוצאים ספר, מתקשרים ואוספים.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <a className="skip" href="#main">
          דלגו לתוכן
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <a className="brand" href="/">
              <span className="brand-mark">
                <BookIcon />
              </span>
              <span>
                ספר חוזר<small>ספרים מיד ליד</small>
              </span>
            </a>
            <nav aria-label="ניווט ראשי">
              <a href="/">לוח הספרים</a>
              <a className="about-link" href="/about">
                איך זה עובד?
              </a>
            </nav>
            <a className="button" href="/post">
              <span aria-hidden="true">＋</span> פרסום מודעה
            </a>
          </div>
        </header>
        {process.env.SHABBAT_NOTICE && (
          <div className="shabbat">{process.env.SHABBAT_NOTICE}</div>
        )}
        <main id="main">{children}</main>
        <footer>
          <div className="container footer-inner">
            <a className="brand footer-brand" href="/">
              <BookIcon size={23} /> ספר חוזר
            </a>
            <p>ספר טוב ממשיך הלאה.</p>
            <nav aria-label="קישורים נוספים">
              <a href="/about">אודות</a>
              <a href="/rules">כללי הלוח</a>
              <a href="/contact">יצירת קשר</a>
              <a href="/admin">ניהול</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
