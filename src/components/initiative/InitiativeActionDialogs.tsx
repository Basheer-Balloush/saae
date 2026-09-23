import { useEffect, useState } from "react";
import { WaitlistDialog } from "@/components/initiative/WaitlistDialog";
import { DirectPaymentDialog } from "@/components/initiative/DirectPaymentDialog";
import { CorporateDonationDialog } from "@/components/initiative/CorporateDonationDialog";

type Action = "pay" | "waitlist" | "donate";
const ACTIONS: readonly string[] = ["pay", "waitlist", "donate"];

const isAction = (value: string | null | undefined): value is Action =>
  !!value && ACTIONS.includes(value);

const pageLang = (): "ar" | "en" => (document.documentElement.lang === "ar" ? "ar" : "en");

/**
 * The pay, waitlist and sponsor forms behind the initiative pages' buttons.
 *
 * Any element marked data-initiative-action="pay|waitlist|donate" opens its
 * form in place, so what people submit is saved. The same buttons carry an
 * href of /initiative?action=<name>, which is what a new-tab click or a click
 * before this has hydrated follows; landing on a page with that parameter
 * opens the form, then drops the parameter so a reload or a shared link does
 * not keep reopening it.
 */
export function InitiativeActionDialogs() {
  const [open, setOpen] = useState<Action | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("en");

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("action");
    if (isAction(requested)) {
      setLang(pageLang());
      setOpen(requested);
      url.searchParams.delete("action");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const trigger = (event.target as Element | null)?.closest?.("[data-initiative-action]");
      const action = trigger?.getAttribute("data-initiative-action");
      if (!isAction(action)) return;
      event.preventDefault();
      setLang(pageLang());
      setOpen(action);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const onOpenChange = (action: Action) => (next: boolean) => setOpen(next ? action : null);

  return (
    <>
      <DirectPaymentDialog open={open === "pay"} onOpenChange={onOpenChange("pay")} lang={lang} />
      <WaitlistDialog
        open={open === "waitlist"}
        onOpenChange={onOpenChange("waitlist")}
        lang={lang}
      />
      <CorporateDonationDialog
        open={open === "donate"}
        onOpenChange={onOpenChange("donate")}
        lang={lang}
      />
    </>
  );
}
