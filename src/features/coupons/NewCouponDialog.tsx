import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, useT } from "@/components/console/ui";
import {
  codeProblem,
  discountFor,
  formatSP,
  normalizeCode,
  randomCode,
  type Coupon,
} from "@/lib/coupons";
import { createCoupon } from "@/lib/coupons-db";
import { findLearners, type Learner } from "@/lib/coupons-admin.functions";
import { toUserMessage } from "@/lib/safe-error";
import { KIND_LABELS, endOfDay, type CouponKind, type CouponRefs } from "./refs";

type Form = {
  kind: CouponKind;
  code: string;
  label: string;
  courseId: string;
  categoryId: string;
  learner: Learner | null;
  percent: string;
  maxDiscount: string;
  maxUses: string;
  expires: string;
};

const EMPTY: Form = {
  kind: "recognition",
  code: "",
  label: "",
  courseId: "",
  categoryId: "",
  learner: null,
  percent: "",
  maxDiscount: "",
  maxUses: "",
  expires: "",
};

const posInt = (v: string) => /^\d+$/.test(v.trim()) && Number(v) > 0;
const posNum = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0;

/** Creates a coupon of any of the four kinds. */
export function NewCouponDialog({
  open,
  onOpenChange,
  refs,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refs: CouponRefs;
  onCreated: (c: Coupon) => void;
}) {
  const { t, ar } = useT();
  const [f, setF] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));

  const discount = f.kind !== "recognition";
  const limitsRequired = f.kind === "recognition" || f.kind === "category";
  const onlineCourses = refs.courses.filter((c) => c.delivery_mode === "online");
  const courseChoices = f.kind === "recognition" ? onlineCourses : refs.courses;

  const problems = useMemo(() => {
    const p: Partial<Record<keyof Form, string>> = {};
    const cp = codeProblem(f.code);
    if (cp === "empty") p.code = t("اكتب الكود.", "Write the code.");
    else if (cp === "too_short") p.code = t("٣ أحرف على الأقل.", "At least 3 characters.");
    else if (cp === "too_long") p.code = t("٤٠ حرفاً على الأكثر.", "At most 40 characters.");
    else if (cp === "characters")
      p.code = t(
        "أحرف إنجليزية وأرقام و - أو _ فقط، ويبدأ بحرف أو رقم.",
        "English letters, digits, - or _ only, starting with a letter or digit.",
      );
    if ((f.kind === "recognition" || f.kind === "course") && !f.courseId)
      p.courseId = t("اختر الدورة.", "Choose the course.");
    if (f.kind === "category" && !f.categoryId)
      p.categoryId = t("اختر التصنيف.", "Choose the category.");
    if (f.kind === "personal" && !f.learner) p.learner = t("اختر المتعلّم.", "Choose the learner.");
    if (discount && !(posNum(f.percent) && Number(f.percent) <= 100))
      p.percent = t("نسبة بين 1 و100.", "A percentage from 1 to 100.");
    if (f.maxDiscount.trim() && !posNum(f.maxDiscount))
      p.maxDiscount = t("مبلغ أكبر من صفر.", "An amount above zero.");
    if (limitsRequired ? !posInt(f.maxUses) : f.maxUses.trim() && !posInt(f.maxUses))
      p.maxUses = t("عدد صحيح أكبر من صفر.", "A whole number above zero.");
    const end = endOfDay(f.expires);
    if (limitsRequired && !end) p.expires = t("اختر تاريخ الانتهاء.", "Choose the end date.");
    else if (end && new Date(end).getTime() <= Date.now())
      p.expires = t("تاريخ في المستقبل.", "A date in the future.");
    return p;
  }, [f, discount, limitsRequired, t]);

  // An example with a real price, so the admin sees what the numbers mean.
  const sample = useMemo(() => {
    if (!discount || !posNum(f.percent)) return null;
    const course =
      f.kind === "course"
        ? refs.courses.find((c) => c.id === f.courseId)
        : f.kind === "category" && f.categoryId
          ? refs.coursesIn(f.categoryId).find((c) => refs.priceOf(c) > 0)
          : undefined;
    const price = course ? refs.priceOf(course) : 4650;
    if (!(price > 0)) return null;
    const d = discountFor(
      price,
      Number(f.percent),
      f.maxDiscount.trim() ? Number(f.maxDiscount) : null,
    );
    return { price, d, name: course ? refs.courseName(course.id, ar) : null };
  }, [discount, f, refs, ar]);

  const close = () => {
    if (saving) return;
    onOpenChange(false);
    setF(EMPTY);
    setTried(false);
  };

  const save = async () => {
    setTried(true);
    if (Object.keys(problems).length) return;
    setSaving(true);
    try {
      const created = await createCoupon({
        code: normalizeCode(f.code),
        effect: f.kind === "recognition" ? "recognition" : "discount",
        scope: f.kind === "recognition" ? "course" : f.kind,
        course_id: f.kind === "recognition" || f.kind === "course" ? f.courseId : null,
        category_id: f.kind === "category" ? f.categoryId : null,
        user_id: f.kind === "personal" ? (f.learner?.id ?? null) : null,
        percent_off: discount ? Number(f.percent) : null,
        max_discount: discount && f.maxDiscount.trim() ? Number(f.maxDiscount) : null,
        max_uses: f.maxUses.trim() ? Number(f.maxUses) : null,
        expires_at: endOfDay(f.expires),
        active: true,
        label: f.label.trim() || null,
      });
      toast.success(t("أُنشئ الكوبون", "Coupon created"));
      onCreated(created);
      setF(EMPTY);
      setTried(false);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("lms_coupons_code_key")
          ? t(
              "هذا الكود مستخدم لكوبون آخر. اختر كوداً غيره.",
              "Another coupon has this code. Choose another.",
            )
          : msg.includes("recognition_online_only")
            ? t(
                "كود الاعتراف للدورات الأونلاين فقط.",
                "Recognition codes are for online courses only.",
              )
            : toUserMessage(e),
      );
    } finally {
      setSaving(false);
    }
  };

  const err = (k: keyof Form) => (tried ? problems[k] : undefined);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("كوبون جديد", "New coupon")}</DialogTitle>
          <DialogDescription>
            {ar ? KIND_LABELS[f.kind].hint.ar : KIND_LABELS[f.kind].hint.en}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("النوع", "Kind")}>
            {(Object.keys(KIND_LABELS) as CouponKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.kind === k}
                onClick={() =>
                  set({
                    kind: k,
                    courseId: "",
                    code: k === "personal" && !f.code ? randomCode() : f.code,
                  })
                }
                className={`rounded-xl border px-3 py-2.5 text-start text-[13.5px] font-bold transition-colors ${
                  f.kind === k
                    ? "border-[var(--cx-teal)] bg-[var(--cx-teal-50)] text-[var(--cx-teal-700)]"
                    : "border-[var(--cx-line)] text-[var(--cx-ink-2)] hover:border-[var(--cx-teal)]"
                }`}
              >
                {ar ? KIND_LABELS[k].ar : KIND_LABELS[k].en}
              </button>
            ))}
          </div>

          <Field
            label={t("الكود", "Code")}
            htmlFor="coupon-code"
            error={err("code")}
            hint={t(
              "لا فرق بين الأحرف الكبيرة والصغيرة، وتُحذف المسافات.",
              "Capitals and spaces do not matter.",
            )}
          >
            <div className="flex gap-2">
              <Input
                id="coupon-code"
                dir="ltr"
                className="font-mono uppercase"
                value={f.code}
                onChange={(e) => set({ code: e.target.value })}
                placeholder={f.kind === "recognition" ? "ARCHATHON2025" : "SPRING20"}
              />
              <Button type="button" variant="outline" onClick={() => set({ code: randomCode() })}>
                <Shuffle className="h-4 w-4" />
                {t("توليد", "Generate")}
              </Button>
            </div>
          </Field>

          {(f.kind === "recognition" || f.kind === "course") && (
            <Field label={t("الدورة", "Course")} htmlFor="coupon-course" error={err("courseId")}>
              <select
                id="coupon-course"
                className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
                value={f.courseId}
                onChange={(e) => set({ courseId: e.target.value })}
              >
                <option value="">{t("اختر الدورة", "Choose the course")}</option>
                {courseChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {refs.courseName(c.id, ar)}
                    {c.status !== "published" ? ` (${t("غير منشورة", "not published")})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {f.kind === "category" && (
            <Field
              label={t("التصنيف", "Category")}
              htmlFor="coupon-category"
              error={err("categoryId")}
            >
              <select
                id="coupon-category"
                className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
                value={f.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
              >
                <option value="">{t("اختر التصنيف", "Choose the category")}</option>
                {refs.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {refs.categoryName(c.id, ar)} ({refs.coursesIn(c.id).length})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {f.kind === "personal" && (
            <LearnerPicker
              value={f.learner}
              onChange={(learner) => set({ learner })}
              error={err("learner")}
            />
          )}

          {discount && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("نسبة الخصم ٪", "Discount %")}
                htmlFor="coupon-percent"
                error={err("percent")}
              >
                <Input
                  id="coupon-percent"
                  inputMode="decimal"
                  dir="ltr"
                  value={f.percent}
                  onChange={(e) => set({ percent: e.target.value })}
                  placeholder="20"
                />
              </Field>
              <Field
                label={t("أقصى خصم ل.س (اختياري)", "Maximum discount SP (optional)")}
                htmlFor="coupon-max"
                error={err("maxDiscount")}
                hint={t(
                  "لا يتجاوز الخصم هذا المبلغ مهما كان السعر.",
                  "The discount never goes above this amount.",
                )}
              >
                <Input
                  id="coupon-max"
                  inputMode="decimal"
                  dir="ltr"
                  value={f.maxDiscount}
                  onChange={(e) => set({ maxDiscount: e.target.value })}
                  placeholder="400"
                />
              </Field>
            </div>
          )}

          {sample && (
            <p className="rounded-lg bg-[var(--cx-raise-2)] px-3 py-2 text-[13px]" role="status">
              {sample.name
                ? t(
                    `مثال على «${sample.name}» (${formatSP(sample.price, true)}): `,
                    `Example on “${sample.name}” (${formatSP(sample.price, false)}): `,
                  )
                : t(
                    `مثال على دورة سعرها ${formatSP(sample.price, true)}: `,
                    `Example on a ${formatSP(sample.price, false)} course: `,
                  )}
              <strong>
                {t(
                  `خصم ${formatSP(sample.d, true)}، يدفع ${formatSP(sample.price - sample.d, true)}`,
                  `${formatSP(sample.d, false)} off, pays ${formatSP(sample.price - sample.d, false)}`,
                )}
              </strong>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                f.kind === "category"
                  ? t("أقصى عدد من المتعلّمين", "Maximum learners")
                  : f.kind === "personal"
                    ? t("عدد الدورات (اختياري)", "Number of courses (optional)")
                    : limitsRequired
                      ? t("أقصى عدد استخدامات", "Maximum uses")
                      : t("أقصى عدد استخدامات (اختياري)", "Maximum uses (optional)")
              }
              htmlFor="coupon-uses"
              error={err("maxUses")}
              hint={
                f.kind === "recognition"
                  ? t("عدد من سترسل لهم الكود.", "How many people you send the code to.")
                  : undefined
              }
            >
              <Input
                id="coupon-uses"
                inputMode="numeric"
                dir="ltr"
                value={f.maxUses}
                onChange={(e) => set({ maxUses: e.target.value })}
              />
            </Field>
            <Field
              label={
                limitsRequired
                  ? t("ينتهي في", "Ends on")
                  : t("ينتهي في (اختياري)", "Ends on (optional)")
              }
              htmlFor="coupon-expires"
              error={err("expires")}
              hint={t("يعمل حتى نهاية هذا اليوم.", "Works until the end of this day.")}
            >
              <Input
                id="coupon-expires"
                type="date"
                value={f.expires}
                onChange={(e) => set({ expires: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={t("ملاحظة للإدارة (اختياري)", "Note for admins (optional)")}
            htmlFor="coupon-label"
            hint={t("لا يراها المتعلّمون.", "Learners never see it.")}
          >
            <Input
              id="coupon-label"
              value={f.label}
              maxLength={200}
              onChange={(e) => set({ label: e.target.value })}
              placeholder={t("مثال: حضور أركاثون 2025", "e.g. Archathon 2025 attendees")}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إنشاء الكوبون", "Create coupon")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Finds a learner by email or phone number. */
function LearnerPicker({
  value,
  onChange,
  error,
}: {
  value: Learner | null;
  onChange: (l: Learner | null) => void;
  error?: string;
}) {
  const { t } = useT();
  const find = useServerFn(findLearners);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Learner[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (query.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      setResults((await find({ data: { query } })).learners);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <Field label={t("المتعلّم", "Learner")}>
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--cx-teal)] bg-[var(--cx-teal-50)] px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">{value.name || value.email}</div>
            <div className="truncate text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
              {[value.email, value.phone].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
            aria-label={t("تغيير", "Change")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Field>
    );
  }

  return (
    <Field
      label={t("المتعلّم", "Learner")}
      htmlFor="coupon-learner"
      error={error}
      hint={t(
        "ابحث ببريده الإلكتروني أو رقم هاتفه. يجب أن يكون لديه حساب.",
        "Search by email or phone number. They need an account.",
      )}
    >
      <div className="flex gap-2">
        <Input
          id="coupon-learner"
          dir="ltr"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="name@example.com / 09…"
        />
        <Button
          type="button"
          variant="outline"
          onClick={search}
          disabled={busy || query.trim().length < 3}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t("بحث", "Search")}
        </Button>
      </div>
      {results && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {results.length === 0 && (
            <li className="px-1 text-[13px] text-[var(--cx-muted)]">
              {t("لا يوجد حساب بهذا البريد أو الرقم.", "No account with this email or number.")}
            </li>
          )}
          {results.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onChange(l)}
                className="w-full rounded-lg border border-[var(--cx-line)] px-3 py-2 text-start hover:border-[var(--cx-teal)]"
              >
                <div className="text-[14px] font-bold">{l.name || l.email}</div>
                <div className="text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
                  {[l.email, l.phone].filter(Boolean).join(" · ")}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
