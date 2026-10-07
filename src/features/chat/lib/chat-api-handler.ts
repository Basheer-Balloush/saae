/* One API request, end to end. The key and every limit are checked in a single
   database call; then the visitor's message goes to the website's own chat
   handler, in-process, exactly as the chat window sends it, so the API answers
   with the same prompt, tools and knowledge as the site and follows every
   change made there. The caller receives only the answer text, its buttons and
   its links, after the leak check. Dependencies are passed in so tests can run
   the whole path without a database or a model. */

import {
  API_LIMITS,
  apiError,
  apiJson,
  bearerKey,
  heldBackReply,
  parseApiRequest,
  readAssistantReply,
  replyLanguage,
  sha256Hex,
  toApiReply,
} from "@/features/chat/lib/chat-api";
import type { LeakVerdict } from "@/features/chat/lib/chat-api-guard";

export type ApiAuthorization =
  | {
      ok: true;
      key_id: string;
      session_id: string;
      day_remaining: number;
      previous_reply: string | null;
    }
  | { ok: false; code: string; scope?: string; retry_after?: number };

export type ApiChatDeps = {
  authorize: (input: {
    keyHash: string;
    userHash: string | null;
    conversationId: string;
  }) => Promise<ApiAuthorization>;
  /** The website's /api/chat POST handler. */
  siteChat: (request: Request) => Promise<Response>;
  checkReply: (text: string) => LeakVerdict;
  noteBlocked: (keyId: string) => Promise<void>;
  newConversationId?: () => string;
  timeoutMs?: number;
};

type SiteHandler = (ctx: { request: Request }) => Response | Promise<Response>;

/** A route's server handler for one method, as TanStack Start keeps it on the route's options. */
export function routeHandler(
  route: unknown,
  method: "POST",
): (request: Request) => Promise<Response> {
  const handlers = (route as { options?: { server?: { handlers?: unknown } } })?.options?.server
    ?.handlers;
  const handler =
    handlers && typeof handlers === "object" ? (handlers as Record<string, unknown>)[method] : null;
  if (typeof handler !== "function") throw new Error(`route has no ${method} handler`);
  return async (request) => (handler as SiteHandler)({ request });
}

/** The body as text, or null when it is larger than `max` bytes. */
async function readBody(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

function refused(auth: Extract<ApiAuthorization, { ok: false }>): Response {
  const extra = { scope: auth.scope, retryAfter: auth.retry_after };
  switch (auth.code) {
    case "invalid_key":
      return apiError("invalid_key");
    case "invalid_request":
      return apiError("invalid_request");
    case "conversation_full":
      return apiError("conversation_full");
    case "rate_limited":
      return apiError("rate_limited", extra);
    case "daily_limit":
      return apiError("daily_limit", extra);
    case "busy":
      return apiError("busy", extra);
    default:
      return apiError("unavailable");
  }
}

export async function handleApiChat(request: Request, deps: ApiChatDeps): Promise<Response> {
  const key = bearerKey(request.headers.get("authorization"));
  if (!key) return apiError("invalid_key");
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? ""))
    return apiError("unsupported_media_type");
  if (Number(request.headers.get("content-length") ?? 0) > API_LIMITS.maxBodyBytes)
    return apiError("payload_too_large");

  const raw = await readBody(request, API_LIMITS.maxBodyBytes);
  if (raw === null) return apiError("payload_too_large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return apiError("invalid_request", { field: "body" });
  }
  const parsed = parseApiRequest(body);
  if (!parsed.ok) return apiError("invalid_request", { field: parsed.field });
  const { message, user, lang } = parsed.value;
  const conversationId = (
    parsed.value.conversation_id ?? (deps.newConversationId ?? (() => crypto.randomUUID()))()
  ).toLowerCase();
  const answerLang = replyLanguage(message, lang);

  const keyHash = await sha256Hex(key);
  // Bound to the key, so the same end-user id under two keys is two people.
  const userHash = user ? await sha256Hex(`${keyHash}:${user}`) : null;

  let auth: ApiAuthorization;
  try {
    auth = await deps.authorize({ keyHash, userHash, conversationId });
  } catch (error) {
    console.error("[chat-api] authorize failed", error instanceof Error ? error.message : error);
    return apiError("unavailable");
  }
  if (!auth.ok) return refused(auth);

  // The same request the chat window sends: the previous answer (whose buttons
  // tell a button press from a question) and the new message. The site handler
  // rebuilds the history from the database and trusts nothing else from here.
  const site = new URL("/api/chat", request.url);
  const messages = [
    ...(auth.previous_reply
      ? [
          {
            id: "previous",
            role: "assistant",
            parts: [{ type: "text", text: auth.previous_reply }],
          },
        ]
      : []),
    { id: "message", role: "user", parts: [{ type: "text", text: message }] },
  ];
  const inner = new Request(site, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: site.origin,
      "user-agent": `abu-al-joud-api key=${auth.key_id}`,
      // The site's own per-visitor limiter then counts each API conversation apart.
      "cf-connecting-ip": `api-${auth.key_id}`,
    },
    body: JSON.stringify({ sessionId: auth.session_id, lang: lang ?? "ar", messages }),
  });

  const timeoutMs = deps.timeoutMs ?? API_LIMITS.timeoutMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const answer = (async () => {
    const response = await deps.siteChat(inner);
    if (response.status === 429) {
      await response.body?.cancel().catch(() => {});
      return {
        kind: "limited" as const,
        retryAfter: Number(response.headers.get("retry-after")) || 60,
      };
    }
    if (!response.ok || !response.body) {
      console.error("[chat-api] site chat refused", {
        status: response.status,
        keyId: auth.key_id,
      });
      await response.body?.cancel().catch(() => {});
      return { kind: "unavailable" as const };
    }
    return { kind: "answer" as const, ...(await readAssistantReply(response.body)) };
  })();
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });

  let result: Awaited<typeof answer> | { kind: "timeout" };
  try {
    result = await Promise.race([answer, timeout]);
  } catch (error) {
    console.error("[chat-api] site chat failed", error instanceof Error ? error.message : error);
    return apiError("unavailable");
  } finally {
    clearTimeout(timer);
  }

  if (result.kind === "timeout") return apiError("timeout");
  if (result.kind === "limited")
    return apiError("rate_limited", { scope: "conversation", retryAfter: result.retryAfter });
  if (result.kind === "unavailable") return apiError("unavailable");
  if (result.failed || !result.text.trim()) return apiError("busy", { retryAfter: 30 });

  const verdict = deps.checkReply(result.text);
  if (verdict) {
    console.warn("[chat-api] answer held back", { keyId: auth.key_id, verdict, conversationId });
    await deps.noteBlocked(auth.key_id).catch(() => {});
  }

  return apiJson(
    {
      conversation_id: conversationId,
      lang: answerLang,
      reply: verdict ? heldBackReply(answerLang) : toApiReply(result.text),
    },
    200,
    { "x-ratelimit-remaining-day": String(auth.day_remaining) },
  );
}
