import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAmount } from "./lib/format";

/* Cash step: the amount, what happens next and "Confirm". The request goes
   to the payment reviewers, who open the course once the cash is handed over. */
export function CashPayment({
  ar,
  amount,
  busy,
  onConfirm,
  onBack,
}: {
  ar: boolean;
  amount: number;
  busy: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-input bg-background/40 p-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-emerald-600/15 text-emerald-500">
          <Banknote className="h-8 w-8" />
        </span>
        <div className="text-sm">
          {ar ? "المبلغ المطلوب: " : "Amount due: "}
          <strong dir="ltr" className="lms-pay-amount whitespace-nowrap text-base">
            {formatAmount(amount, "SYP", ar)}
          </strong>
        </div>
      </div>

      <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
        <li>
          {ar
            ? "أكّد طلبك، فيصل إلى محاسب الجمعية."
            : "Confirm your request; it goes to the association's accountant."}
        </li>
        <li>
          {ar
            ? "ادفع المبلغ كاملاً نقداً لدى الجمعية."
            : "Pay the full amount in cash at the association."}
        </li>
        <li>
          {ar
            ? "تُفتح الدورة لك بعد أن يؤكّد المحاسب استلام المبلغ."
            : "The course opens once the accountant confirms the payment."}
        </li>
      </ol>

      <div className="flex gap-2 border-t border-border pt-3">
        <Button className="flex-1" onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="mx-1 h-4 w-4 animate-spin" />}
          {ar ? "تأكيد الدفع نقداً" : "Confirm cash payment"}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={busy}>
          {ar ? "رجوع" : "Back"}
        </Button>
      </div>
    </div>
  );
}
