import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  Receipt,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNote, Loading, Pill, Tabs, fmtDate, useT } from "@/components/console/ui";
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
import "./payment-profile-dialog.css";

type Tab = "payment" | "student" | "form" | "history";

/* One payment in full, for the payment reviewer: a summary on top, then one
   tab each for the payment and its receipts, the student's account, their
   enrollment form and their other courses and payments; the decision stays
   at the bottom. No <section> or <h3> here: the LMS skin pads every section
   and restyles headings, which opened large gaps in this panel. */
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
  const [tab, setTab] = useState<Tab>("payment");

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
    setTab("payment");
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
  const cash = p?.method === "cash";
  const methodLabel = p
    ? ar
      ? (PAYMENT_METHOD_LABEL[p.method]?.ar ?? p.method)
      : (PAYMENT_METHOD_LABEL[p.method]?.en ?? p.method)
    : "";

  return (
    <Dialog open={!!paymentId} onOpenChange={onOpenChange}>
      <DialogContent className="pay-profile-dialog flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b border-[var(--cx-line-2)] px-6 pb-4 pt-6">
          <DialogHeader className="pe-10 text-start sm:text-start">
            <DialogTitle className="text-[22px] font-extrabold">
              {detail ? name : t("ملف الطالب", "Student profile")}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? courseTitle
                : t("الدفعة والإيصالات والملف الشخصي", "Payment, receipts and profile")}
            </DialogDescription>
          </DialogHeader>

          {p && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label={t("المبلغ", "Amount")}>
                  <span dir="ltr" className="text-[17px] font-extrabold text-[var(--cx-teal)]">
                    {formatAmount(p.amount, p.currency, ar)}
                  </span>
                </Stat>
                <Stat label={t("طريقة الدفع", "Method")}>
                  <Pill tone="teal">{methodLabel}</Pill>
                </Stat>
                <Stat label={t("الحالة", "Status")}>
                  <PaymentStatusPill status={p.status} />
                </Stat>
                <Stat label={t("أُرسلت في", "Sent")}>
                  <span className="text-[13px] font-bold">{fmtDate(p.created_at, lang, true)}</span>
                </Stat>
              </div>
              <div className="pay-profile-tabs mt-4">
                <Tabs<Tab>
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    {
                      value: "payment",
                      label: t("الدفعة", "Payment"),
                      icon: Receipt,
                      count: cash ? undefined : receipts.length,
                    },
                    { value: "student", label: t("الطالب", "Student"), icon: UserRound },
                    {
                      value: "form",
                      label: t("النموذج", "Form"),
                      icon: ClipboardList,
                    },
                    {
                      value: "history",
                      label: t("السجل", "History"),
                      icon: History,
                      count: detail
                        ? detail.enrollments.length + detail.payments.length
                        : undefined,
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-[14px]">
          {failed ? (
            <ErrorNote onRetry={load} />
          ) : !detail || !p ? (
            <Loading />
          ) : tab === "payment" ? (
            <div className="space-y-5">
              {p.reviewer_notes && (
                <Note label={t("ملاحظة المراجعة", "Review note")}>{p.reviewer_notes}</Note>
              )}

              {cash ? (
                <div className="flex items-start gap-3 rounded-xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--cx-green-50)] text-[var(--cx-green)]">
                    <Banknote className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-bold">
                      {t("دفع نقدي لدى الجمعية", "Cash at the association")}
                    </div>
                    <div className="mt-0.5 text-[13px] text-[var(--cx-muted)]">
                      {t(
                        "لا يوجد إيصال تحويل. وافق بعد أن تستلم المبلغ كاملاً من الطالب.",
                        "There is no transfer receipt. Approve once you receive the full amount from the student.",
                      )}
                    </div>
                  </div>
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-[var(--cx-muted)]">
                  {t("تعذّر عرض الإيصالات.", "The receipts could not be shown.")}
                </p>
              ) : (
                <div>
                  <BlockTitle>{t("إيصالات التحويل", "Transfer receipts")}</BlockTitle>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {receipts.map((r, i) => (
                      <li key={r.path}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group block overflow-hidden rounded-xl border border-[var(--cx-line)] bg-[var(--cx-field)] transition-colors hover:border-[var(--cx-teal-100)]"
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
                              className="aspect-[3/4] w-full bg-white/5 object-contain p-2 transition-transform group-hover:scale-[1.02]"
                            />
                          )}
                          <span className="flex items-center justify-center gap-1.5 border-t border-[var(--cx-line-2)] py-2 text-[12.5px] font-bold text-[var(--cx-teal)]">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t("فتح بالحجم الكامل", "Open full size")}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <BlockTitle>{t("مسار المراجعة", "Review trail")}</BlockTitle>
                <Rows
                  rows={[
                    [t("أُرسلت في", "Sent"), fmtDate(p.created_at, lang, true)],
                    [
                      cash
                        ? t("تأكيد استلام المبلغ", "Cash received")
                        : t("تأكيد وصول المبلغ", "Amount confirmed"),
                      p.amount_confirmed_at ? fmtDate(p.amount_confirmed_at, lang, true) : null,
                    ],
                    [
                      t("تاريخ القرار", "Decided"),
                      p.reviewed_at ? fmtDate(p.reviewed_at, lang, true) : null,
                    ],
                    [
                      t("إيقاف الدورة", "Course stopped"),
                      p.suspended_at ? fmtDate(p.suspended_at, lang, true) : null,
                    ],
                  ]}
                />
              </div>
            </div>
          ) : tab === "student" ? (
            <Rows
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
          ) : tab === "form" ? (
            <div className="space-y-5">
              <Rows
                rows={[
                  [t("الاسم الكامل", "Full name"), answer(BASE_FIELD_IDS.fullName)],
                  [t("رقم الهاتف", "Phone"), answer(BASE_FIELD_IDS.phone), true],
                  [t("البريد الإلكتروني", "Email"), answer(BASE_FIELD_IDS.email), true],
                  ...detail.fields.map(
                    (f) =>
                      [ar ? f.label_ar : f.label_en || f.label_ar, answer(f.id)] as [
                        string,
                        string | null,
                      ],
                  ),
                ]}
              />
              {detail.request?.notes && (
                <Note label={t("ملاحظة الطالب", "Student note")}>{detail.request.notes}</Note>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <BlockTitle>{t("الدورات المسجّل فيها", "Enrolled courses")}</BlockTitle>
                {detail.enrollments.length === 0 ? (
                  <Empty>{t("لا توجد دورات.", "No courses.")}</Empty>
                ) : (
                  <ul className="space-y-2">
                    {detail.enrollments.map((e, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 font-bold">
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
              </div>
              <div>
                <BlockTitle>{t("دفعات أخرى", "Other payments")}</BlockTitle>
                {detail.payments.length === 0 ? (
                  <Empty>{t("لا توجد دفعات أخرى.", "No other payments.")}</Empty>
                ) : (
                  <ul className="space-y-2">
                    {detail.payments.map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 font-bold">
                          {ar ? o.course_title_ar : o.course_title_en || o.course_title_ar}
                        </span>
                        <span dir="ltr" className="font-bold">
                          {formatAmount(o.amount, o.currency, ar)}
                        </span>
                        <PaymentStatusPill status={o.status} />
                        <span className="text-[12.5px] text-[var(--cx-muted)]">
                          {fmtDate(o.created_at, lang)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {p && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-6 py-3">
            <PaymentDecisionButtons
              payment={p}
              onDone={() => {
                onChanged();
                void load();
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-3 py-2.5">
      <span className="text-[11.5px] font-bold text-[var(--cx-muted)]">{label}</span>
      {children}
    </div>
  );
}

function BlockTitle({ children }: { children: ReactNode }) {
  return <div className="mb-2.5 text-[13px] font-extrabold text-[var(--cx-muted)]">{children}</div>;
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-raise-2)] px-4 py-3 text-[13.5px]">
      <div className="mb-1 text-[12px] font-bold text-[var(--cx-muted)]">{label}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] text-[var(--cx-muted)]">{children}</p>;
}

/* Label at the start, value at the end of each line. A left-to-right value
   (email, phone) is isolated with dir="ltr" on its own span, so it reads
   correctly without being pushed to the wrong side of an Arabic row. */
function Rows({ rows }: { rows: [string, string | null | undefined, boolean?][] }) {
  return (
    <dl className="divide-y divide-[var(--cx-line-2)] overflow-hidden rounded-xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)]">
      {rows.map(([label, value, ltr], i) => (
        <div
          key={`${label}-${i}`}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5"
        >
          <dt className="text-[13px] text-[var(--cx-muted)]">{label}</dt>
          <dd className="min-w-0 break-words text-end font-semibold">
            {value ? (
              <span dir={ltr ? "ltr" : undefined}>{value}</span>
            ) : (
              <span className="text-[var(--cx-faint)]">—</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
