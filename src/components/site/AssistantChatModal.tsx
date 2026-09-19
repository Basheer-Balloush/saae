import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Loader2 } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { loadChatSession, saveChatSession, type ChatSession } from "@/lib/chat-session";
import { useLang } from "@/lib/i18n";
import { AssistantFeedbackForm } from "@/components/site/AssistantFeedbackForm";

const SSR_SESSION: ChatSession = { id: "ssr", lastActivity: 0, messages: [] };

export function AssistantChatModal({
  open,
  onClose,
  prefill,
  onPrefillConsumed,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: string | null;
  onPrefillConsumed?: () => void;
}) {
  const { t, dir, lang } = useLang();
  const a = t.assistant;
  const isRtl = dir === "rtl";

  const [input, setInput] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // The conversation the visitor is in. It ends after CHAT_IDLE_MS without a
  // message, so each visit is its own conversation for the admin and for the model.
  const [session, setSession] = useState<ChatSession>(() =>
    typeof window === "undefined" ? SSR_SESSION : loadChatSession(),
  );
  const sessionId = session.id;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId, lang },
      }),
    [sessionId, lang],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: session.messages as UIMessage[],
  });

  // Opening the widget after a long pause starts a fresh conversation.
  useEffect(() => {
    if (!open) return;
    const current = loadChatSession();
    if (current.id === sessionId) return;
    setSession(current);
    setMessages(current.messages as UIMessage[]);
  }, [open, sessionId, setMessages]);

  // Keep this device's copy in step with what the server stores for the conversation.
  useEffect(() => {
    if (messages.length === 0) return;
    saveChatSession({ id: sessionId, lastActivity: Date.now(), messages });
  }, [messages, sessionId]);

  const isLoading = status === "submitted" || status === "streaming";

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus textarea on open + after streaming finishes
  useEffect(() => {
    if (open && status !== "streaming") {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [open, status]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-send prefill when opened with one
  useEffect(() => {
    if (open && prefill) {
      sendMessage({ text: prefill });
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="assistant-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          dir={dir}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{a.chat.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {a.chat.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-scroll flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">{a.subtitle}</p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    {[
                      isRtl ? "أنا فرد مهتم بالتدريب" : "I'm an individual interested in training",
                      isRtl
                        ? "أمثّل شركة وأبحث عن شراكة"
                        : "I represent a company looking to partner",
                      isRtl ? "أخبرني عن الجمعية" : "Tell me about the association",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage({ text: q })}
                        className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="rounded-full border border-primary bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      {isRtl ? "إرسال ملاحظة / رأي" : "Send feedback"}
                    </button>
                  </div>
                  {feedbackOpen && (
                    <div className="mt-6 w-full max-w-md">
                      <AssistantFeedbackForm
                        lang={lang === "ar" ? "ar" : "en"}
                        sessionId={sessionId}
                        onClose={() => setFeedbackOpen(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {messages.map((m) => {
                  const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isUser
                          ? isRtl
                            ? "justify-start"
                            : "justify-end"
                          : isRtl
                            ? "justify-end"
                            : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {text}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className={`flex ${isRtl ? "justify-end" : "justify-start"}`}>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {a.chat.typing}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                    {error.message}
                  </div>
                )}
              </div>

              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border bg-card/95 px-4 py-3 backdrop-blur"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  rows={1}
                  placeholder={isRtl ? "اكتب رسالتك..." : "Type your message..."}
                  className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className={`h-4 w-4 ${isRtl ? "-scale-x-100" : ""}`} />
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
