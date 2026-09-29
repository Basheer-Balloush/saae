import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPrice, type Coupon } from "@/lib/coupons";

/* What the coupon pages need to name things: courses, categories and the
   courses in each category. */

export type CourseRef = {
  id: string;
  title_ar: string;
  title_en: string | null;
  delivery_mode: "online" | "onsite";
  status: string;
  price: number;
  sale_price: number | null;
  is_free: boolean;
  category_id: string | null;
};
export type CategoryRef = { id: string; name_ar: string; name_en: string | null };

export function useCouponRefs() {
  const [courses, setCourses] = useState<CourseRef[]>([]);
  const [categories, setCategories] = useState<CategoryRef[]>([]);
  const [courseCategories, setCourseCategories] = useState<
    { course_id: string; category_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, cat, links] = await Promise.all([
      supabase
        .from("lms_courses")
        .select("id,title_ar,title_en,delivery_mode,status,price,sale_price,is_free,category_id")
        .order("created_at", { ascending: false }),
      supabase.from("lms_categories").select("id,name_ar,name_en").order("display_order"),
      supabase.from("lms_course_categories").select("course_id,category_id"),
    ]);
    setCourses((c.data as CourseRef[] | null) ?? []);
    setCategories((cat.data as CategoryRef[] | null) ?? []);
    setCourseCategories((links.data as { course_id: string; category_id: string }[] | null) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const courseName = (id: string | null | undefined, ar: boolean) => {
    const c = courses.find((x) => x.id === id);
    return c ? (ar ? c.title_ar : c.title_en || c.title_ar) : "—";
  };
  const categoryName = (id: string | null | undefined, ar: boolean) => {
    const c = categories.find((x) => x.id === id);
    return c ? (ar ? c.name_ar : c.name_en || c.name_ar) : "—";
  };
  /** Courses in a category, as the database decides it: the main category or
      any category the course is listed under. */
  const coursesIn = (categoryId: string) =>
    courses.filter(
      (c) =>
        c.category_id === categoryId ||
        courseCategories.some((l) => l.course_id === c.id && l.category_id === categoryId),
    );
  const priceOf = (c: CourseRef) =>
    listPrice(Number(c.price), c.sale_price == null ? null : Number(c.sale_price), c.is_free);

  return {
    courses,
    categories,
    loading,
    reload: load,
    courseName,
    categoryName,
    coursesIn,
    priceOf,
  };
}

export type CouponRefs = ReturnType<typeof useCouponRefs>;

/** Active, expired, used up or switched off. */
export function couponStatus(c: Coupon, used: number): "active" | "off" | "expired" | "used_up" {
  if (!c.active) return "off";
  if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return "expired";
  if (c.max_uses != null && used >= c.max_uses) return "used_up";
  return "active";
}

export const STATUS_LABELS = {
  active: { ar: "مفعّل", en: "Active", tone: "green" },
  off: { ar: "متوقف", en: "Switched off", tone: "gray" },
  expired: { ar: "منتهي", en: "Expired", tone: "gray" },
  used_up: { ar: "مستنفد", en: "Used up", tone: "orange" },
} as const;

export type CouponKind = "recognition" | "course" | "category" | "personal";

export const couponKind = (c: Pick<Coupon, "effect" | "scope">): CouponKind =>
  c.effect === "recognition" ? "recognition" : c.scope;

export const KIND_LABELS: Record<
  CouponKind,
  { ar: string; en: string; hint: { ar: string; en: string } }
> = {
  recognition: {
    ar: "اعتراف بإكمال الدورة",
    en: "Course recognition",
    hint: {
      ar: "لمن حضر الدورة خارج المنصة: يُسجَّل فوراً والدورة مكتملة، ثم الاستبيان والشهادة. لكل متعلّم استخدام واحد؛ الحد الإجمالي يحدد عدد المتعلّمين. للدورات الأونلاين فقط.",
      en: "For people who attended the course elsewhere: enrolled at once with the course completed, then the feedback form and certificate. Each learner can use it once; the total use limit controls the number of learners. Online courses only.",
    },
  },
  course: {
    ar: "كوبون دورة",
    en: "Course coupon",
    hint: {
      ar: "خصم على دورة واحدة لأي متعلّم يملك الكود. يراجع فريق المنصة الطلب.",
      en: "A discount on one course for anyone with the code. The request still goes to an admin.",
    },
  },
  category: {
    ar: "كوبون تصنيف",
    en: "Category coupon",
    hint: {
      ar: "خصم على أي دورة في تصنيف واحد، لدورة واحدة لكل متعلّم، بعدد محدود من المتعلّمين وتاريخ انتهاء.",
      en: "A discount on any course in one category, one course per learner, for a limited number of learners until an end date.",
    },
  },
  personal: {
    ar: "كوبون شخصي",
    en: "Personal coupon",
    hint: {
      ar: "لمتعلّم واحد تختاره بالبريد أو الهاتف، على أي دورة، بالحدود التي تحددها.",
      en: "For one learner you pick by email or phone, on any course, within the limits you set.",
    },
  },
};

/** What the limit counts, for each kind. */
export const USES_UNIT: Record<CouponKind, { ar: string; en: string }> = {
  recognition: { ar: "استخدام", en: "uses" },
  course: { ar: "استخدام", en: "uses" },
  category: { ar: "متعلّم", en: "learners" },
  personal: { ar: "دورة", en: "courses" },
};

/** yyyy-mm-dd from the date picker, as the end of that day. */
export function endOfDay(date: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The date picker's value for a stored end date. */
export function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
