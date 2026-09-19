/* Shared pieces of the assistant's intake: the course options it may recommend,
   and what it falls back to when the catalogue has nothing to offer. Kept out of
   the route so the rules can be tested without calling a model. */

export const ORG_PHONE = "+963 930 763 547";
export const ORG_EMAIL = "info@aisyria.org";

export type CatalogRow = {
  id: string;
  slug: string | null;
  title_ar: string | null;
  title_en: string | null;
  level: string | null;
  is_free: boolean | null;
  price: number | null;
  sale_price: number | null;
  delivery_mode: string | null;
};

export type CourseOption = {
  title: string;
  url: string;
  level: string | null;
  price: string;
  delivery_mode: string | null;
};

export const courseUrl = (row: { slug: string | null; id: string }) =>
  `https://aisyria.org/learning-management-system/courses/${row.slug || row.id}`;

function priceLabel(row: CatalogRow, lang: "ar" | "en"): string {
  if (row.is_free) return lang === "ar" ? "مجاني" : "Free";
  const effective = row.sale_price != null && row.sale_price > 0 ? row.sale_price : row.price;
  if (effective == null || Number.isNaN(effective)) return lang === "ar" ? "السعر غير محدّد" : "Price not set";
  return `${effective} USD`;
}

/** The courses the assistant may mention: titles in the visitor's language, with real links. */
export function toCourseOptions(rows: CatalogRow[], lang: "ar" | "en", limit = 3): CourseOption[] {
  return rows
    .filter((row) => (lang === "ar" ? row.title_ar || row.title_en : row.title_en || row.title_ar))
    .slice(0, limit)
    .map((row) => ({
      title: (lang === "ar" ? row.title_ar || row.title_en : row.title_en || row.title_ar) as string,
      url: courseUrl(row),
      level: row.level,
      price: priceLabel(row, lang),
      delivery_mode: row.delivery_mode,
    }));
}

/** Said when the catalogue has nothing for this visitor: never invent a course. */
export function noCourseFallback(lang: "ar" | "en"): { message: string; phone: string; email: string } {
  return {
    message:
      lang === "ar"
        ? `لا توجد دورة منشورة تناسب هذا الطلب حالياً. تواصل مع الجمعية على ${ORG_PHONE} أو ${ORG_EMAIL} وسيُرشدك الفريق إلى الخطوة المناسبة.`
        : `No published course matches this request right now. Contact the association on ${ORG_PHONE} or ${ORG_EMAIL} and the team will point you to the right next step.`,
    phone: ORG_PHONE,
    email: ORG_EMAIL,
  };
}
