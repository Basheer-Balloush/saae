/* What the device keeps about the Texpo game: a random device id (so the
   server can tell one phone's plays from another's) and the play in progress,
   so a reload or a trip through sign-up comes back to the same result. */

const DEVICE_KEY = "saae_texpo_device";
const PLAY_KEY = "saae_texpo_play";
const CHAT_SESSION_KEY = "saae_chat_session_v2";

export type StoredPlay = { id: string; finished: boolean; claimed: boolean };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the game still works for this visit.
  }
}

let memoryDevice: string | null = null;

export function deviceId(): string {
  const saved = read(DEVICE_KEY);
  if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
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
  const raw = read(CHAT_SESSION_KEY);
  if (!raw) return null;
  try {
    const id = (JSON.parse(raw) as { id?: unknown }).id;
    return typeof id === "string" && id.length >= 6 && id.length <= 128 ? id : null;
  } catch {
    return null;
  }
}
