import { Banknote, ChevronLeft, ChevronRight } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethodId } from "./config";

const HINTS: Record<PaymentMethodId, { ar: string; en: string }> = {
  cash: {
    ar: "عبّئ بياناتك وادفع نقداً لدى الجمعية",
    en: "Fill in your details and pay in cash at the association",
  },
  sham_cash: {
    ar: "حوّل المبلغ عبر تطبيق شام كاش وأرفق الإيصال",
    en: "Transfer with the Sham Cash app and attach the receipt",
  },
};

/* The first step of a paid enrollment: how the student will pay. */
export function PaymentMethodPicker({
  ar,
  onPick,
}: {
  ar: boolean;
  onPick: (method: PaymentMethodId) => void;
}) {
  const Chevron = ar ? ChevronLeft : ChevronRight;
  return (
    <div className="space-y-2.5" role="list">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="listitem"
          disabled={!m.available}
          onClick={() => onPick(m.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-input bg-background/40 p-3 text-start transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-input disabled:hover:bg-background/40"
        >
          {m.logo ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/[0.06]">
              <img src={m.logo} alt="" className="h-8 w-8 object-contain" />
            </span>
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-600/15 text-emerald-500">
              <Banknote className="h-6 w-6" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{ar ? m.ar : m.en}</span>
            <span className="block text-xs text-muted-foreground">
              {ar ? HINTS[m.id].ar : HINTS[m.id].en}
            </span>
          </span>
          {m.available ? (
            <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {ar ? "قريباً" : "Soon"}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
