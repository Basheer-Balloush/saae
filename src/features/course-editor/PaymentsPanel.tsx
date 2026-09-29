import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Pencil, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  Field,
  Loading,
  Panel,
  Pill,
  ReasonDialog,
  SearchInput,
  Seg,
  fmtDate,
  useT,
} from "@/components/console/ui";
import {
  PAYMENT_METHODS,
  PAYMENT_STATE_LABELS,
  formatSP,
  methodLabel,
  paymentSummary,
  type PaymentEntry,
  type PaymentMethod,
  type PaymentSummary,
} from "@/lib/coupons";
import {
  cancelPaymentEntry,
  loadCoursePayments,
  recordPayment,
  setAmountDue,
  type CertificateResult,
  type CourseEnrollmentMoney,
} from "@/lib/coupons-db";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { toUserMessage } from "@/lib/safe-error";
import type { EditorCtx } from "./types";

type Row = CourseEnrollmentMoney & {
  name: string;
  entries: PaymentEntry[];
  summary: PaymentSummary;
  coupon: string | null;
};

/** Admins only: what each learner owes for the course and has paid, in any
    number of payments, with waivers, corrections and recognition. */
export function PaymentsPanel({
  ctx,
  nameOf,
}: {
  ctx: EditorCtx;
  nameOf: (uid: string) => string;
}) {
  const { course, lang } = ctx;
  const { t, ar } = useT();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCoursePayments>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await loadCoursePayments(course.id));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [course.id]);
  useEffect(() => {
    load();
  }, [load]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.enrollments
      .map((e) => {
        const entries = data.entries.filter((x) => x.student_id === e.student_id);
        const use = data.uses.find((u) => u.user_id === e.student_id && u.status === "applied");
        return {
          ...e,
          name: nameOf(e.student_id),
          entries,
          summary: paymentSummary(e.amount_due, entries),
          coupon: use?.lms_coupons?.code ?? null,
        };
      })
      .sort((a, b) => b.summary.remaining - a.summary.remaining || a.name.localeCompare(b.name));
  }, [data, nameOf]);

  const totals = useMemo(() => {
    let due = 0;
    let paid = 0;
    let remaining = 0;
    let settled = 0;
    for (const r of rows) {
      due += r.summary.due ?? 0;
      paid += r.summary.paid;
      remaining += r.summary.remaining;
      if (["paid", "waived", "free"].includes(r.summary.state)) settled++;
    }
    return { due, paid, remaining, settled };
  }, [rows]);

  const shown = rows.filter(
    (r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const open = rows.find((r) => r.id === openId) ?? null;

  const exportXlsx = async () => {
    await exportRowsToXlsx<Row>({
      filenameBase: `payments-${ar ? course.title_ar : course.title_en || course.title_ar}`,
      sheetName: t("الدفعات", "Payments"),
      rtl: ar,
      columns: [
        { header: t("الطالب", "Student"), type: "text", width: 26, get: (r) => r.name },
        { header: t("السعر", "Price"), type: "number", width: 12, get: (r) => r.list_price },
        { header: t("الخصم", "Discount"), type: "number", width: 12, get: (r) => r.discount },
        { header: t("الكوبون", "Coupon"), type: "text", width: 16, get: (r) => r.coupon ?? "" },
        { header: t("المطلوب", "Owed"), type: "number", width: 12, get: (r) => r.summary.due },
        { header: t("المدفوع", "Paid"), type: "number", width: 12, get: (r) => r.summary.paid },
        { header: t("إعفاء", "Waived"), type: "number", width: 12, get: (r) => r.summary.waived },
        {
          header: t("المتبقي", "Remaining"),
          type: "number",
          width: 12,
          get: (r) => r.summary.remaining,
        },
        {
          header: t("النسبة", "Percent"),
          type: "number",
          width: 10,
          get: (r) => r.summary.percent,
        },
        {
          header: t("الحالة", "Status"),
          type: "text",
          width: 18,
          get: (r) =>
            ar
              ? PAYMENT_STATE_LABELS[r.summary.state].ar
              : PAYMENT_STATE_LABELS[r.summary.state].en,
        },
      ],
      rows,
    });
  };

  return (
    <Panel
      title={t("الدفعات", "Payments")}
      description={t(
        "ما يدين به كل طالب وما دفعه. يظهر للإدارة فقط.",
        "What each student owes and has paid. Admins only.",
      )}
      actions={
        <>
          {rows.length > 6 && (
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("ابحث بالاسم", "Search by name")}
            />
          )}
          <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!rows.length}>
            <Download className="h-4 w-4" />
            {t("تصدير Excel", "Export Excel")}
          </Button>
        </>
      }
      flush
    >
      {failed ? (
        <p className="p-5 text-[13.5px] text-[var(--cx-red)]">
          {t("تعذّر تحميل الدفعات.", "Payments could not be loaded.")}{" "}
          <button type="button" className="font-bold underline" onClick={load}>
            {t("أعد المحاولة", "Try again")}
          </button>
        </p>
      ) : data === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={Wallet}
          title={t("لا يوجد طلاب مسجّلون بعد", "No enrolled students yet")}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 border-b border-[var(--cx-line-2)] px-5 py-4 text-[13.5px] sm:grid-cols-4">
            {[
              { k: t("المطلوب", "Owed"), v: formatSP(totals.due, ar) },
              { k: t("المُحصّل", "Collected"), v: formatSP(totals.paid, ar) },
              { k: t("المتبقي", "Outstanding"), v: formatSP(totals.remaining, ar) },
              { k: t("أنهوا الدفع", "Settled"), v: `${totals.settled} / ${rows.length}` },
            ].map((x) => (
              <div key={x.k}>
                <dt className="text-[var(--cx-muted)]">{x.k}</dt>
                <dd className="text-[16px] font-extrabold tabular-nums">{x.v}</dd>
              </div>
            ))}
          </dl>
          <div className="max-h-[520px] overflow-auto">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>{t("الطالب", "Student")}</th>
                  <th>{t("المطلوب", "Owed")}</th>
                  <th>{t("المدفوع", "Paid")}</th>
                  <th>{t("المتبقي", "Remaining")}</th>
                  <th className="w-[18%]">{t("النسبة", "Share")}</th>
                  <th>{t("الحالة", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const s = r.summary;
                  const label = PAYMENT_STATE_LABELS[s.state];
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                      <td>
                        <button
                          type="button"
                          className="text-start font-semibold hover:text-[var(--cx-teal)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(r.id);
                          }}
                        >
                          {r.name}
                        </button>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {r.completion_source === "recognition" && (
                            <Pill tone="teal">{t("اعتراف", "Recognized")}</Pill>
                          )}
                          {r.coupon && (
                            <span
                              dir="ltr"
                              className="font-mono text-[11.5px] text-[var(--cx-muted)]"
                            >
                              {r.coupon}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="tabular-nums text-[13px]">
                        {s.due == null ? "—" : formatSP(s.due, ar)}
                      </td>
                      <td className="tabular-nums text-[13px]">{formatSP(s.paid, ar)}</td>
                      <td className="tabular-nums text-[13px]">
                        {s.due == null ? "—" : formatSP(s.remaining, ar)}
                      </td>
                      <td>
                        {s.due != null && s.due > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--cx-line-2)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.percent}%`,
                                  background:
                                    s.remaining === 0 ? "var(--cx-green)" : "var(--cx-teal)",
                                }}
                              />
                            </div>
                            <span className="w-9 text-end text-[12.5px] font-bold tabular-nums">
                              {s.percent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--cx-muted)]">—</span>
                        )}
                      </td>
                      <td>
                        <Pill tone={label.tone}>{ar ? label.ar : label.en}</Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {open && (
        <LearnerPaymentsDialog
          row={open}
          ctx={ctx}
          lang={lang}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </Panel>
  );
}

const KIND_TEXT = {
  payment: { ar: "دفعة", en: "Payment" },
  waiver: { ar: "إعفاء", en: "Waiver" },
  correction: { ar: "إلغاء قيد", en: "Correction" },
} as const;

function LearnerPaymentsDialog({
  row,
  ctx,
  lang,
  onClose,
  onChanged,
}: {
  row: Row;
  ctx: EditorCtx;
  lang: "ar" | "en";
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t, ar } = useT();
  const emailCertificate = useServerFn(sendCertificateEmail);
  const s = row.summary;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState<PaymentEntry | null>(null);
  const [waiving, setWaiving] = useState(false);
  const [editingDue, setEditingDue] = useState(false);

  // A payment that completes the course issues the certificate: email it.
  const afterCertificateCheck = async (c: CertificateResult | undefined) => {
    if (c?.issued && c.certificate_id) {
      await emailCertificate({
        data: { courseId: ctx.course.id, studentId: row.student_id, lang },
      }).catch(() => undefined);
      toast.success(
        t(
          "اكتمل الدفع وصدرت الشهادة وأُرسلت إلى الطالب.",
          "Fully paid: the certificate was issued and emailed.",
        ),
      );
    }
  };

  const record = async (kind: "payment" | "waiver", value: number, text: string) => {
    setBusy(true);
    try {
      const res = await recordPayment({
        courseId: ctx.course.id,
        studentId: row.student_id,
        kind,
        amount: value,
        method: kind === "payment" ? method : null,
        paidOn: kind === "payment" ? paidOn : null,
        reference: kind === "payment" ? reference.trim() || null : null,
        note: text.trim() || null,
      });
      toast.success(
        kind === "payment"
          ? t("سُجّلت الدفعة", "Payment recorded")
          : t("سُجّل الإعفاء", "Waiver recorded"),
      );
      setAmount("");
      setReference("");
      setNote("");
      await afterCertificateCheck(res.certificate);
      await onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("payment_date_in_future")
          ? t("تاريخ الدفعة في المستقبل.", "The payment date is in the future.")
          : toUserMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0))
      return toast.error(t("اكتب مبلغاً أكبر من صفر.", "Enter an amount above zero."));
    if (s.due != null && s.remaining > 0 && value > s.remaining)
      return toast.error(
        t(
          `المبلغ أكبر من المتبقي (${formatSP(s.remaining, true)}).`,
          `The amount is more than what remains (${formatSP(s.remaining, false)}).`,
        ),
      );
    record("payment", value, note);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            {row.list_price != null && Number(row.discount) > 0
              ? t(
                  `السعر ${formatSP(Number(row.list_price), true)} ناقص خصم ${formatSP(Number(row.discount), true)}${row.coupon ? ` (${row.coupon})` : ""}`,
                  `Price ${formatSP(Number(row.list_price), false)} less ${formatSP(Number(row.discount), false)} off${row.coupon ? ` (${row.coupon})` : ""}`,
                )
              : row.completion_source === "recognition"
                ? t("أكمل الدورة بالاعتراف.", "Completed by recognition.")
                : t("بلا خصم.", "No discount.")}
            {row.amount_due_note ? ` · ${row.amount_due_note}` : ""}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--cx-raise-2)] p-4 text-[13.5px] sm:grid-cols-4">
          <div>
            <dt className="text-[var(--cx-muted)]">{t("المطلوب", "Owed")}</dt>
            <dd className="flex items-center gap-1 font-extrabold tabular-nums">
              {s.due == null ? t("غير محدد", "Not set") : formatSP(s.due, ar)}
              <button
                type="button"
                className="text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
                onClick={() => setEditingDue(true)}
                aria-label={t("تعديل المطلوب", "Change what is owed")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">{t("المدفوع", "Paid")}</dt>
            <dd className="font-extrabold tabular-nums">{formatSP(s.paid, ar)}</dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">
              {s.waived > 0 ? t("إعفاء", "Waived") : t("النسبة", "Share")}
            </dt>
            <dd className="font-extrabold tabular-nums">
              {s.waived > 0 ? formatSP(s.waived, ar) : `${s.percent}%`}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cx-muted)]">{t("المتبقي", "Remaining")}</dt>
            <dd className="font-extrabold tabular-nums">
              {s.due == null ? "—" : formatSP(s.remaining, ar)}
            </dd>
          </div>
        </dl>

        {s.due != null && s.remaining > 0 && (
          <form
            onSubmit={submitPayment}
            className="space-y-3 rounded-xl border border-[var(--cx-line)] p-4"
          >
            <h3 className="text-[14.5px] font-extrabold">{t("تسجيل دفعة", "Record a payment")}</h3>
            <Seg
              value={method}
              onChange={setMethod}
              options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: ar ? m.ar : m.en }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("المبلغ ل.س", "Amount SP")} htmlFor="pay-amount">
                <Input
                  id="pay-amount"
                  dir="ltr"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(s.remaining)}
                />
              </Field>
              <Field label={t("التاريخ", "Date")} htmlFor="pay-date">
                <Input
                  id="pay-date"
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </Field>
              <Field label={t("رقم المرجع (اختياري)", "Reference (optional)")} htmlFor="pay-ref">
                <Input
                  id="pay-ref"
                  dir="ltr"
                  maxLength={100}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
            </div>
            <Field label={t("ملاحظة (اختياري)", "Note (optional)")} htmlFor="pay-note">
              <Input
                id="pay-note"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("تسجيل الدفعة", "Record payment")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setAmount(String(s.remaining))}
              >
                {t("كامل المتبقي", "All that remains")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setWaiving(true)}
              >
                {t("إعفاء من المتبقي", "Waive the rest")}
              </Button>
            </div>
          </form>
        )}

        <section aria-labelledby="pay-history-h">
          <h3 id="pay-history-h" className="mb-2 text-[14.5px] font-extrabold">
            {t("السجل", "History")}
          </h3>
          {row.entries.length === 0 ? (
            <p className="text-[13px] text-[var(--cx-muted)]">
              {t("لم تُسجّل أي دفعة بعد.", "No payments recorded yet.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {row.entries.map((e) => {
                const cancelled = s.cancelled.has(e.id);
                return (
                  <li
                    key={e.id}
                    className={`flex flex-wrap items-start gap-3 rounded-lg border border-[var(--cx-line)] px-3 py-2 text-[13px] ${cancelled ? "opacity-60" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-bold">
                        <span className={cancelled ? "line-through" : ""}>
                          {formatSP(Number(e.amount), ar)}
                        </span>
                        <Pill
                          tone={
                            e.kind === "correction" ? "red" : e.kind === "waiver" ? "teal" : "green"
                          }
                        >
                          {ar ? KIND_TEXT[e.kind].ar : KIND_TEXT[e.kind].en}
                        </Pill>
                        {e.kind === "payment" && (
                          <span className="text-[var(--cx-muted)]">
                            {methodLabel(e.method, ar)}
                          </span>
                        )}
                        {cancelled && (
                          <span className="text-[var(--cx-red)]">{t("أُلغي", "Cancelled")}</span>
                        )}
                      </div>
                      <div className="text-[12px] text-[var(--cx-muted)]">
                        {fmtDate(e.paid_on, lang)}
                        {e.reference ? ` · ${e.reference}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    {e.kind !== "correction" && !cancelled && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelling(e)}>
                        <Undo2 className="h-4 w-4" />
                        {t("إلغاء القيد", "Cancel entry")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ReasonDialog
          open={!!cancelling}
          onOpenChange={(v) => !v && setCancelling(null)}
          title={t("إلغاء هذا القيد؟", "Cancel this entry?")}
          description={t(
            "لا يُحذف القيد: يُضاف قيد يعاكسه، ويبقى الاثنان في السجل.",
            "The entry is not deleted: an opposite entry is added and both stay in the history.",
          )}
          confirmLabel={t("إلغاء القيد", "Cancel entry")}
          required
          destructive
          onConfirm={async (reason) => {
            if (!cancelling) return;
            try {
              await cancelPaymentEntry(cancelling.id, reason);
              toast.success(t("أُلغي القيد", "Entry cancelled"));
              await onChanged();
            } catch (e) {
              toast.error(toUserMessage(e));
            }
          }}
        />
        <ReasonDialog
          open={waiving}
          onOpenChange={setWaiving}
          title={t(
            `إعفاء من ${formatSP(s.remaining, true)}؟`,
            `Waive ${formatSP(s.remaining, false)}?`,
          )}
          description={t(
            "يُعفى الطالب من المتبقي ولا يُحسب مالاً مقبوضاً.",
            "The student no longer owes the rest; it is not counted as money received.",
          )}
          confirmLabel={t("إعفاء", "Waive")}
          required
          onConfirm={(reason) => record("waiver", s.remaining, reason)}
        />
        <AmountDueDialog
          open={editingDue}
          onOpenChange={setEditingDue}
          current={s.due}
          onSave={async (value, reason) => {
            try {
              const res = await setAmountDue(row.id, value, reason);
              toast.success(t("حُدّث المطلوب", "Amount owed updated"));
              await afterCertificateCheck(res.certificate);
              await onChanged();
            } catch (e) {
              toast.error(toUserMessage(e));
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AmountDueDialog({
  open,
  onOpenChange,
  current,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: number | null;
  onSave: (value: number, reason: string) => Promise<void>;
}) {
  const { t } = useT();
  const [value, setValue] = useState(current == null ? "" : String(current));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = value.trim() !== "" && Number(value) >= 0 && reason.trim() !== "";
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("تعديل المطلوب", "Change what is owed")}</DialogTitle>
          <DialogDescription>
            {t("يبقى السبب مسجّلاً مع التسجيل.", "The reason is kept with the enrollment.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("المطلوب ل.س", "Owed SP")} htmlFor="due-amount">
            <Input
              id="due-amount"
              dir="ltr"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label={t("السبب", "Reason")} htmlFor="due-reason">
            <Input
              id="due-reason"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(Number(value), reason.trim());
                setReason("");
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("حفظ", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
