/* The Abu Al-Joud API: other systems (a WhatsApp bot, an app, a partner's
   server) send a visitor's message with a key an admin issued and get the
   assistant's answer back. It is the website's own assistant, answering
   through the same handler; this file holds the pieces around it that can be
   tested without a model: the key format, the request, reading the answer
   out of the site's stream, and the response the caller receives. */

import { z } from "zod";
import { parseChoices } from "@/features/chat/lib/chat-choices";
import { formatMessage } from "@/features/chat/lib/chat-format";

export const API_KEY_START = "saae_aj_";
const KEY_BODY_LENGTH = 40;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const API_KEY_PATTERN = /^saae_aj_[A-Za-z0-9]{40}$/;

export const API_LIMITS = {
  maxBodyBytes: 8 * 1024,
  maxMessageChars: 2000,
  maxUserChars: 128,
  // Stored messages (questions and answers) in one API conversation.
  maxConversationMessages: 80,
  // Every key together, so the API can never use up the model quota the
  // website's visitors share (the site has peaked at ~130 messages an hour).
  globalPerMinute: 50,
  globalPerDay: 2000,
  timeoutMs: 45_000,
} as const;

/** A new key: the prefix and 40 random letters and digits (about 238 bits). */
export function newApiKey(): string {
  const out: string[] = [];
  while (out.length < KEY_BODY_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(64))) {
      // 248 = 4 × 62: bytes above it are skipped so every character is equally likely.
      if (byte < 248) out.push(ALPHABET[byte % 62]);
      if (out.length === KEY_BODY_LENGTH) break;
    }
  }
  return API_KEY_START + out.join("");
}

/** What the admin list shows of a key: enough to tell keys apart, useless on its own. */
export const keyPrefix = (key: string) => key.slice(0, API_KEY_START.length + 4);

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The key from `Authorization: Bearer <key>`, or null when it is missing or malformed. */
export function bearerKey(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return match && API_KEY_PATTERN.test(match[1]) ? match[1] : null;
}

const ApiRequest = z
  .object({
    message: z.string().trim().min(1).max(API_LIMITS.maxMessageChars),
    conversation_id: z.string().uuid().nullish(),
    user: z.string().trim().min(1).max(API_LIMITS.maxUserChars).nullish(),
    lang: z.enum(["ar", "en"]).nullish(),
  })
  .strict();

export type ApiRequest = z.infer<typeof ApiRequest>;

export function parseApiRequest(
  body: unknown,
): { ok: true; value: ApiRequest } | { ok: false; field: string } {
  const parsed = ApiRequest.safeParse(body);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const field =
    issue?.code === "unrecognized_keys"
      ? issue.keys.join(", ")
      : String(issue?.path?.[0] ?? "body");
  return { ok: false, field };
}

/** The language the answer is written in: the one the visitor wrote in, as on the website. */
export function replyLanguage(message: string, lang: "ar" | "en" | null | undefined): "ar" | "en" {
  if (/[؀-ۿ]/.test(message)) return "ar";
  if (/[a-zA-Z]/.test(message)) return "en";
  return lang === "en" ? "en" : "ar";
}

/* The website's chat answers as an AI SDK UI message stream (server-sent
   events). The caller gets only the answer text: tool calls, tool results and
   provider errors stay inside. The text parts are joined as the chat window
   joins them. */
export async function readAssistantReply(
  body: ReadableStream<Uint8Array>,
): Promise<{ text: string; failed: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let failed = false;

  const take = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let chunk: { type?: unknown; delta?: unknown };
    try {
      chunk = JSON.parse(data) as typeof chunk;
    } catch {
      return;
    }
    if (chunk.type === "text-delta" && typeof chunk.delta === "string") text += chunk.delta;
    else if (chunk.type === "error" || chunk.type === "abort") failed = true;
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(take);
  }
  buffer += decoder.decode();
  if (buffer) take(buffer);
  return { text, failed };
}

export type ApiLink = { label: string; url: string };
export type ApiReply = { text: string; choices: string[]; links: ApiLink[] };

/** The answer as the caller receives it: the text, its answer buttons, and its links. */
export function toApiReply(raw: string): ApiReply {
  const { text, choices } = parseChoices(raw.trim());
  const links: ApiLink[] = [];
  for (const segment of formatMessage(text)) {
    if (segment.href && !links.some((l) => l.url === segment.href))
      links.push({ label: segment.text, url: segment.href });
  }
  return { text, choices, links };
}

/** Said instead of an answer that was held back. */
export function heldBackReply(lang: "ar" | "en"): ApiReply {
  return lang === "ar"
    ? {
        text: "هاد شي ما بقدر شاركه. أنا هون لكل ما يخص الجمعية ودوراتها وبرامجها، كيف فيني ساعدك؟",
        choices: [],
        links: [],
      }
    : {
        text: "That's not something I can share. I'm here for anything about SAAE, its courses and programs. How can I help?",
        choices: [],
        links: [],
      };
}

export type ApiErrorCode =
  | "invalid_key"
  | "invalid_request"
  | "method_not_allowed"
  | "unsupported_media_type"
  | "payload_too_large"
  | "conversation_full"
  | "rate_limited"
  | "daily_limit"
  | "busy"
  | "unavailable"
  | "timeout";

const ERRORS: Record<ApiErrorCode, { status: number; message: string }> = {
  invalid_key: { status: 401, message: "Missing, invalid, expired or revoked API key." },
  invalid_request: {
    status: 400,
    message:
      'Send JSON {"message": "..."} with optional "conversation_id" (from an earlier answer), "user" and "lang" ("ar" or "en").',
  },
  method_not_allowed: { status: 405, message: "Use POST." },
  unsupported_media_type: { status: 415, message: "Send the body as application/json." },
  payload_too_large: { status: 413, message: "The request body is too large." },
  conversation_full: {
    status: 409,
    message:
      "This conversation has reached its length limit. Start a new one without conversation_id.",
  },
  rate_limited: { status: 429, message: "Too many requests. Wait and try again." },
  daily_limit: { status: 429, message: "The daily request limit is reached." },
  busy: { status: 503, message: "The assistant is busy. Try again shortly." },
  unavailable: { status: 503, message: "The assistant is unavailable right now." },
  timeout: { status: 504, message: "The assistant took too long to answer. Try again." },
};

const NO_STORE = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function apiJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, ...headers } });
}

export function apiError(
  code: ApiErrorCode,
  extra: { retryAfter?: number; scope?: string; field?: string } = {},
): Response {
  const { status, message } = ERRORS[code];
  const error: Record<string, unknown> = { code, message };
  if (extra.scope) error.scope = extra.scope;
  if (extra.field) error.field = extra.field;
  const headers: Record<string, string> = {};
  if (extra.retryAfter) {
    error.retry_after = extra.retryAfter;
    headers["retry-after"] = String(extra.retryAfter);
  }
  if (code === "invalid_key") headers["www-authenticate"] = 'Bearer realm="abu-al-joud"';
  if (code === "method_not_allowed") headers.allow = "POST";
  return apiJson({ error }, status, headers);
}
