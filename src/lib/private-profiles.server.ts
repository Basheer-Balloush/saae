// Server-only: these cards carry private phone numbers, so they must never be
// bundled into client code. Each card is reachable only at /profile/<slug>,
// and the slug is the secret — don't link to it or list it anywhere.
//
// `card` is what the page renders on the server. `contact` is never put in
// the page HTML: the browser asks for it separately after the page loads, so
// link previews and scrapers that don't run JavaScript never see it.

import { cardSlugHash, decryptCard, deriveCardKeys } from "./profile-card-crypto";

type CardText = { name: string; role: string; roleSub: string; title: string };

export type ProfileCard = {
  slug: string;
  portrait: string;
  signature: string;
  fileName: string;
  ar: CardText;
  en: CardText;
  linkedin?: string;
  x?: string;
};

export type ProfileContact = {
  emails: string[];
  whatsapp: string;
  phones: { type: string; number: string }[];
};

// The cards live encrypted in the database table private_cards: the row key is
// an HMAC of the slug and the row is AES-256-GCM ciphertext, both derived from
// the Worker secret PROFILE_CARD_SECRET (see profile-card-crypto.ts). Nothing
// about a card is kept in the code or in public/.
//
// While the secret is being rolled out, a missing secret falls back to the
// earlier plain table (private_profile_cards); that fallback is removed once
// the encrypted read is confirmed live.

type StoredImage = { mime: string; b64: string };
type StoredCard = {
  card: Omit<ProfileCard, "slug" | "portrait" | "signature">;
  contact: ProfileContact;
  portrait: StoredImage;
  signature: StoredImage;
};

type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await (client.rpc as unknown as Rpc)(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

/** The address the page uses for a card image; it only works with the right slug. */
export function profileImagePath(slug: string, kind: "portrait" | "signature"): string {
  return `/api/profile-card/${encodeURIComponent(slug)}/${kind}`;
}

let keysPromise: ReturnType<typeof deriveCardKeys> | null = null;

/** The decrypted card, null when no card has this slug, undefined when the secret is not set. */
async function loadCard(slug: string): Promise<StoredCard | null | undefined> {
  const secret = process.env.PROFILE_CARD_SECRET;
  if (!secret) return undefined;
  keysPromise ??= deriveCardKeys(secret);
  const keys = await keysPromise;
  const hash = await cardSlugHash(keys, slug);
  const payload = (await rpc("get_private_card", { p_slug_hash: hash })) as string | null;
  return payload ? decryptCard<StoredCard>(keys, hash, payload) : null;
}

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function findProfileCard(slug: string): Promise<ProfileCard | null> {
  try {
    const stored = await loadCard(slug);
    if (stored !== undefined) {
      return stored
        ? {
            ...stored.card,
            slug,
            portrait: profileImagePath(slug, "portrait"),
            signature: profileImagePath(slug, "signature"),
          }
        : null;
    }
    const row = (await rpc("get_private_profile_card", { p_slug: slug })) as Omit<
      ProfileCard,
      "portrait" | "signature"
    > | null;
    if (row) {
      return {
        ...row,
        portrait: profileImagePath(slug, "portrait"),
        signature: profileImagePath(slug, "signature"),
      };
    }
  } catch (error) {
    console.error("Profile card lookup failed", error);
  }
  return null;
}

export async function findProfileContact(slug: string): Promise<ProfileContact | null> {
  try {
    const stored = await loadCard(slug);
    if (stored !== undefined) return stored?.contact ?? null;
    const row = (await rpc("get_private_profile_contact", {
      p_slug: slug,
    })) as ProfileContact | null;
    if (row) return row;
  } catch (error) {
    console.error("Profile contact lookup failed", error);
  }
  return null;
}

export async function findProfileImage(
  slug: string,
  kind: "portrait" | "signature",
): Promise<{ mime: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  const stored = await loadCard(slug);
  if (stored !== undefined) {
    const image = stored?.[kind];
    return image ? { mime: image.mime, bytes: decode(image.b64) } : null;
  }
  const rows = (await rpc("get_private_profile_image", { p_slug: slug, p_kind: kind })) as
    | { mime: string | null; b64: string | null }[]
    | null;
  const row = rows?.[0];
  if (!row?.mime || !row.b64) return null;
  return { mime: row.mime, bytes: decode(row.b64) };
}
