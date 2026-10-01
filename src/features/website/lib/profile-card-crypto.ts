// Encryption for the private profile cards (server-only).
//
// The database never sees a card in the clear. It stores:
//   slug_hash  HMAC-SHA256(slug), so it doesn't even hold the secret links
//   payload    AES-256-GCM(card, contact, portrait, signature), bound to slug_hash
// Both keys are derived (HKDF-SHA256) from the Worker secret PROFILE_CARD_SECRET,
// which lives only in Cloudflare and in the owner's private backup.

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array): string => {
  let binary = "";
  // In chunks: spreading a whole image into fromCharCode overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64url = (text: string): Uint8Array<ArrayBuffer> => {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );
};

type Keys = { slug: CryptoKey; payload: CryptoKey };

export async function deriveCardKeys(secretB64: string): Promise<Keys> {
  const secret = fromB64url(secretB64.trim());
  if (secret.length < 32) throw new Error("PROFILE_CARD_SECRET must be at least 32 bytes");
  const ikm = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  const hkdf = (info: string) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: enc.encode("saae-profile-card"),
    info: enc.encode(info),
  });
  const [slug, payload] = await Promise.all([
    crypto.subtle.deriveKey(
      hkdf("slug"),
      ikm,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign"],
    ),
    crypto.subtle.deriveKey(hkdf("payload"), ikm, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]),
  ]);
  return { slug, payload };
}

/** 43 characters: the base64url form of a 32-byte HMAC. */
export async function cardSlugHash(keys: Keys, slug: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", keys.slug, enc.encode(slug))));
}

export async function encryptCard(keys: Keys, slugHash: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(slugHash) },
    keys.payload,
    enc.encode(JSON.stringify(value)),
  );
  return `v1.${b64url(iv)}.${b64url(new Uint8Array(data))}`;
}

export async function decryptCard<T>(keys: Keys, slugHash: string, payload: string): Promise<T> {
  const [version, iv, data] = payload.split(".");
  if (version !== "v1" || !iv || !data) throw new Error("Unknown card payload format");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64url(iv), additionalData: enc.encode(slugHash) },
    keys.payload,
    fromB64url(data),
  );
  return JSON.parse(dec.decode(plain)) as T;
}
