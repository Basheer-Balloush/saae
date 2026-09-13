import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/initiative.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { WaitlistDialog } from "@/components/initiative/WaitlistDialog";
import { DirectPaymentDialog } from "@/components/initiative/DirectPaymentDialog";
import { CorporateDonationDialog } from "@/components/initiative/CorporateDonationDialog";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/initiative.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

const HTML_ATTRS = {
  "data-title-en": "SAAE | One Million Syrian AI Users",
  "data-title-ar": "الجمعية | مبادرة مليون مستخدم ذكاء اصطناعي سوري",
};

type Action = "pay" | "waitlist" | "donate";
const ACTIONS: readonly string[] = ["pay", "waitlist", "donate"];

export const Route = createFileRoute("/initiative/")({
  head: () => ({
    meta: [
      { title: "SAAE | One Million Syrian AI Users" },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/initiative.css" },
    ],
  }),
  component: Page,
});

function Page() {
  /* The page's pay, waitlist and sponsor buttons open the same forms as the
     original initiative page, so what people submit is saved. Their hrefs
     point at that page for new-tab clicks and before this script runs. */
  const [open, setOpen] = useState<Action | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("en");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const trigger = (event.target as Element | null)?.closest?.("[data-initiative-action]");
      const action = trigger?.getAttribute("data-initiative-action");
      if (!action || !ACTIONS.includes(action)) return;
      event.preventDefault();
      setLang(document.documentElement.lang === "ar" ? "ar" : "en");
      setOpen(action as Action);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const onOpenChange = (action: Action) => (next: boolean) => setOpen(next ? action : null);

  return (
    <>
      <CinematicPage html={pageHtml} scripts={SCRIPTS} htmlAttrs={HTML_ATTRS} />
      <DirectPaymentDialog open={open === "pay"} onOpenChange={onOpenChange("pay")} lang={lang} />
      <WaitlistDialog open={open === "waitlist"} onOpenChange={onOpenChange("waitlist")} lang={lang} />
      <CorporateDonationDialog open={open === "donate"} onOpenChange={onOpenChange("donate")} lang={lang} />
    </>
  );
}
