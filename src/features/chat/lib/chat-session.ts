/* One visit to the website is one conversation. The session id (and the messages
   shown in the widget) live on the visitor's device and are dropped after
   CHAT_IDLE_MS without a message, so a visitor coming back tomorrow starts a
   fresh conversation in the admin list instead of extending an endless thread —
   and the assistant stops carrying weeks-old context into new questions. */

export type ChatSession = { id: string; lastActivity: number; messages: unknown[] };

const STORE_KEY = "saae_chat_session_v2";
const LEGACY_KEY = "saae_chat_session"; // plain id string, never expired
export const CHAT_IDLE_MS = 30 * 60 * 1000;
const MAX_STORED_MESSAGES = 50; // matches the history the server replays

export function newChatSessionId(): string {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
  return uuid ?? `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** The stored session when it is still active, otherwise a brand-new one. */
export function resolveChatSession(raw: string | null, now: number): { session: ChatSession; isNew: boolean } {
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatSession>;
      if (
        typeof parsed.id === "string" &&
        parsed.id.length >= 6 &&
        parsed.id.length <= 128 &&
        typeof parsed.lastActivity === "number" &&
        Number.isFinite(parsed.lastActivity) &&
        now - parsed.lastActivity < CHAT_IDLE_MS &&
        now - parsed.lastActivity >= 0
      ) {
        return {
          session: {
            id: parsed.id,
            lastActivity: parsed.lastActivity,
            messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_STORED_MESSAGES) : [],
          },
          isNew: false,
        };
      }
    }
  } catch {
    // Unreadable entry: start clean rather than dropping the visitor into a broken thread.
  }
  return { session: { id: newChatSessionId(), lastActivity: now, messages: [] }, isNew: true };
}

export function loadChatSession(now: number = Date.now()): ChatSession {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable (private mode, server render): the chat still works, nothing is kept.
  }
  const { session, isNew } = resolveChatSession(raw, now);
  // Store a new session straight away, so every later read returns this same
  // conversation instead of minting another id.
  if (isNew) saveChatSession(session);
  return session;
}

export function saveChatSession(session: ChatSession): void {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ ...session, messages: session.messages.slice(-MAX_STORED_MESSAGES) }),
    );
  } catch {
    /* ignore */
  }
}
