export const FEEDBACK_CATEGORIES = ["suggestion", "complaint", "praise", "bug", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const feedbackCategoryLabel: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    general: "عام",
    suggestion: "اقتراح",
    complaint: "شكوى",
    praise: "شكر وثناء",
    bug: "مشكلة تقنية",
    other: "أخرى",
  },
  en: {
    general: "General",
    suggestion: "Suggestion",
    complaint: "Complaint",
    praise: "Praise",
    bug: "Technical issue",
    other: "Other",
  },
};
