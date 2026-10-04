import { CITY_MAX, SYRIA_GOVERNORATES } from "@/lib/syria-governorates";
import type { LocationDraft } from "./lib/location";

/* Where the user lives now: the governorate from the list, the city typed.
   Uses the LMS form markup (.field), so it sits in any LMS form. */
export function LocationFields({
  value,
  onChange,
  lang,
  idPrefix = "loc",
  required = true,
}: {
  value: LocationDraft;
  onChange: (next: LocationDraft) => void;
  lang: "ar" | "en";
  idPrefix?: string;
  required?: boolean;
}) {
  const ar = lang === "ar";
  const abroad = value.governorate === "abroad";
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-governorate`}>
          {ar ? "المحافظة التي تقيم فيها" : "Governorate you live in"}
        </label>
        <select
          id={`${idPrefix}-governorate`}
          required={required}
          value={value.governorate}
          onChange={(e) => onChange({ ...value, governorate: e.target.value })}
        >
          <option value="">{ar ? "اختر المحافظة" : "Choose a governorate"}</option>
          {SYRIA_GOVERNORATES.map((g) => (
            <option key={g.key} value={g.key}>
              {g[lang]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-city`}>
          {abroad
            ? ar
              ? "الدولة والمدينة"
              : "Country and city"
            : ar
              ? "المدينة أو البلدة"
              : "City or town"}
        </label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          required={required}
          maxLength={CITY_MAX}
          autoComplete="address-level2"
          dir="auto"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          placeholder={
            abroad
              ? ar
                ? "مثال: تركيا – إسطنبول"
                : "e.g. Turkey – Istanbul"
              : ar
                ? "مثال: ببيلا"
                : "e.g. Babbila"
          }
        />
      </div>
    </>
  );
}
