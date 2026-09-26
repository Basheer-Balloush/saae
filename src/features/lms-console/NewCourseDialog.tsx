import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { toUserMessage } from "@/lib/safe-error";
import {
  courseI18nWriteErrorMessage,
  firstInvalidCourseField,
  trimCourseI18n,
  validateCourseI18n,
  type CourseFieldErrors,
  type RequiredCourseField,
} from "@/lib/lms-course-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, useT } from "@/components/console/ui";

const EMPTY = { title_ar: "", title_en: "", description_ar: "", description_en: "" };

/* Creating a course asks only for what the database requires (the titles and
   descriptions in both languages) and, for an admin, who teaches it.
   Everything else is filled in afterwards, in the course editor. */
export function NewCourseDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** "admin" picks an approved instructor; "instructor" creates for yourself. */
  mode: "admin" | "instructor";
}) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const [form, setForm] = useState(EMPTY);
  const [instructorId, setInstructorId] = useState("");
  const [instructors, setInstructors] = useState<{ user_id: string; full_name: string }[]>([]);
  const [errors, setErrors] = useState<CourseFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const refs = useRef<
    Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});

  useEffect(() => {
    if (!open || mode !== "admin") return;
    supabase
      .from("lms_instructors")
      .select("user_id,full_name")
      .eq("approved", true)
      .order("full_name")
      .then(({ data }) => setInstructors((data as { user_id: string; full_name: string }[]) ?? []));
  }, [open, mode]);

  const ensureOwnInstructorProfile = async (): Promise<boolean> => {
    if (!user || role !== "admin") return true;
    // Course ownership references an instructor profile, even for an admin.
    const { data: profile, error } = await supabase
      .from("lms_instructors")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      toast.error(toUserMessage(error));
      return false;
    }
    if (profile) return true;
    const { data: own } = await supabase
      .from("lms_user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const fullName =
      own?.full_name?.trim() ||
      String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    if (!fullName) {
      toast.error(
        t(
          "أضف اسمك في ملفك الشخصي قبل إنشاء الدورة.",
          "Add your name to your profile before creating a course.",
        ),
      );
      return false;
    }
    const { error: insertError } = await supabase
      .from("lms_instructors")
      .insert({ user_id: user.id, full_name: fullName, approved: false });
    if (insertError && insertError.code !== "23505") {
      toast.error(toUserMessage(insertError));
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || busy) return;
    const next = validateCourseI18n(form, lang);
    setErrors(next);
    const bad = firstInvalidCourseField(next);
    if (bad) {
      refs.current[bad]?.focus();
      return;
    }
    if (mode === "admin" && !instructorId) {
      toast.error(t("اختر مدرّب الدورة", "Choose who teaches the course"));
      return;
    }
    setBusy(true);
    if (mode === "instructor" && !(await ensureOwnInstructorProfile())) {
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("lms_courses")
      .insert({ instructor_id: mode === "admin" ? instructorId : user.id, ...trimCourseI18n(form) })
      .select("id")
      .maybeSingle();
    setBusy(false);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return;
    }
    toast.success(
      t("تم إنشاء الدورة. أكمل تفاصيلها الآن.", "Course created. Now fill in its details."),
    );
    setForm(EMPTY);
    setInstructorId("");
    onOpenChange(false);
    if (data) {
      navigate({
        to:
          mode === "admin"
            ? "/learning-management-system/admin/courses/$id"
            : "/learning-management-system/instructor/courses/$id",
        params: { id: data.id },
      });
    }
  };

  const set = (k: RequiredCourseField, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("دورة جديدة", "New course")}</DialogTitle>
          <DialogDescription>
            {t(
              "ابدأ بالاسم والوصف فقط. باقي التفاصيل (الغلاف، السعر، الموعد، المحتوى) تضيفها بعد الإنشاء.",
              "Start with the name and description only. Add the rest (cover, price, schedule, content) after creating it.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("الاسم بالعربية", "Name in Arabic")} error={errors.title_ar}>
              <Input
                dir="rtl"
                ref={(el) => {
                  refs.current.title_ar = el;
                }}
                value={form.title_ar}
                aria-invalid={!!errors.title_ar}
                onChange={(e) => set("title_ar", e.target.value)}
              />
            </Field>
            <Field label={t("الاسم بالإنجليزية", "Name in English")} error={errors.title_en}>
              <Input
                dir="ltr"
                ref={(el) => {
                  refs.current.title_en = el;
                }}
                value={form.title_en}
                aria-invalid={!!errors.title_en}
                onChange={(e) => set("title_en", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={t("وصف قصير بالعربية", "Short description in Arabic")}
            error={errors.description_ar}
          >
            <Textarea
              dir="rtl"
              rows={2}
              ref={(el) => {
                refs.current.description_ar = el;
              }}
              value={form.description_ar}
              aria-invalid={!!errors.description_ar}
              onChange={(e) => set("description_ar", e.target.value)}
            />
          </Field>
          <Field
            label={t("وصف قصير بالإنجليزية", "Short description in English")}
            error={errors.description_en}
          >
            <Textarea
              dir="ltr"
              rows={2}
              ref={(el) => {
                refs.current.description_en = el;
              }}
              value={form.description_en}
              aria-invalid={!!errors.description_en}
              onChange={(e) => set("description_en", e.target.value)}
            />
          </Field>
          {mode === "admin" && (
            <Field label={t("المدرّب", "Instructor")}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              >
                <option value="">
                  {t("اختر مدرّباً معتمَداً", "Pick an approved instructor")}
                </option>
                {instructors.map((i) => (
                  <option key={i.user_id} value={i.user_id}>
                    {i.full_name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("إلغاء", "Cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("إنشاء ومتابعة", "Create and continue")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
