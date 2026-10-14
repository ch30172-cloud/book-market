"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page narrow">
      <h1>משהו השתבש</h1>
      <p>לא הצלחנו להשלים את הבקשה. נסו שוב בעוד רגע.</p>
      <button onClick={reset}>ניסיון נוסף</button> <a href="/">חזרה ללוח</a>
    </div>
  );
}
