export const metadata = { title: "יצירת קשר" };
export const dynamic = "force-dynamic";
export default function Contact() {
  return (
    <div className="container page narrow prose">
      <h1>יצירת קשר</h1>
      <div className="panel">
        <p>
          מצאתם מודעה בעייתית? השתמשו בקישור ״דווח על מודעה״ בעמוד הספר כדי
          להעביר אותה לבדיקה.
        </p>
        {process.env.CONTACT_PHONE ? (
          <p>
            לפנייה לצוות הלוח:{" "}
            <a href={`tel:${process.env.CONTACT_PHONE}`}>
              <bdi>{process.env.CONTACT_PHONE}</bdi>
            </a>
          </p>
        ) : (
          <p className="muted">מספר הטלפון של צוות הלוח יפורסם כאן בקרוב.</p>
        )}
        <p>
          לשאלה על ספר מסוים, פנו ישירות למוכר באמצעות הכפתור ״הצג טלפון״
          במודעה.
        </p>
      </div>
    </div>
  );
}
