/* The 14 governorates plus "outside Syria", in display order. The same keys
   live in the syria_governorates table (migration 20261001120000) and in the
   /feedback survey, so answers from both count together. pcode is the OCHA
   admin-1 code, for joining a map later. */

export type GovernorateKey =
  | "damascus"
  | "rif-dimashq"
  | "aleppo"
  | "homs"
  | "hama"
  | "latakia"
  | "tartus"
  | "idlib"
  | "deir-ez-zor"
  | "raqqa"
  | "hasakah"
  | "daraa"
  | "suwayda"
  | "quneitra"
  | "abroad";

export type Governorate = { key: GovernorateKey; ar: string; en: string; pcode: string | null };

export const SYRIA_GOVERNORATES: readonly Governorate[] = [
  { key: "damascus", ar: "دمشق", en: "Damascus", pcode: "SY01" },
  { key: "rif-dimashq", ar: "ريف دمشق", en: "Rif Dimashq", pcode: "SY03" },
  { key: "aleppo", ar: "حلب", en: "Aleppo", pcode: "SY02" },
  { key: "homs", ar: "حمص", en: "Homs", pcode: "SY04" },
  { key: "hama", ar: "حماة", en: "Hama", pcode: "SY05" },
  { key: "latakia", ar: "اللاذقية", en: "Latakia", pcode: "SY06" },
  { key: "tartus", ar: "طرطوس", en: "Tartus", pcode: "SY10" },
  { key: "idlib", ar: "إدلب", en: "Idlib", pcode: "SY07" },
  { key: "deir-ez-zor", ar: "دير الزور", en: "Deir ez-Zor", pcode: "SY09" },
  { key: "raqqa", ar: "الرقة", en: "Raqqa", pcode: "SY11" },
  { key: "hasakah", ar: "الحسكة", en: "Al-Hasakah", pcode: "SY08" },
  { key: "daraa", ar: "درعا", en: "Daraa", pcode: "SY12" },
  { key: "suwayda", ar: "السويداء", en: "As-Suwayda", pcode: "SY13" },
  { key: "quneitra", ar: "القنيطرة", en: "Quneitra", pcode: "SY14" },
  { key: "abroad", ar: "خارج سوريا", en: "Outside Syria", pcode: null },
];

export const GOVERNORATE_KEYS = SYRIA_GOVERNORATES.map((g) => g.key) as [
  GovernorateKey,
  ...GovernorateKey[],
];

export function governorateName(key: string | null | undefined, lang: "ar" | "en"): string {
  const g = SYRIA_GOVERNORATES.find((x) => x.key === key);
  return g ? g[lang] : "";
}

/* The city rule the database also enforces: 2 to 80 characters once spaces
   are tidied, with at least one Latin or Arabic letter. */
export const CITY_MAX = 80;

export function tidyCity(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function isValidCity(raw: string): boolean {
  const city = tidyCity(raw);
  return city.length >= 2 && city.length <= CITY_MAX && /[A-Za-z\u0621-\u064A]/.test(city);
}
