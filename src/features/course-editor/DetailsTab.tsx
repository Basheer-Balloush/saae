import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { CourseCoInstructors } from "@/components/lms/CourseCoInstructors";
import { Field, Panel, Seg, ToggleRow } from "@/components/console/ui";
import type { Category, EditorCtx } from "./types";

export function DetailsTab({
  ctx,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  onDelete,
}: {
  ctx: EditorCtx;
  categories: Category[];
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  onDelete: () => void;
}) {
  const { course, update, commit, t, ar, lang, fieldErrors, fieldRefs, user } = ctx;
  const [coverPct, setCoverPct] = useState<{
    pct: number;
    loaded: number;
    total: number;
    name: string;
  } | null>(null);
  const [more, setMore] = useState(!!course.slug);

  const uploadCover = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("يجب اختيار صورة", "Please choose an image file"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("الحد الأقصى 5 ميجابايت", "Max file size is 5MB"));
      return;
    }
    setCoverPct({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${course.id}/cover-${Date.now()}.${ext}`;
      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: "lms-media",
        path,
        file,
        upsert: true,
        contentType: file.type || undefined,
        onProgress: (pct, loaded, total) => setCoverPct({ pct, loaded, total, name: file.name }),
      });
      const busted = `${publicUrl}?v=${Date.now()}`;
      // The cover saves straight away, like before: no need to press Save.
      const { error } = await supabase
        .from("lms_courses")
        .update({ cover_url: busted })
        .eq("id", course.id);
      if (error) throw error;
      commit({ cover_url: busted });
      toast.success(t("تم رفع الغلاف", "Cover uploaded"));
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setCoverPct(null);
    }
  };

  const catName = (c: Category) => (ar ? c.name_ar : c.name_en || c.name_ar);

  return (
    <div className="space-y-5">
      <Panel
        title={t("الاسم والوصف", "Name and description")}
        description={t(
          "مطلوبان باللغتين قبل الإرسال أو النشر.",
          "Both languages are required before submitting or publishing.",
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("الاسم بالعربية", "Name in Arabic")} error={fieldErrors.title_ar}>
            <Input
              dir="rtl"
              ref={(el) => {
                fieldRefs.current.title_ar = el;
              }}
              aria-invalid={!!fieldErrors.title_ar}
              value={course.title_ar}
              onChange={(e) => update({ title_ar: e.target.value })}
            />
          </Field>
          <Field label={t("الاسم بالإنجليزية", "Name in English")} error={fieldErrors.title_en}>
            <Input
              dir="ltr"
              ref={(el) => {
                fieldRefs.current.title_en = el;
              }}
              aria-invalid={!!fieldErrors.title_en}
              value={course.title_en ?? ""}
              onChange={(e) => update({ title_en: e.target.value })}
            />
          </Field>
          <Field
            label={t("الوصف بالعربية", "Description in Arabic")}
            error={fieldErrors.description_ar}
          >
            <Textarea
              dir="rtl"
              rows={5}
              ref={(el) => {
                fieldRefs.current.description_ar = el;
              }}
              aria-invalid={!!fieldErrors.description_ar}
              value={course.description_ar ?? ""}
              onChange={(e) => update({ description_ar: e.target.value })}
            />
          </Field>
          <Field
            label={t("الوصف بالإنجليزية", "Description in English")}
            error={fieldErrors.description_en}
          >
            <Textarea
              dir="ltr"
              rows={5}
              ref={(el) => {
                fieldRefs.current.description_en = el;
              }}
              aria-invalid={!!fieldErrors.description_en}
              value={course.description_en ?? ""}
              onChange={(e) => update({ description_en: e.target.value })}
            />
          </Field>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title={t("صورة الغلاف", "Cover image")}
          description={t(
            "تظهر في الكتالوج وصفحة الدورة. حتى 5 ميجابايت.",
            "Shown in the catalog and on the course page. Up to 5MB.",
          )}
        >
          <label className="group relative block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-[var(--cx-line)] bg-[var(--cx-raise)] transition-colors hover:border-[var(--cx-teal)]">
            {course.cover_url ? (
              <img src={course.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 text-[var(--cx-muted)]">
                <ImagePlus className="h-8 w-8" />
                <span className="text-[13px] font-bold">{t("اختر صورة", "Choose an image")}</span>
              </div>
            )}
            {course.cover_url && (
              <span className="absolute bottom-2 end-2 rounded-lg bg-black/60 px-3 py-1.5 text-[12.5px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {t("تغيير الصورة", "Change image")}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!!coverPct}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) uploadCover(f);
              }}
            />
          </label>
          {coverPct && (
            <div className="mt-3">
              <UploadProgress
                percent={coverPct.pct}
                loaded={coverPct.loaded}
                total={coverPct.total}
                label={coverPct.name}
              />
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title={t("التصنيف والمستوى", "Category and level")}>
            <div className="mb-1.5 text-[13px] font-bold text-[var(--cx-ink-2)]">
              {t("التصنيفات (يمكن اختيار أكثر من واحد)", "Categories (you can pick several)")}
            </div>
            {categories.length === 0 ? (
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  "لا توجد تصنيفات. أضفها من الإعدادات.",
                  "No categories yet. Add them in Settings.",
                )}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = selectedCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSelectedCategoryIds(
                          on
                            ? selectedCategoryIds.filter((x) => x !== c.id)
                            : [...selectedCategoryIds, c.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors ${
                        on
                          ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white"
                          : "border-[var(--cx-line)] bg-[var(--cx-field)] text-[var(--cx-ink-2)] hover:border-[var(--cx-teal)]"
                      }`}
                    >
                      {catName(c)}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mb-1.5 mt-4 text-[13px] font-bold text-[var(--cx-ink-2)]">
              {t("المستوى", "Level")}
            </div>
            <Seg
              value={course.level as "beginner" | "intermediate" | "advanced"}
              onChange={(v) => update({ level: v })}
              options={[
                { value: "beginner", label: t("مبتدئ", "Beginner") },
                { value: "intermediate", label: t("متوسط", "Intermediate") },
                { value: "advanced", label: t("متقدّم", "Advanced") },
              ]}
            />
          </Panel>

          <Panel title={t("السعر", "Price")}>
            <ToggleRow
              id="course-free"
              label={t("دورة مجانية", "Free course")}
              checked={course.is_free}
              onChange={(v) => update({ is_free: v })}
            />
            {!course.is_free && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label={t("السعر (ل.س)", "Price (SYP)")}>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={course.price}
                    onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                  />
                </Field>
                <Field label={t("سعر بعد الخصم (اختياري)", "Discounted price (optional)")}>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={course.sale_price ?? ""}
                    placeholder={t("بدون خصم", "No discount")}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      update({ sale_price: v === "" ? null : Math.max(0, parseFloat(v) || 0) });
                    }}
                  />
                </Field>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--cx-raise)] px-3 py-2 text-[13px]">
              <span className="text-[var(--cx-muted)]">
                {t("كما يراه الطالب:", "What students see:")}
              </span>
              <CoursePrice
                price={Number(course.price ?? 0)}
                salePrice={course.sale_price == null ? null : Number(course.sale_price)}
                isFree={!!course.is_free}
                lang={lang}
                freeLabel={t("مجانية", "Free")}
                size="sm"
              />
            </div>
          </Panel>
        </div>
      </div>

      <section className="cx-card">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-start"
          aria-expanded={more}
        >
          <span>
            <span className="block text-[16px] font-extrabold">
              {t("خيارات إضافية", "More options")}
            </span>
            <span className="text-[13px] text-[var(--cx-muted)]">
              {t(
                "رابط مخصّص للدورة والمدرّبون المشاركون",
                "A custom link for the course, and co-instructors",
              )}
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 text-[var(--cx-muted)] transition-transform ${more ? "rotate-180" : ""}`}
          />
        </button>
        {more && (
          <div className="space-y-5 border-t border-[var(--cx-line-2)] p-5">
            <Field
              label={t("الرابط المخصّص (Slug)", "Custom link (slug)")}
              hint={t(
                "أحرف إنجليزية صغيرة وأرقام وشرطات فقط (3–60 حرفاً). يجب أن يكون فريداً.",
                "Lowercase letters, digits and hyphens only (3–60 characters). Must be unique.",
              )}
            >
              <Input
                dir="ltr"
                className="font-mono"
                placeholder="my-course-name"
                value={course.slug ?? ""}
                onChange={(e) =>
                  update({
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, ""),
                  })
                }
              />
              <p className="mt-1 text-[12px] text-[var(--cx-muted)]" dir="ltr">
                aisyria.org/learning-management-system/courses/
                <b className="text-[var(--cx-ink)]">{course.slug || "…"}</b>
              </p>
            </Field>
            {ctx.canManage && (
              <CourseCoInstructors courseId={course.id} ownerId={course.instructor_id} ar={ar} />
            )}
          </div>
        )}
      </section>

      {ctx.canManage && (
        <section className="rounded-2xl border border-[var(--cx-red-line)] bg-[var(--cx-field)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-extrabold text-[var(--cx-red)]">
                {t("حذف الدورة", "Delete this course")}
              </div>
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  "يحذف كل الأقسام والدروس والاختبارات والتسجيلات والشهادات، وسجلات الحضور المرتبطة. لا يمكن التراجع.",
                  "Removes every section, lesson, quiz, enrollment and certificate, and the linked attendance records. This cannot be undone.",
                )}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[var(--cx-red-line)] text-[var(--cx-red)] hover:bg-[var(--cx-red-50)]"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t("حذف الدورة", "Delete course")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
