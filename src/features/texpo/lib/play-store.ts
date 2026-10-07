/* What the device keeps about the Texpo game: a random device id (so the
   server can tell one phone's plays from another's) and the play in progress,
   so a reload or a trip through sign-up comes back to the same result.

   Both are kept in localStorage and in a cookie for the whole aisyria.org
   domain: aisyria.org and www.aisyria.org are separate origins, and the
   sign-up confirmation link may open on the other one. */

const DEVICE_KEY = "saae_texpo_device";
const PLAY_KEY = "saae_texpo_play";
const CHAT_SESSION_KEY = "saae_chat_session_v2";

export type StoredPlay = { id: string; finished: boolean; claimed: boolean };

const COOKIE_DAYS = 30;

/** "aisyria.org" on the site and its subdomains; none elsewhere (local runs). */
export function cookieDomain(hostname: string): string | null {
  return hostname === "aisyria.org" || hostname.endsWith(".aisyria.org") ? "aisyria.org" : null;
}

function readCookie(key: string): string | null {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${key}=`));
    return hit ? decodeURIComponent(hit.slice(key.length + 1)) : null;
  } catch {
    return null;
  }
}

function writeCookie(key: string, value: string | null) {
  try {
    const domain = cookieDomain(location.hostname);
    const parts = [
      `${key}=${value === null ? "" : encodeURIComponent(value)}`,
      "Path=/",
      `Max-Age=${value === null ? 0 : COOKIE_DAYS * 86400}`,
      "SameSite=Lax",
    ];
    if (domain) parts.push(`Domain=${domain}`);
    if (location.protocol === "https:") parts.push("Secure");
    document.cookie = parts.join("; ");
  } catch {
    // Cookies blocked: localStorage alone still serves this origin.
  }
}

function read(key: string): string | null {
  try {
    const local = localStorage.getItem(key);
    if (local) return local;
  } catch {
    // Fall through to the cookie.
  }
  return readCookie(key);
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the game still works for this visit.
  }
  writeCookie(key, value);
}

let memoryDevice: string | null = null;

export function deviceId(): string {
  const saved = read(DEVICE_KEY);
  if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) {
    // Found on the other origin's cookie: keep it here too.
    write(DEVICE_KEY, saved);
    return saved;
  }
  const fresh =
    memoryDevice ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);
  memoryDevice = fresh;
  write(DEVICE_KEY, fresh);
  return fresh;
}

export function storedPlay(): StoredPlay | null {
  const raw = read(PLAY_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<StoredPlay>;
    if (typeof p.id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.id)) return null;
    return { id: p.id, finished: !!p.finished, claimed: !!p.claimed };
  } catch {
    return null;
  }
}

export function savePlay(play: StoredPlay | null) {
  write(PLAY_KEY, play ? JSON.stringify(play) : null);
}

/** A finished play on this device that still waits for its coupon. */
export function hasUnclaimedResult(): boolean {
  const p = storedPlay();
  return !!p && p.finished && !p.claimed;
}

/** The chat widget's current session id, to link the conversation to the play. */
export function chatSessionId(): string | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CHAT_SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const id = (JSON.parse(raw) as { id?: unknown }).id;
    return typeof id === "string" && id.length >= 6 && id.length <= 128 ? id : null;
  } catch {
    return null;
  }
}
