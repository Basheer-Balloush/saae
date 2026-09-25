import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { AssistantChatModal } from "./AssistantChatModal";
import "./assistant-fab.css";

/** hideTrigger keeps the chat event available while hiding the global launcher. */
export function AssistantFab({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const { t, dir } = useLang();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const isRtl = dir === "rtl";

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      if (typeof detail.prefill === "string") setPrefill(detail.prefill);
      setOpen(true);
    };
    window.addEventListener("assistant:open", handler);
    return () => window.removeEventListener("assistant:open", handler);
  }, []);

  useEffect(() => {
    let observedFooters: HTMLElement[] = [];
    const visibleFooters = new Set<HTMLElement>();
    let footerObserver: IntersectionObserver | null = null;

    const observeCurrentFooters = () => {
      const nextFooters = Array.from(
        document.querySelectorAll<HTMLElement>("#site-footer, footer.site-footer"),
      );
      const unchanged =
        nextFooters.length === observedFooters.length &&
        nextFooters.every((footer, index) => footer === observedFooters[index]);
      if (unchanged) return;

      footerObserver?.disconnect();
      observedFooters = nextFooters;
      visibleFooters.clear();

      if (nextFooters.length === 0) {
        setFooterVisible(false);
        return;
      }

      footerObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const footer = entry.target as HTMLElement;
            if (entry.isIntersecting) visibleFooters.add(footer);
            else visibleFooters.delete(footer);
          }
          setFooterVisible(visibleFooters.size > 0);
        },
        { threshold: 0 },
      );
      nextFooters.forEach((footer) => footerObserver?.observe(footer));
    };

    observeCurrentFooters();
    const pageObserver = new MutationObserver(observeCurrentFooters);
    pageObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      pageObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {!hideTrigger && !footerVisible && !open && (
          <motion.button
            type="button"
            className={`assistant-guide-launcher ${isRtl ? "is-rtl" : "is-ltr"}`}
            dir={dir}
            onClick={() => setOpen(true)}
            aria-label={t.assistant.cta}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="assistant-guide-character" aria-hidden="true">
              <img src="/cinematic/images/abu-al-joud-comic-welcome.webp" alt="" />
            </span>
            <span className="assistant-guide-bubble">
              <MessageCircle aria-hidden="true" />
              <span>
                {isRtl ? "إذا كان لديك أي سؤال، اسألني" : "If you have any question, ask me"}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AssistantChatModal
        open={open}
        onClose={() => {
          setOpen(false);
          setPrefill(null);
        }}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill(null)}
      />
    </>
  );
}
