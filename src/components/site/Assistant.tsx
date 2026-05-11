import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, MessageCircle, Sparkles, Users } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { AssistantChatModal } from "./AssistantChatModal";

export function Assistant() {
  const { t, dir } = useLang();
  const a = t.assistant;
  const [open, setOpen] = useState(false);

  const features = [
    { icon: MessageCircle, ...a.features.inquiries },
    { icon: Users, ...a.features.lead },
    { icon: Sparkles, ...a.features.suggestions },
  ];

  return (
    <section id="assistant" className="relative overflow-hidden py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 60%), radial-gradient(50% 40% at 90% 90%, color-mix(in oklab, var(--secondary) 16%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-display-2 text-foreground">{a.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {a.subtitle}
            </p>

            <ul className="mt-8 space-y-4">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] hover:opacity-95"
              >
                {a.cta}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group relative block w-full rounded-3xl border border-border bg-card/80 p-6 text-start shadow-soft backdrop-blur transition-transform hover:scale-[1.01]"
              aria-label={a.cta}
            >
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{a.chat.name}</p>
                  <p className="text-xs text-muted-foreground">{a.chat.status}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className={dir === "rtl" ? "flex justify-end" : "flex justify-start"}>
                  <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5 text-foreground">
                    {a.chat.user}
                  </p>
                </div>
                <div className={dir === "rtl" ? "flex justify-start" : "flex justify-end"}>
                  <p className="max-w-[80%] rounded-2xl rounded-tl-sm bg-primary px-4 py-2.5 text-primary-foreground">
                    {a.chat.bot}
                  </p>
                </div>
                <div className={dir === "rtl" ? "flex justify-end" : "flex justify-start"}>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    {a.chat.typing}
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      <AssistantChatModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
