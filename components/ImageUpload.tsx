"use client";
import { useEffect, useState } from "react";
export function ImageUpload({ required = true }: { required?: boolean }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  return (
    <div className="upload">
      <label htmlFor="images">
        תמונות הספר {required ? "*" : "(רק להחלפת התמונות הקיימות)"}
      </label>
      <p className="muted small">
        1–3 תמונות, עד 5MB לתמונה. JPG, PNG או WebP.
      </p>
      <input
        id="images"
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        required={required}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 3 || files.some((f) => f.size > 5 * 1024 * 1024)) {
            setError("יש לבחור עד 3 תמונות, עד 5MB כל אחת");
            e.target.value = "";
            setPreviews([]);
            return;
          }
          setError("");
          setPreviews(files.map((f) => URL.createObjectURL(f)));
        }}
      />
      {error && <p role="alert">{error}</p>}
      <div className="previews">
        {previews.map((src) => (
          <img key={src} src={src} alt="תצוגה מקדימה של הספר" />
        ))}
      </div>
    </div>
  );
}
