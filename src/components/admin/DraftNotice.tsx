import { History } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** Shown when a form was refilled from a draft saved on this device (useFormDraft). */
export function DraftNotice({ show, onDiscard }: { show: boolean; onDiscard: () => void }) {
  const { lang } = useLang();
  if (!show) return null;
  const ar = lang === "ar";
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
    >
      <span className="inline-flex items-center gap-2">
        <History className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        {ar
          ? "استُعيدت تغييرات غير محفوظة من هذا الجهاز. راجعها ثم احفظ."
          : "Unsaved changes from this device were restored. Review them, then save."}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
        {ar ? "تجاهل التغييرات" : "Discard changes"}
      </Button>
    </div>
  );
}
