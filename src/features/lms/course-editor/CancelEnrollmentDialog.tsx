import { toast } from "sonner";
import { ReasonDialog, useT } from "@/components/console/ui";
import { cancelEnrollment } from "@/features/lms/lib/coupons-db";
import { toUserMessage } from "@/lib/safe-error";

const REFUSALS = {
  enrollment_has_payments: {
    ar: "لهذا الطالب دفعات مسجّلة. ألغِ قيود الدفع أولاً من نافذة الدفعات، ثم ألغِ التسجيل.",
    en: "This student has payments on record. Cancel those entries in their payments window first, then cancel the registration.",
  },
  enrollment_has_certificate: {
    ar: "حصل هذا الطالب على شهادة الدورة، لذلك لا يمكن إلغاء تسجيله.",
    en: "This student has the course certificate, so their registration cannot be cancelled.",
  },
  enrollment_not_found: {
    ar: "لم يعد هذا التسجيل موجوداً.",
    en: "This registration no longer exists.",
  },
} as const;

/** Admins: asks for a reason, then takes the learner out of the course. */
export function CancelEnrollmentDialog({
  enrollmentId,
  name,
  open,
  onOpenChange,
  onCancelled,
}: {
  enrollmentId: string;
  name: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCancelled: () => void | Promise<void>;
}) {
  const { t, ar } = useT();
  // Isolated, so an Arabic name in English (or the reverse) keeps its order.
  const who = `⁨${name}⁩`;
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(`إلغاء تسجيل ${who}؟`, `Cancel the registration of ${who}?`)}
      description={t(
        "يخرج الطالب من الدورة ويُلغى طلبه، ويرى هذا السبب في صفحة طلباته. يُحذف حضوره وتقييمه لهذه الدورة، ويُحرَّر أي كود استخدمه. يبقى تقدّمه في الدروس محفوظاً إن سجّل من جديد.",
        "The student leaves the course and their request is cancelled; they see this reason in their requests. Their attendance and feedback for this course are removed and any code they used is freed. Their lesson progress is kept if they register again.",
      )}
      confirmLabel={t("إلغاء التسجيل", "Cancel registration")}
      required
      destructive
      onConfirm={async (reason) => {
        try {
          await cancelEnrollment(enrollmentId, reason);
          toast.success(t("أُلغي التسجيل", "Registration cancelled"));
          await onCancelled();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          const code = (Object.keys(REFUSALS) as (keyof typeof REFUSALS)[]).find((k) =>
            msg.includes(k),
          );
          toast.error(code ? (ar ? REFUSALS[code].ar : REFUSALS[code].en) : toUserMessage(e));
        }
      }}
    />
  );
}
