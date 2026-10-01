import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n/i18n";
import { lmsT } from "@/features/lms/lib/i18n";
import { currentLmsReturn } from "@/features/lms/lib/redirect";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { EmptyState } from "@/components/console/ui";
import { isPaymentReviewer } from "@/features/lms/payments/lib/payments-api";
import { PaymentReviewBoard } from "@/features/lms/payments/console/PaymentReviewBoard";

/* Payment review: its own role (lms_payment_admin) or the super admin, so
   the person who checks the association's account need not be an LMS admin. */
export const Route = createFileRoute("/learning-management-system/payments")({
  head: () => ({
    meta: [{ title: "Payment review" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/learning-management-system/login",
        search: { redirect: currentLmsReturn() },
      });
      return;
    }
    let cancelled = false;
    setAllowed(null);
    isPaymentReviewer(user.id).then(
      (ok) => !cancelled && setAllowed(ok),
      () => !cancelled && setAllowed(false),
    );
    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate]);

  if (loading || !user || allowed === null) {
    return (
      <p
        className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {lmsT[lang].loading}
      </p>
    );
  }

  return (
    <ConsoleShell>
      {allowed ? (
        <PaymentReviewBoard />
      ) : (
        <div className="cx-card">
          <EmptyState
            icon={ShieldAlert}
            title={ar ? "لا تملك صلاحية مراجعة المدفوعات" : "You cannot review payments"}
            text={
              ar
                ? "هذه الصفحة لمراجع المدفوعات فقط. اطلب من المدير العام منحك دور «مراجع المدفوعات»."
                : "This page is for payment reviewers. Ask the super admin to give you the “Payment reviewer” role."
            }
          />
        </div>
      )}
    </ConsoleShell>
  );
}
