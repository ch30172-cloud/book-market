import { categories, conditions } from "@/lib/labels";
import { ImageUpload } from "./ImageUpload";
type Values = {
  title: string;
  authorPublisher: string | null;
  category: string;
  institution: string | null;
  grade: string | null;
  condition: string;
  price: number | null;
  city: string;
  neighborhood: string | null;
  isbn: string | null;
};
export function ListingFields({ values }: { values?: Values }) {
  return (
    <>
      <label>
        שם הספר *
        <input
          name="title"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values?.title}
          placeholder="למשל: שבילים פלוס לכיתה ד׳"
        />
      </label>
      <div className="form-grid">
        <label>
          מחבר / הוצאה
          <input
            name="authorPublisher"
            maxLength={120}
            defaultValue={values?.authorPublisher || ""}
          />
        </label>
        <label>
          סוג הספר *
          <select name="category" defaultValue={values?.category || "TEXTBOOK"}>
            {Object.entries(categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          מוסד לימודים
          <input
            name="institution"
            maxLength={120}
            defaultValue={values?.institution || ""}
            placeholder="לספרי לימוד, אם רלוונטי"
          />
        </label>
        <label>
          כיתה
          <input
            name="grade"
            maxLength={40}
            defaultValue={values?.grade || ""}
            placeholder="למשל: כיתה ד׳"
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          מצב הספר *
          <select name="condition" defaultValue={values?.condition || "GOOD"}>
            {Object.entries(conditions).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          מחיר בש״ח
          <input
            name="price"
            type="number"
            min={0}
            max={100000}
            step={1}
            defaultValue={values?.price ?? ""}
            placeholder="ריק או 0 = למסירה"
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          עיר *
          <input
            name="city"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values?.city}
          />
        </label>
        <label>
          שכונה
          <input
            name="neighborhood"
            maxLength={80}
            defaultValue={values?.neighborhood || ""}
          />
        </label>
      </div>
      <label>
        ISBN (לא חובה)
        <input
          name="isbn"
          dir="ltr"
          maxLength={20}
          defaultValue={values?.isbn || ""}
        />
      </label>
      <ImageUpload required={!values} />
    </>
  );
}
