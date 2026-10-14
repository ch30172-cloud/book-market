import { ListingFields } from "@/components/ListingFields";
import { Notice } from "@/components/Notice";
export const metadata = { title: "פרסום מודעה" };
export default async function Post({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="container page narrow">
      <a href="/" className="breadcrumb">
        לוח הספרים ←
      </a>
      <h1>מעבירים ספר הלאה</h1>
      <p className="muted">
        תמונה, כמה פרטים — והספר בדרך לקורא הבא. הפרסום בחינם.
      </p>
      <Notice error={error} />
      <form
        action="/api/forms/create"
        method="post"
        encType="multipart/form-data"
        className="panel form-stack"
      >
        <ListingFields />
        <label>
          מספר טלפון *
          <input
            name="phone"
            required
            type="tel"
            dir="ltr"
            maxLength={30}
            placeholder="050-1234567"
          />
        </label>
        <label>
          איך לקבל קוד אימות?
          <select name="channel">
            <option value="sms">מסרון (SMS)</option>
            <option value="voice">שיחה קולית — גם לטלפון כשר</option>
          </select>
        </label>
        <div hidden aria-hidden="true">
          <label>
            אתר אינטרנט
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <p className="small muted">
          המספר יוצג לקונים רק לאחר לחיצה. בפרסום המודעה אתם מסכימים ל
          <a href="/rules">
            <u>כללי הלוח</u>
          </a>
          . אין לשתף בקישור הניהול האישי.
        </p>
        <button>המשך לאימות הטלפון ←</button>
      </form>
    </div>
  );
}
