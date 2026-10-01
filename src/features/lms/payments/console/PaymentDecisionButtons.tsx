import { useState } from "react";
import { Ban, CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReasonDialog, useT } from "@/components/console/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { enrollmentErrorMessage } from "@/features/lms/lib/enrollment-errors";
import {
  approvePayment,
  reactivatePayment,
  rejectPayment,
  suspendPayment,
  type PaymentStatus,
} from "../lib/payments-api";
import { formatAmount } from "../lib/format";

/* What a payment reviewer can do with one payment, by its status:
   pending → approve (after confirming the money arrived) or reject;
   approved → stop the course; suspended → open it again. */
export function PaymentDecisionButtons({
  payment,
  onDone,
}: {
  payment: { id: string; status: PaymentStatus; amount: number; currency: string };
  onDone: () => void;
}) {
  const { t, ar } = useT();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onDone();
    } catch (e) {
      toast.error(enrollmentErrorMessage(e, ar));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    const ok = await confirm({
      title: t("تأكيد وصول المبلغ", "Confirm the payment arrived"),
      description: t(
        `هل تحقّقت من وصول مبلغ ${formatAmount(payment.amount, payment.currency, true)} كاملاً إلى حساب الجمعية؟ بعد التأكيد تُفتح الدورة للطالب مباشرةً.`,
        `Have you checked that the full ${formatAmount(payment.amount, payment.currency, false)} reached the association's account? Once you confirm, the course opens for the student.`,
      ),
      confirmLabel: t("نعم، تحقّقت من وصول المبلغ", "Yes, the amount arrived"),
      cancelLabel: t("ليس بعد", "Not yet"),
    });
    if (!ok) return;
    await run(
      () => approvePayment(payment.id),
      t("تمت الموافقة وفُتحت الدورة للطالب", "Approved; the course is open for the student"),
    );
  };

  const reactivate = async () => {
    const ok = await confirm({
      title: t("إعادة تفعيل الدورة", "Reopen the course"),
      description: t(
        "سيستعيد الطالب وصوله إلى الدورة وتقدّمه السابق.",
        "The student gets the course and their earlier progress back.",
      ),
      confirmLabel: t("إعادة التفعيل", "Reopen"),
    });
    if (!ok) return;
    await run(
      () => reactivatePayment(payment.id),
      t("أُعيد تفعيل الدورة للطالب", "The course is open again"),
    );
  };

  const spinner = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null;

  return (
    <>
      {payment.status === "pending" && (
        <>
          <Button size="sm" onClick={approve} disabled={busy}>
            {spinner ?? <CheckCircle2 className="h-4 w-4" />}
            {t("موافقة", "Approve")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}>
            <X className="h-4 w-4" />
            {t("رفض", "Reject")}
          </Button>
        </>
      )}
      {payment.status === "approved" && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setSuspendOpen(true)}
          disabled={busy}
        >
          {spinner ?? <Ban className="h-4 w-4" />}
          {t("إيقاف الدورة", "Stop course")}
        </Button>
      )}
      {payment.status === "suspended" && (
        <Button size="sm" variant="outline" onClick={reactivate} disabled={busy}>
          {spinner ?? <RotateCcw className="h-4 w-4" />}
          {t("إعادة تفعيل الدورة", "Reopen course")}
        </Button>
      )}

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("رفض الدفعة", "Reject payment")}
        description={t(
          "يرى الطالب سبب الرفض، ويمكنه الدفع وإرسال إيصال جديد.",
          "The student sees the reason and can pay and send a new receipt.",
        )}
        confirmLabel={t("رفض الدفعة", "Reject payment")}
        required
        destructive
        onConfirm={(reason) =>
          run(() => rejectPayment(payment.id, reason), t("تم رفض الدفعة", "Payment rejected"))
        }
      />
      <ReasonDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={t("إيقاف الدورة لهذا الطالب", "Stop the course for this student")}
        description={t(
          "يُغلق وصول الطالب إلى محتوى الدورة مع الاحتفاظ بتقدّمه، ويمكن إعادة تفعيلها لاحقاً.",
          "The student loses access to the course; their progress is kept and the course can be reopened later.",
        )}
        confirmLabel={t("إيقاف الدورة", "Stop course")}
        destructive
        onConfirm={(reason) =>
          run(() => suspendPayment(payment.id, reason), t("تم إيقاف الدورة", "Course stopped"))
        }
      />
    </>
  );
}
