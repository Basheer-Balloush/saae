import { formatSP, paymentSummary, type PaymentEntry } from "@/lib/coupons";

/** What an enrolled learner owes for a course and has paid so far. Shows
    nothing when nothing is owed or nothing was recorded. */
export function EnrollmentBalance({
  amountDue,
  entries,
  ar,
}: {
  amountDue: number | null;
  entries: Pick<PaymentEntry, "id" | "kind" | "amount" | "corrects_id">[];
  ar: boolean;
}) {
  const s = paymentSummary(amountDue, entries);
  if (s.state === "untracked" || s.state === "free") return null;
  const rows = [
    { label: ar ? "المطلوب" : "Owed", value: formatSP(s.due, ar) },
    { label: ar ? "المدفوع" : "Paid", value: formatSP(s.paid, ar) },
    ...(s.waived > 0 ? [{ label: ar ? "إعفاء" : "Waived", value: formatSP(s.waived, ar) }] : []),
    { label: ar ? "المتبقي" : "Remaining", value: formatSP(s.remaining, ar) },
  ];
  return (
    <div className="enroll-balance" aria-label={ar ? "الدفع" : "Payment"}>
      <dl>
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div
        className="enroll-balance-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={s.percent}
        aria-label={ar ? "نسبة المدفوع" : "Share paid"}
      >
        <i style={{ width: `${s.percent}%` }} />
      </div>
      <p>
        {s.remaining > 0
          ? ar
            ? `دفعت ${s.percent}٪. للدفع تواصل مع فريق المنصة.`
            : `${s.percent}% paid. Contact the platform team to pay the rest.`
          : ar
            ? "اكتمل الدفع."
            : "Fully paid."}
      </p>
    </div>
  );
}
