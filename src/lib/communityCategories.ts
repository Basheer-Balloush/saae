export const COMMUNITY_KEYS = [
  "data",
  "architecture",
  "medical",
  "research",
  "software",
  "economy",
  "trainers",
  "media",
  "quality",
  "society",
] as const;

export type CommunityKey = (typeof COMMUNITY_KEYS)[number];

export const COMMUNITY_LABELS_AR: Record<CommunityKey, string> = {
  data: "مجتمع البيانات",
  architecture: "المجتمع العمراني الذكي",
  medical: "مجتمع الرعاية الصحية",
  research: "المجتمع البحثي الذكي",
  software: "مجتمع البرمجيات",
  economy: "مجتمع الاقتصاد الذكي",
  trainers: "مجتمع المدربين",
  media: "المجتمع الإعلامي",
  quality: "مجتمع الجودة الريادي",
  society: "المجتمع",
};

export const COMMUNITY_LABELS_EN: Record<CommunityKey, string> = {
  data: "Data Community",
  architecture: "Smart Urban Community",
  medical: "Healthcare Community",
  research: "Smart Research Community",
  software: "Software Community",
  economy: "Smart Economy Community",
  trainers: "Trainers Community",
  media: "Media Community",
  quality: "Quality Entrepreneurship Community",
  society: "Society",
};

export function communityLabel(key: string, lang: "ar" | "en"): string {
  const map = lang === "ar" ? COMMUNITY_LABELS_AR : COMMUNITY_LABELS_EN;
  return (map as Record<string, string>)[key] ?? key;
}

/**
 * Returns the effective categories list for a news row. Falls back to the
 * legacy single `category` column when the array is empty.
 */
export function newsCategories(row: { categories?: string[] | null; category?: string | null }): string[] {
  const arr = (row.categories ?? []).filter(Boolean);
  if (arr.length > 0) return arr;
  return row.category ? [row.category] : [];
}
