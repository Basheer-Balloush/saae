import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { AssistantChatModal } from "./AssistantChatModal";

const DISMISS_KEY = "saae-assistant-greeting-dismissed";

export function AssistantFab({ hideDesktopTrigger = false }: { hideDesktopTrigger?: boolean }) {
  const { t, dir } = useLang();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
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

  // Show greeting bubble shortly after mount (unless previously dismissed or chat open)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const show = window.setTimeout(() => setShowGreeting(true), 2500);
    const hide = window.setTimeout(() => setShowGreeting(false), 12000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (open) setShowGreeting(false);
  }, [open]);

  const dismissGreeting = () => {
    setShowGreeting(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // The greeting can still be dismissed when storage is unavailable.
    }
  };

  return (
    <>
      <div
        className={`fixed bottom-6 z-40 flex items-end gap-3 ${
          isRtl ? "right-6 flex-row-reverse" : "left-6 flex-row-reverse"
        } ${hideDesktopTrigger ? "min-[900px]:hidden" : ""}`}
      >
        <AnimatePresence>
          {showGreeting && !open && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`relative mb-1 max-w-[14rem] rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lift ${isRtl ? "ps-7" : "pe-7"}`}
              dir={dir}
            >
              <button
                type="button"
                onClick={dismissGreeting}
                aria-label="Dismiss"
                className={`absolute top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground ${
                  isRtl ? "left-1.5" : "right-1.5"
                }`}
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissGreeting();
                  setOpen(true);
                }}
                className="block w-full text-start leading-snug"
              >
                {t.assistant.greeting}
              </button>
              <span
                aria-hidden
                className={`absolute bottom-3 h-3 w-3 rotate-45 border-e border-t border-border bg-card ${
                  isRtl ? "-right-1.5" : "-left-1.5"
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            dismissGreeting();
            setOpen((v) => !v);
          }}
          aria-label={t.assistant.cta}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-shadow hover:shadow-xl"
          style={{
            boxShadow:
              "0 10px 30px -10px rgba(4, 128, 144, 0.55), 0 4px 10px -4px rgba(4, 128, 144, 0.35)",
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              background: "radial-gradient(closest-side, rgba(4,128,144,0.45), transparent 70%)",
              animation: "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="x"
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <X className="h-6 w-6" strokeWidth={2.25} />
              </motion.span>
            ) : (
              <motion.span
                key="bot"
                initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Bot className="h-6 w-6" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

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
