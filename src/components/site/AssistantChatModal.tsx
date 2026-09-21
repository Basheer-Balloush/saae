import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  Building2,
  GraduationCap,
  Handshake,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  X,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { loadChatSession, saveChatSession, type ChatSession } from "@/lib/chat-session";
import { parseChoices } from "@/lib/chat-choices";
import { formatMessage } from "@/lib/chat-format";
import { useLang } from "@/lib/i18n";
import { AssistantFeedbackForm } from "@/components/site/AssistantFeedbackForm";
import "./assistant-chat-modal.css";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

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
  const suggestions = [
    {
      icon: GraduationCap,
      text: isRtl ? "أنا مهتم ببرامج التدريب" : "I'm interested in training programs",
    },
    {
      icon: Handshake,
      text: isRtl ? "أبحث عن فرصة شراكة" : "I'm looking for a partnership opportunity",
    },
    {
      icon: Building2,
      text: isRtl ? "أخبرني عن الجمعية" : "Tell me about the association",
    },
  ];

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open && status !== "streaming") {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [open, status]);

  // Keep the newest message in view, including when the window opens on a
  // restored conversation (the thread is not mounted before that).
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 2 ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, status, open]);

  useEffect(() => {
    if (!feedbackOpen) return;
    const panel = feedbackRef.current;
    const el = scrollRef.current;
    if (!panel || !el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: Math.max(panel.offsetTop - 16, 0), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [feedbackOpen]);

  // The cinematic pages capture wheel events for their own scroll journeys, which
  // left this thread unscrollable. Inside the chat, the chat owns the wheel.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const step = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      const before = el.scrollTop;
      el.scrollTop = before + event.deltaY * step;
      if (el.scrollTop !== before) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
          transition={{ duration: 0.22 }}
          className="assistant-chat-overlay"
          onClick={onClose}
          dir={dir}
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.975, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 18 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="assistant-chat-shell"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-chat-title"
          >
            <header className="assistant-chat-header">
              <div className="assistant-chat-brand">
                <span className="assistant-chat-avatar" aria-hidden="true">
                  <img src="/cinematic/images/abu-al-joud-3d.webp" alt="" />
                </span>
                <div>
                  <div className="assistant-chat-kicker">
                    <Sparkles aria-hidden="true" />
                    <span>{isRtl ? "مساعد الجمعية الذكي" : "SAAE intelligent guide"}</span>
                  </div>
                  <p id="assistant-chat-title" className="assistant-chat-name">
                    {a.chat.name}
                  </p>
                </div>
              </div>

              <div className="assistant-chat-tools">
                <span className="assistant-chat-status">
                  <span aria-hidden="true" />
                  {a.chat.status}
                </span>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen((value) => !value)}
                  className="assistant-chat-icon-button"
                  aria-label={isRtl ? "إرسال ملاحظة" : "Send feedback"}
                  title={isRtl ? "إرسال ملاحظة" : "Send feedback"}
                >
                  <MessageSquarePlus aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="assistant-chat-icon-button"
                  aria-label={isRtl ? "إغلاق المحادثة" : "Close chat"}
                  title={isRtl ? "إغلاق المحادثة" : "Close chat"}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="assistant-chat-body chat-scroll">
              {messages.length === 0 && !feedbackOpen && (
                <div className="assistant-chat-welcome">
                  <motion.div
                    initial={{ opacity: 0, x: isRtl ? -24 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.48, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="assistant-chat-portrait"
                    aria-hidden="true"
                  >
                    <span className="assistant-chat-portrait-label">SAAE / AI</span>
                    <img src="/cinematic/images/abu-al-joud-3d.webp" alt="" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: isRtl ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.48, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className="assistant-chat-intro"
                  >
                    <p className="assistant-chat-eyebrow">
                      <Bot aria-hidden="true" />
                      {isRtl ? "أهلاً بك" : "Welcome"}
                    </p>
                    <h2>{a.title}</h2>
                    <p className="assistant-chat-subtitle">{a.subtitle}</p>

                    <div className="assistant-chat-suggestions">
                      {suggestions.map((suggestion) => {
                        const Icon = suggestion.icon;
                        return (
                          <button
                            key={suggestion.text}
                            type="button"
                            onClick={() => sendMessage({ text: suggestion.text })}
                            className="assistant-chat-suggestion"
                          >
                            <Icon aria-hidden="true" />
                            <span>{suggestion.text}</span>
                            <ArrowUp
                              className="assistant-chat-suggestion-arrow"
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="assistant-chat-feedback-link"
                    >
                      <MessageSquarePlus aria-hidden="true" />
                      {isRtl ? "أرسل ملاحظة إلى فريق الجمعية" : "Send feedback to the SAAE team"}
                    </button>
                  </motion.div>
                </div>
              )}

              {feedbackOpen && (
                <motion.div
                  ref={feedbackRef}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="assistant-chat-feedback-panel"
                >
                  <AssistantFeedbackForm
                    lang={lang === "ar" ? "ar" : "en"}
                    sessionId={sessionId}
                    onClose={() => setFeedbackOpen(false)}
                  />
                </motion.div>
              )}

              {messages.length > 0 && (
                <div className="assistant-chat-thread">
                  {messages.map((message, index) => {
                    const raw = message.parts
                      .map((part) => (part.type === "text" ? part.text : ""))
                      .join("");
                    const isUser = message.role === "user";
                    const { text, choices } = isUser ? { text: raw, choices: [] } : parseChoices(raw);
                    // Only the newest question's buttons stay live; earlier ones are history.
                    const showChoices =
                      !isUser && choices.length > 0 && index === messages.length - 1 && !isLoading;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`assistant-chat-message ${isUser ? "is-user" : "is-assistant"}`}
                      >
                        {!isUser && (
                          <span className="assistant-chat-message-avatar" aria-hidden="true">
                            <img src="/cinematic/images/abu-al-joud-3d.webp" alt="" />
                          </span>
                        )}
                        <div className="assistant-chat-message-content">
                          <span className="assistant-chat-message-role">
                            {isUser ? (isRtl ? "أنت" : "You") : a.chat.name}
                          </span>
                          <p>
                            {isUser
                              ? text
                              : formatMessage(text).map((seg, si) =>
                                  seg.bold ? <strong key={si}>{seg.text}</strong> : <span key={si}>{seg.text}</span>,
                                )}
                          </p>
                          {showChoices && (
                            <div className="assistant-chat-choices">
                              {choices.map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  className="assistant-chat-choice"
                                  onClick={() => sendMessage({ text: choice })}
                                >
                                  {choice}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {isLoading && (
                    <div className="assistant-chat-message is-assistant">
                      <span className="assistant-chat-message-avatar" aria-hidden="true">
                        <img src="/cinematic/images/abu-al-joud-3d.webp" alt="" />
                      </span>
                      <div className="assistant-chat-typing">
                        <Loader2 aria-hidden="true" />
                        {a.chat.typing}
                      </div>
                    </div>
                  )}

                  {error && <div className="assistant-chat-error">{error.message}</div>}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="assistant-chat-composer">
              <div className="assistant-chat-composer-box">
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
                  placeholder={isRtl ? "اسأل أبو الجود..." : "Ask Abu Al-Joud..."}
                  aria-label={isRtl ? "رسالتك إلى أبو الجود" : "Your message to Abu Al-Joud"}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="assistant-chat-send"
                  aria-label={isRtl ? "إرسال الرسالة" : "Send message"}
                  title={isRtl ? "إرسال الرسالة" : "Send message"}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUp aria-hidden="true" />
                  )}
                </button>
              </div>
              <p>
                {isRtl ? "إجابات ذكية من معرفة الجمعية" : "Intelligent answers from SAAE knowledge"}
              </p>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
