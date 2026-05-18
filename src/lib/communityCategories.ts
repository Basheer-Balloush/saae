export const COMMUNITY_KEYS = [
  "data",
  "architecture",
  "medical",
  "research",
  "software",
  "economy",
] as const;

export type CommunityKey = (typeof COMMUNITY_KEYS)[number];

export const COMMUNITY_LABELS_AR: Record<CommunityKey, string> = {
  data: "مجتمع البيانات",
  architecture: "المجتمع المعماري الذكي",
  medical: "مجتمع الرعاية الصحية",
  research: "المجتمع البحثي الذكي",
  software: "مجتمع البرمجيات",
  economy: "مجتمع الاقتصاد الذكي",
};

export const COMMUNITY_LABELS_EN: Record<CommunityKey, string> = {
  data: "Data Community",
  architecture: "Smart Architecture Community",
  medical: "Healthcare Community",
  research: "Smart Research Community",
  software: "Software Community",
  economy: "Smart Economy Community",
};

export function communityLabel(key: string, lang: "ar" | "en"): string {
  const map = lang === "ar" ? COMMUNITY_LABELS_AR : COMMUNITY_LABELS_EN;
  return (map as Record<string, string>)[key] ?? key;
}
