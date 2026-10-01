/**
 * Shared validation for the four required bilingual course fields.
 * The same rules are enforced at the write boundary by the
 * `lms_courses_require_bilingual` database trigger.
 */
export const REQUIRED_COURSE_FIELDS = [
  "title_ar",
  "title_en",
  "description_ar",
  "description_en",
] as const;

export type RequiredCourseField = (typeof REQUIRED_COURSE_FIELDS)[number];

export type CourseI18nInput = Partial<Record<RequiredCourseField, string | null | undefined>>;

export type CourseFieldErrors = Partial<Record<RequiredCourseField, string>>;

const MESSAGES: Record<RequiredCourseField, { ar: string; en: string }> = {
  title_ar: { ar: "العنوان بالعربية مطلوب", en: "Arabic title is required" },
  title_en: { ar: "العنوان بالإنجليزية مطلوب", en: "English title is required" },
  description_ar: { ar: "الوصف بالعربية مطلوب", en: "Arabic description is required" },
  description_en: { ar: "الوصف بالإنجليزية مطلوب", en: "English description is required" },
};

export function trimCourseI18n(input: CourseI18nInput): Record<RequiredCourseField, string> {
  return {
    title_ar: (input.title_ar ?? "").trim(),
    title_en: (input.title_en ?? "").trim(),
    description_ar: (input.description_ar ?? "").trim(),
    description_en: (input.description_en ?? "").trim(),
  };
}

/** Returns localized field-level errors for empty / whitespace-only values. */
export function validateCourseI18n(input: CourseI18nInput, lang: "ar" | "en"): CourseFieldErrors {
  const trimmed = trimCourseI18n(input);
  const errors: CourseFieldErrors = {};
  for (const field of REQUIRED_COURSE_FIELDS) {
    if (!trimmed[field]) errors[field] = MESSAGES[field][lang];
  }
  return errors;
}

export function firstInvalidCourseField(errors: CourseFieldErrors): RequiredCourseField | null {
  return REQUIRED_COURSE_FIELDS.find((f) => errors[f]) ?? null;
}

export function isCourseI18nComplete(input: CourseI18nInput): boolean {
  const trimmed = trimCourseI18n(input);
  return REQUIRED_COURSE_FIELDS.every((f) => trimmed[f].length > 0);
}

/** Maps the database trigger error onto a localized message. */
export function courseI18nWriteErrorMessage(message: string, lang: "ar" | "en"): string | null {
  if (!/lms_course_incomplete_bilingual/i.test(message)) return null;
  return lang === "ar"
    ? "يجب إكمال العنوان والوصف بالعربية والإنجليزية."
    : "Arabic and English titles and descriptions must all be filled in.";
}
