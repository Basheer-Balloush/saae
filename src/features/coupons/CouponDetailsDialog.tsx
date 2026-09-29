import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Loader2, Mail, MessageCircle, Ticket, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmDialog } from "@/hooks/useConfirm";
import {
  EmptyState,
  Field,
  Loading,
  Pill,
  ReasonDialog,
  ToggleRow,
  fmtDate,
  useT,
} from "@/components/console/ui";
import {
  couponWhatsappText,
  formatSP,
  whatsappNumber,
  type Coupon,
  type CouponUse,
} from "@/lib/coupons";
import { cancelRecognition, deleteCoupon, listCouponUses, updateCoupon } from "@/lib/coupons-db";
import { getCouponLearner, sendPersonalCouponEmail } from "@/lib/coupons-admin.functions";
import { getEmailsForUsers } from "@/lib/lms-admin-users.functions";
import { toUserMessage } from "@/lib/safe-error";
import {
  KIND_LABELS,
  STATUS_LABELS,
  USES_UNIT,
  couponKind,
  couponStatus,
  dateInputValue,
  endOfDay,
  type CouponRefs,
} from "./refs";

const USE_STATUS = {
  pending: { ar: "بانتظار القرار", en: "Waiting", tone: "orange" },
  applied: { ar: "مطبّق", en: "Applied", tone: "green" },
  released: { ar: "أُعيد", en: "Given back", tone: "gray" },
  cancelled: { ar: "ملغى", en: "Cancelled", tone: "red" },
} as const;

/** One coupon: what it does, its limits, who used it, and the actions. */
export function CouponDetailsDialog({
  coupon,
  used,
  refs,
  learnerName,
  onOpenChange,
  onChanged,
}: {
  coupon: Coupon | null;
  used: number;
  refs: CouponRefs;
  learnerName: (id: string | null) => string;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}) {
  const { t, ar, lang } = useT();
  const fetchNames = useServerFn(getEmailsForUsers);
  const sendEmail = useServerFn(sendPersonalCouponEmail);
  const getLearner = useServerFn(getCouponLearner);
  const [uses, setUses] = useState<CouponUse[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState({
    percent: "",
    maxDiscount: "",
    maxUses: "",
    expires: "",
    label: "",
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState<CouponUse | null>(null);

  const load = useCallback(async () => {
    if (!coupon) return;
    setUses(null);
    const list = await listCouponUses({ couponId: coupon.id }).catch(() => [] as CouponUse[]);
    setUses(list);
    const ids = [...new Set(list.map((u) => u.user_id))];
    if (ids.length) {
      const res = await fetchNames({ data: { userIds: ids } }).catch(() => null);
      setNames({ ...(res?.emails ?? {}), ...(res?.names ?? {}) });
    }
  }, [coupon, fetchNames]);

  useEffect(() => {
    if (!coupon) return;
    setEdit({
      percent: coupon.percent_off == null ? "" : String(Number(coupon.percent_off)),
      maxDiscount: coupon.max_discount == null ? "" : String(Number(coupon.max_discount)),
      maxUses: coupon.max_uses == null ? "" : String(coupon.max_uses),
      expires: dateInputValue(coupon.expires_at),
      label: coupon.label ?? "",
    });
    load();
  }, [coupon, load]);

  if (!coupon) return null;
  const kind = couponKind(coupon);
  const status = couponStatus(coupon, used);
  const discount = coupon.effect === "discount";
  const limitsRequired = kind === "recognition" || kind === "category";
  const target =
    kind === "category"
      ? refs.categoryName(coupon.category_id, ar)
      : kind === "personal"
        ? learnerName(coupon.user_id)
        : refs.courseName(coupon.course_id, ar);

  const patch = async (p: Partial<Coupon>, done: string) => {
    setSaving(true);
    try {
      await updateCoupon(coupon.id, p);
      toast.success(done);
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveLimits = () => {
    const percent = Number(edit.percent);
    if (discount && !(percent > 0 && percent <= 100))
      return toast.error(t("نسبة الخصم بين 1 و100.", "The discount is from 1 to 100%."));
    const maxUses = edit.maxUses.trim() ? Number(edit.maxUses) : null;
    if (maxUses != null && !(Number.isInteger(maxUses) && maxUses > 0))
      return toast.error(
        t("عدد الاستخدامات عدد صحيح أكبر من صفر.", "Uses must be a whole number above zero."),
      );
    if (limitsRequired && (maxUses == null || !edit.expires))
      return toast.error(
        t("هذا النوع يحتاج حداً وتاريخ انتهاء.", "This kind needs a limit and an end date."),
      );
    const maxDiscount = edit.maxDiscount.trim() ? Number(edit.maxDiscount) : null;
    if (maxDiscount != null && !(maxDiscount > 0))
      return toast.error(t("أقصى خصم أكبر من صفر.", "The maximum discount must be above zero."));
    patch(
      {
        ...(discount ? { percent_off: percent, max_discount: maxDiscount } : {}),
        max_uses: maxUses,
        expires_at: endOfDay(edit.expires),
        label: edit.label.trim() || null,
      },
      t("حُفظت التغييرات", "Changes saved"),
    );
  };

  const remove = async () => {
    if (
      !(await confirmDialog({
        title: t(`حذف الكوبون ${coupon.code}؟`, `Delete coupon ${coupon.code}?`),
        description: t(
          "لم يستخدمه أحد، لذلك يمكن حذفه نهائياً.",
          "Nobody has used it, so it can be deleted for good.",
        ),
        destructive: true,
      }))
    )
      return;
    try {
      if (!(await deleteCoupon(coupon.id))) {
        toast.error(
          t(
            "استُخدم هذا الكوبون، لذلك يمكن إيقافه فقط.",
            "This coupon has been used, so it can only be switched off.",
          ),
        );
        return;
      }
      toast.success(t("حُذف الكوبون", "Coupon deleted"));
      onOpenChange(false);
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const email = async () => {
    setSending(true);
    try {
      const res = await sendEmail({ data: { couponId: coupon.id, lang } });
      toast.success(t(`أُرسل الكوبون إلى ${res.sentTo}`, `Coupon sent to ${res.sentTo}`));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("learner_has_no_email")
          ? t("لا يوجد بريد لهذا المتعلّم.", "This learner has no email.")
          : msg.includes("coupon_inactive")
            ? t("الكوبون متوقف. فعّله أولاً.", "The coupon is switched off. Switch it on first.")
            : toUserMessage(e),
      );
    } finally {
      setSending(false);
    }
  };

  const whatsapp = async () => {
    try {
      const learner = await getLearner({ data: { couponId: coupon.id } });
      const phone = whatsappNumber(learner.phone);
      if (!phone) {
        toast.error(t("لا يوجد رقم هاتف لهذا المتعلّم.", "This learner has no phone number."));
        return;
      }
      const text = couponWhatsappText(
        coupon,
        learner.name,
        `${window.location.origin}/learning-management-system/catalog`,
        ar,
      );
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success(t("نُسخ الكود", "Code copied"));
    } catch {
      toast.error(t("تعذّر النسخ", "Could not copy"));
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-[20px] tracking-wider">
              {coupon.code}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={copy}
              aria-label={t("نسخ الكود", "Copy code")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Pill tone={STATUS_LABELS[status].tone}>
              {ar ? STATUS_LABELS[status].ar : STATUS_LABELS[status].en}
            </Pill>
          </DialogTitle>
          <DialogDescription>
            {ar ? KIND_LABELS[kind].ar : KIND_LABELS[kind].en} · {target}
            {coupon.label ? ` · ${coupon.label}` : ""}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--cx-raise-2)] p-4 text-[13.5px] sm:grid-cols-4">
          <div>
            <dt className="text-[var(--cx-muted)]">{t("الأثر", "Effect")}</dt>
            <dd className="font-bold">
              {discount
                ? `${Number(coupon.percent_off)}٪${coupon.max_discount != null ? ` · ${t("حد", "max")} ${formatSP(Number(coupon.max_discount), ar)}` : ""}`
                : t("الدورة مكتملة", "Course completed")}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">{t("الاستخدام", "Used")}</dt>
            <dd className="font-bold tabular-nums">
              {used} / {coupon.max_uses ?? "∞"} {ar ? USES_UNIT[kind].ar : USES_UNIT[kind].en}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">{t("ينتهي", "Ends")}</dt>
            <dd className="font-bold">
              {coupon.expires_at ? fmtDate(coupon.expires_at, lang) : t("بلا تاريخ", "No end date")}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">{t("أُنشئ", "Created")}</dt>
            <dd className="font-bold">{fmtDate(coupon.created_at, lang)}</dd>
          </div>
        </dl>

        <ToggleRow
          id="coupon-active"
          label={t("الكوبون مفعّل", "Coupon is on")}
          hint={t(
            "إيقافه يمنع أي استخدام جديد. الطلبات المرسلة تبقى بسعرها.",
            "Switching it off stops new uses. Requests already sent keep their price.",
          )}
          checked={coupon.active}
          disabled={saving}
          onChange={(v) =>
            patch(
              { active: v },
              v
                ? t("فُعّل الكوبون", "Coupon switched on")
                : t("أُوقف الكوبون", "Coupon switched off"),
            )
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {discount && (
            <>
              <Field label={t("نسبة الخصم ٪", "Discount %")} htmlFor="edit-percent">
                <Input
                  id="edit-percent"
                  dir="ltr"
                  inputMode="decimal"
                  value={edit.percent}
                  onChange={(e) => setEdit({ ...edit, percent: e.target.value })}
                />
              </Field>
              <Field label={t("أقصى خصم ل.س", "Maximum discount SP")} htmlFor="edit-max">
                <Input
                  id="edit-max"
                  dir="ltr"
                  inputMode="decimal"
                  value={edit.maxDiscount}
                  onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field
            label={`${t("الحد الأقصى", "Limit")} (${ar ? USES_UNIT[kind].ar : USES_UNIT[kind].en})`}
            htmlFor="edit-uses"
          >
            <Input
              id="edit-uses"
              dir="ltr"
              inputMode="numeric"
              value={edit.maxUses}
              onChange={(e) => setEdit({ ...edit, maxUses: e.target.value })}
            />
          </Field>
          <Field label={t("ينتهي في", "Ends on")} htmlFor="edit-expires">
            <Input
              id="edit-expires"
              type="date"
              value={edit.expires}
              onChange={(e) => setEdit({ ...edit, expires: e.target.value })}
            />
          </Field>
          <Field
            label={t("ملاحظة للإدارة", "Note for admins")}
            htmlFor="edit-label"
            className="sm:col-span-2"
          >
            <Input
              id="edit-label"
              maxLength={200}
              value={edit.label}
              onChange={(e) => setEdit({ ...edit, label: e.target.value })}
            />
          </Field>
        </div>
        <p className="text-[12.5px] text-[var(--cx-muted)]">
          {t(
            "تغيير النسبة أو الحدود يسري على الاستخدامات الجديدة فقط. الكود وما ينطبق عليه لا يتغيّران بعد أول استخدام.",
            "New percentages and limits apply to new uses only. The code and what it applies to stay fixed after the first use.",
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={saveLimits} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("حفظ", "Save")}
          </Button>
          {kind === "personal" && (
            <>
              <Button variant="outline" onClick={email} disabled={sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {t("إرسال بالبريد", "Send by email")}
              </Button>
              <Button variant="outline" onClick={whatsapp}>
                <MessageCircle className="h-4 w-4 text-[var(--cx-green)]" />
                {t("رسالة واتساب", "WhatsApp message")}
              </Button>
            </>
          )}
          {uses !== null && uses.length === 0 && (
            <Button variant="ghost" className="ms-auto text-[var(--cx-red)]" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              {t("حذف", "Delete")}
            </Button>
          )}
        </div>

        <section
          aria-labelledby="coupon-uses-h"
          className="border-t border-[var(--cx-line-2)] pt-4"
        >
          <h3 id="coupon-uses-h" className="mb-2 text-[15px] font-extrabold">
            {t("من استخدمه", "Who used it")}
          </h3>
          {uses === null ? (
            <Loading />
          ) : uses.length === 0 ? (
            <EmptyState
              compact
              icon={Ticket}
              title={t("لم يستخدمه أحد بعد", "Nobody has used it yet")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>{t("المتعلّم", "Learner")}</th>
                    <th>{t("الدورة", "Course")}</th>
                    <th>{t("السعر", "Price")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("التاريخ", "Date")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {uses.map((u) => (
                    <tr key={u.id}>
                      <td className="font-semibold">{names[u.user_id] ?? "—"}</td>
                      <td className="text-[13px]">{refs.courseName(u.course_id, ar)}</td>
                      <td className="whitespace-nowrap text-[13px] tabular-nums">
                        {u.effect === "recognition" ? (
                          t("لا شيء", "Nothing")
                        ) : (
                          <>
                            <s className="text-[var(--cx-muted)]">
                              {formatSP(Number(u.list_price), ar)}
                            </s>{" "}
                            {formatSP(Number(u.final_price), ar)}
                          </>
                        )}
                      </td>
                      <td>
                        <Pill tone={USE_STATUS[u.status].tone}>
                          {ar ? USE_STATUS[u.status].ar : USE_STATUS[u.status].en}
                        </Pill>
                        {u.note && (
                          <div className="mt-1 text-[12px] text-[var(--cx-muted)]">{u.note}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-[var(--cx-muted)]">
                        {fmtDate(u.created_at, lang)}
                      </td>
                      <td>
                        {u.effect === "recognition" && u.status === "applied" && (
                          <Button size="sm" variant="ghost" onClick={() => setCancelling(u)}>
                            <Undo2 className="h-4 w-4" />
                            {t("إلغاء", "Cancel")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ReasonDialog
          open={!!cancelling}
          onOpenChange={(v) => !v && setCancelling(null)}
          title={t("إلغاء الاعتراف؟", "Cancel this recognition?")}
          description={t(
            "يُحذف تسجيل المتعلّم في الدورة وشهادته، ويعود الاستخدام إلى الكود. لا يستطيع المتعلّم استخدام كود آخر في هذه الدورة.",
            "The learner's enrollment and certificate are removed and the use goes back to the code. The learner cannot use another code on this course.",
          )}
          confirmLabel={t("إلغاء الاعتراف", "Cancel recognition")}
          required
          destructive
          onConfirm={async (reason) => {
            if (!cancelling) return;
            try {
              await cancelRecognition(cancelling.id, reason);
              toast.success(t("أُلغي الاعتراف", "Recognition cancelled"));
              await load();
              onChanged();
            } catch (e) {
              toast.error(toUserMessage(e));
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
