import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNote, Loading, Pill, fmtDate, useT } from "@/components/console/ui";
import { BASE_FIELD_IDS } from "@/features/lms/catalog/EnrollmentFormDialog";
import {
  PAYMENT_METHOD_LABEL,
  getPaymentDetail,
  signReceipts,
  type PaymentDetail,
} from "../lib/payments-api";
import { formatAmount } from "../lib/format";
import { PaymentDecisionButtons } from "./PaymentDecisionButtons";
import { PaymentStatusPill } from "./PaymentStatusPill";

/* One payment in full: the receipts, the student's whole profile (account,
   profile, enrollment form, other courses and payments) and the decision. */
export function PaymentProfileDialog({
  paymentId,
  onOpenChange,
  onChanged,
}: {
  paymentId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { t, ar, lang } = useT();
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [receipts, setReceipts] = useState<{ path: string; url: string }[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setFailed(false);
    try {
      const d = await getPaymentDetail(paymentId);
      setDetail(d);
      setReceipts(await signReceipts(d.payment.receipt_paths ?? []).catch(() => []));
    } catch {
      setFailed(true);
    }
  }, [paymentId]);

  useEffect(() => {
    setDetail(null);
    setReceipts([]);
    void load();
  }, [load]);

  const p = detail?.payment;
  const answers = detail?.answers ?? [];
  const answer = (id: string) => {
    const v = answers.find((a) => a.field_id === id)?.value;
    if (v === null || v === undefined || v === "") return null;
    if (Array.isArray(v)) return v.join("، ");
    if (typeof v === "boolean") return v ? t("نعم", "Yes") : t("لا", "No");
    return String(v);
  };
  const name =
    answer(BASE_FIELD_IDS.fullName) ||
    detail?.profile?.full_name ||
    detail?.account?.meta_full_name ||
    detail?.account?.email ||
    t("طالب", "Student");
  const courseTitle = detail?.course
    ? ar
      ? detail.course.title_ar
      : detail.course.title_en || detail.course.title_ar
    : "";

  return (
    <Dialog open={!!paymentId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail ? name : t("ملف الطالب", "Student profile")}</DialogTitle>
          <DialogDescription>
            {detail
              ? courseTitle
              : t("الدفعة والإيصالات والملف الشخصي", "Payment, receipts and profile")}
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <ErrorNote onRetry={load} />
        ) : !detail || !p ? (
          <Loading />
        ) : (
          <div className="space-y-5 text-[14px]">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusPill status={p.status} />
              <Pill tone="teal">
                {ar
                  ? (PAYMENT_METHOD_LABEL[p.method]?.ar ?? p.method)
                  : (PAYMENT_METHOD_LABEL[p.method]?.en ?? p.method)}
              </Pill>
              <strong dir="ltr" className="text-[16px]">
                {formatAmount(p.amount, p.currency, ar)}
              </strong>
              <span className="text-[12.5px] text-[var(--cx-muted)]">
                {t("أُرسلت في", "Sent")} {fmtDate(p.created_at, lang, true)}
              </span>
            </div>
            {p.reviewer_notes && (
              <p className="rounded-lg bg-[var(--cx-raise-2)] px-3 py-2 text-[13.5px]">
                <span className="text-[12px] font-bold text-[var(--cx-muted)]">
                  {t("ملاحظة المراجعة: ", "Review note: ")}
                </span>
                {p.reviewer_notes}
              </p>
            )}

            <Section title={t("إيصالات التحويل", "Transfer receipts")}>
              {receipts.length === 0 ? (
                <p className="text-[var(--cx-muted)]">
                  {t("تعذّر عرض الإيصالات.", "The receipts could not be shown.")}
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {receipts.map((r, i) => (
                    <li key={r.path}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-xl border border-[var(--cx-line)] bg-[var(--cx-field)]"
                      >
                        {/\.pdf$/i.test(r.path) ? (
                          <span className="flex aspect-[3/4] flex-col items-center justify-center gap-2 text-[var(--cx-muted)]">
                            <FileText className="h-8 w-8" />
                            PDF
                          </span>
                        ) : (
                          <img
                            src={r.url}
                            alt={t(`الإيصال ${i + 1}`, `Receipt ${i + 1}`)}
                            className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-[1.02]"
                          />
                        )}
                        <span className="flex items-center justify-center gap-1.5 py-1.5 text-[12.5px] font-bold text-[var(--cx-teal)]">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("فتح بالحجم الكامل", "Open full size")}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t("بيانات الحساب", "Account")}>
              <Facts
                rows={[
                  [t("الاسم الكامل", "Full name"), name],
                  [t("البريد الإلكتروني", "Email"), detail.account?.email, true],
                  [
                    t("رقم الهاتف", "Phone"),
                    answer(BASE_FIELD_IDS.phone) ||
                      detail.profile?.phone ||
                      detail.account?.meta_phone,
                    true,
                  ],
                  [t("الجهة / المؤسسة", "Organization"), detail.profile?.organization],
                  [t("نبذة", "Bio"), detail.profile?.biography],
                  [
                    t("تاريخ إنشاء الحساب", "Account created"),
                    fmtDate(detail.account?.created_at, lang),
                  ],
                  [
                    t("آخر تسجيل دخول", "Last sign-in"),
                    fmtDate(detail.account?.last_sign_in_at, lang, true),
                  ],
                  [
                    t("تأكيد البريد", "Email confirmed"),
                    detail.account?.email_confirmed_at ? t("نعم", "Yes") : t("لا", "No"),
                  ],
                ]}
              />
            </Section>

            {detail.fields.length > 0 && (
              <Section title={t("إجابات نموذج التسجيل", "Enrollment form answers")}>
                <Facts
                  rows={detail.fields.map((f) => [
                    ar ? f.label_ar : f.label_en || f.label_ar,
                    answer(f.id),
                  ])}
                />
              </Section>
            )}
            {detail.request?.notes && (
              <Section title={t("ملاحظة الطالب", "Student note")}>
                <p>{detail.request.notes}</p>
              </Section>
            )}

            <Section title={t("الدورات المسجّل فيها", "Enrolled courses")}>
              {detail.enrollments.length === 0 ? (
                <p className="text-[var(--cx-muted)]">{t("لا توجد دورات.", "No courses.")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.enrollments.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {ar ? e.course_title_ar : e.course_title_en || e.course_title_ar}
                      </span>
                      <span className="text-[12.5px] text-[var(--cx-muted)]">
                        {fmtDate(e.enrolled_at, lang)} · {Math.round(Number(e.progress ?? 0))}%
                      </span>
                      {e.suspended_at && <Pill tone="red">{t("موقوفة", "Stopped")}</Pill>}
                      {e.completed_at && <Pill tone="green">{t("مكتملة", "Completed")}</Pill>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {detail.payments.length > 0 && (
              <Section title={t("دفعات أخرى", "Other payments")}>
                <ul className="space-y-1.5">
                  {detail.payments.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {ar ? o.course_title_ar : o.course_title_en || o.course_title_ar}
                      </span>
                      <span dir="ltr">{formatAmount(o.amount, o.currency, ar)}</span>
                      <PaymentStatusPill status={o.status} />
                      <span className="text-[12.5px] text-[var(--cx-muted)]">
                        {fmtDate(o.created_at, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap justify-end gap-2 border-t border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-6 py-3">
              <PaymentDecisionButtons
                payment={p}
                onDone={() => {
                  onChanged();
                  void load();
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-[var(--cx-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string | null | undefined, boolean?][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value, ltr]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[12px] text-[var(--cx-muted)]">{label}</dt>
          <dd className="break-words font-semibold" dir={ltr ? "ltr" : undefined}>
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
