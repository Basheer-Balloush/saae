// Same order as the homepage community cards, so each page's "NN / 08" matches.
export const COMMUNITY_KEYS = [
  "software",
  "data",
  "architecture",
  "medical",
  "research",
  "economy",
  "trainers",
  "media",
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
};

// News-only extra categories (not full communities with their own pages)
export const EXTRA_NEWS_CATEGORY_KEYS = ["society"] as const;

export const NEWS_CATEGORY_KEYS = [
  ...COMMUNITY_KEYS,
  ...EXTRA_NEWS_CATEGORY_KEYS,
] as const;

export type NewsCategoryKey = (typeof NEWS_CATEGORY_KEYS)[number];

const EXTRA_LABELS_AR: Record<(typeof EXTRA_NEWS_CATEGORY_KEYS)[number], string> = {
  society: "عام",
};
const EXTRA_LABELS_EN: Record<(typeof EXTRA_NEWS_CATEGORY_KEYS)[number], string> = {
  society: "General",
};

export function communityLabel(key: string, lang: "ar" | "en"): string {
  const map = lang === "ar" ? COMMUNITY_LABELS_AR : COMMUNITY_LABELS_EN;
  const extra = lang === "ar" ? EXTRA_LABELS_AR : EXTRA_LABELS_EN;
  return (map as Record<string, string>)[key] ?? (extra as Record<string, string>)[key] ?? key;
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
