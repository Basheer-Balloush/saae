import { Pill, useT } from "@/components/console/ui";
import type { PaymentStatus } from "../lib/payments-api";

const STATUS: Record<
  PaymentStatus,
  { tone: "orange" | "green" | "red" | "gray"; ar: string; en: string }
> = {
  pending: { tone: "orange", ar: "بانتظار التحقق", en: "Awaiting check" },
  approved: { tone: "green", ar: "مقبولة", en: "Approved" },
  rejected: { tone: "red", ar: "مرفوضة", en: "Rejected" },
  suspended: { tone: "gray", ar: "الدورة موقوفة", en: "Course stopped" },
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const { ar } = useT();
  const s = STATUS[status] ?? { tone: "gray" as const, ar: status, en: status };
  return <Pill tone={s.tone}>{ar ? s.ar : s.en}</Pill>;
}
