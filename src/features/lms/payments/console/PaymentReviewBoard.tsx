import { useCallback, useEffect, useMemo, useState } from "react";
import { Receipt, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  useT,
} from "@/components/console/ui";
import {
  PAYMENT_METHOD_LABEL,
  listPaymentsForReview,
  type PaymentRow,
  type PaymentStatus,
} from "../lib/payments-api";
import { formatAmount } from "../lib/format";
import { PaymentDecisionButtons } from "./PaymentDecisionButtons";
import { PaymentProfileDialog } from "./PaymentProfileDialog";
import { PaymentStatusPill } from "./PaymentStatusPill";

type Filter = PaymentStatus | "all";

/* The payment reviewer's queue: every paid enrollment with its receipts.
   A course opens only after a reviewer confirms the money arrived. */
export function PaymentReviewBoard() {
  const { t, ar, lang } = useT();
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setRows(await listPaymentsForReview());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, suspended: 0, all: 0 };
    for (const r of rows ?? []) {
      c[r.status]++;
      c.all++;
    }
    return c;
  }, [rows]);

  const needle = q.trim().toLowerCase();
  const shown = (rows ?? []).filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!needle ||
        [r.full_name, r.email, r.phone, r.course_title_ar, r.course_title_en].some((v) =>
          (v ?? "").toLowerCase().includes(needle),
        )),
  );

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("مراجعة المدفوعات", "Payment review")}
        description={t(
          "تحقّق من وصول كل مبلغ إلى حساب الجمعية، أو من استلامه نقداً، قبل الموافقة؛ لا تُفتح الدورة للطالب إلا بعد موافقتك.",
          "Check that each amount reached the association's account, or was paid in cash, before approving; the course opens only after your approval.",
        )}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            {
              value: "pending",
              label: t("بانتظار التحقق", "Awaiting check"),
              count: counts.pending,
            },
            { value: "approved", label: t("مقبولة", "Approved"), count: counts.approved },
            { value: "suspended", label: t("موقوفة", "Stopped"), count: counts.suspended },
            { value: "rejected", label: t("مرفوضة", "Rejected"), count: counts.rejected },
            { value: "all", label: t("الكل", "All"), count: counts.all },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو البريد أو الدورة", "Search name, email or course")}
        />
      </div>

      {failed ? (
        <ErrorNote onRetry={load} />
      ) : rows === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="cx-card">
          <EmptyState
            icon={Receipt}
            title={
              filter === "pending"
                ? t("لا توجد دفعات بانتظار التحقق", "No payments waiting")
                : t("لا توجد دفعات", "No payments")
            }
          />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((r) => {
            const name = r.full_name || r.email || t("طالب", "Student");
            return (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--cx-line)] bg-[var(--cx-field)] p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setViewing(r.id)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[15px] font-extrabold text-[var(--cx-teal)]"
                    aria-label={t("فتح ملف الطالب", "Open student profile")}
                  >
                    {name.slice(0, 1)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(r.id)}
                        className="text-[15px] font-bold hover:text-[var(--cx-teal)] hover:underline"
                      >
                        {name}
                      </button>
                      <PaymentStatusPill status={r.status} />
                      <Pill tone="teal">
                        {ar
                          ? (PAYMENT_METHOD_LABEL[r.method]?.ar ?? r.method)
                          : (PAYMENT_METHOD_LABEL[r.method]?.en ?? r.method)}
                      </Pill>
                    </div>
                    <div className="mt-0.5 text-[13.5px]">
                      {ar ? r.course_title_ar : r.course_title_en || r.course_title_ar}
                      {" · "}
                      <strong dir="ltr" className="whitespace-nowrap">
                        {formatAmount(r.amount, r.currency, ar)}
                      </strong>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-[var(--cx-muted)]">
                      {r.email && (
                        <span dir="ltr" className="me-2">
                          {r.email}
                        </span>
                      )}
                      {r.phone && (
                        <span dir="ltr" className="me-2">
                          {r.phone}
                        </span>
                      )}
                      {t("أُرسلت في", "Sent")} {fmtDate(r.created_at, lang, true)}
                      {r.method !== "cash" && (
                        <>
                          {" · "}
                          {t(`${r.receipt_count} إيصال`, `${r.receipt_count} receipt(s)`)}
                        </>
                      )}
                    </div>
                    {r.reviewer_notes && (
                      <p className="mt-2 rounded-lg bg-[var(--cx-raise-2)] px-3 py-1.5 text-[13px]">
                        {r.reviewer_notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--cx-line-2)] pt-3">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(r.id)}>
                    <UserRound className="h-4 w-4" />
                    {t("الملف الشخصي والإيصالات", "Profile & receipts")}
                  </Button>
                  <span className="ms-auto flex flex-wrap gap-2">
                    <PaymentDecisionButtons payment={r} onDone={load} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PaymentProfileDialog
        paymentId={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onChanged={load}
      />
    </div>
  );
}
