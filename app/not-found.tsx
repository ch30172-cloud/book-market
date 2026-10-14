export default function NotFound() {
  return (
    <div className="container page narrow">
      <h1>המודעה כבר אינה על המדף</h1>
      <p className="muted">
        ייתכן שהספר נמכר, שהמודעה פגה או שהקישור אינו תקין.
      </p>
      <a className="button" href="/">
        חזרה ללוח הספרים
      </a>
    </div>
  );
}
