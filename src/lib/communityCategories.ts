export const COMMUNITY_KEYS = [
  "data",
  "architecture",
  "medical",
  "entrepreneurship",
  "research",
  "software",
  "economy",
] as const;

export type CommunityKey = (typeof COMMUNITY_KEYS)[number];

export const COMMUNITY_LABELS_AR: Record<CommunityKey, string> = {
  data: "مجتمع البيانات",
  architecture: "المجتمع المعماري الذكي",
  medical: "المجتمع الطبي والذكاء الاصطناعي",
  entrepreneurship: "مجتمع ريادة الأعمال والتحول الرقمي",
  research: "المجتمع البحثي",
  software: "مجتمع البرمجيات",
  economy: "مجتمع الاقتصاد الذكي",
};

export const COMMUNITY_LABELS_EN: Record<CommunityKey, string> = {
  data: "Data Community",
  architecture: "Smart Architecture Community",
  medical: "Medical & AI Community",
  entrepreneurship: "Entrepreneurship & Digital Transformation",
  research: "Research Community",
  software: "Software Community",
  economy: "Smart Economy Community",
};

export function communityLabel(key: string, lang: "ar" | "en"): string {
  const map = lang === "ar" ? COMMUNITY_LABELS_AR : COMMUNITY_LABELS_EN;
  return (map as Record<string, string>)[key] ?? key;
}
