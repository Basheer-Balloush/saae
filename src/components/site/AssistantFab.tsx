import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { AssistantChatModal } from "./AssistantChatModal";

export function AssistantFab() {
  const { t, dir } = useLang();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
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

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.assistant.cta}
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`fixed bottom-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-shadow hover:shadow-xl ${
          isRtl ? "left-6" : "right-6"
        }`}
        style={{
          boxShadow:
            "0 10px 30px -10px rgba(4, 128, 144, 0.55), 0 4px 10px -4px rgba(4, 128, 144, 0.35)",
        }}
      >
        {/* Pulse ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, rgba(4,128,144,0.45), transparent 70%)",
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

      <AssistantChatModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
