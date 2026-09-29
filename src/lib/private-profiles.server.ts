// Server-only: these cards carry private phone numbers, so they must never be
// bundled into client code. Each card is reachable only at /profile/<slug>,
// and the slug is the secret — don't link to it or list it anywhere.
//
// `card` is what the page renders on the server. `contact` is never put in
// the page HTML: the browser asks for it separately after the page loads, so
// link previews and scrapers that don't run JavaScript never see it.

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

const PROFILES: { card: ProfileCard; contact: ProfileContact }[] = [
  {
    card: {
      slug: "minister-of-finance-T4R0O_U4PQWPdCSM",
      portrait: "/profile-card/portrait-minister.jpeg",
      signature: "/profile-card/signature.png",
      fileName: "Mohamad-Yisr-Barnieh.vcf",
      ar: {
        name: "محمد يسر برنية",
        role: "وزير الماليـــة",
        roleSub: "فـي الجمهوريـة العربيـة السوريـة",
        title: "وزير المالية في الجمهورية العربية السورية",
      },
      en: {
        name: "Mohamad Yisr Barnieh",
        role: "Minister of Finance",
        roleSub: "of the Syrian Arab Republic",
        title: "Minister of Finance of the Syrian Arab Republic",
      },
      linkedin: "https://sy.linkedin.com/in/yisr-barnieh-3846a88a",
    },
    contact: {
      emails: ["minister@mof.gov.sy", "minister.office@mof.gov.sy"],
      whatsapp: "963983551111",
      phones: [
        { type: "CELL;PREF=1", number: "+963983551111" },
        { type: "WORK,VOICE", number: "+96311226605" },
      ],
    },
  },
  {
    card: {
      slug: "deputy-minister-of-finance-Xq2mV7RtNp4yLc9s",
      portrait: "/profile-card/d6e111cce6-portrait.jpg",
      signature: "/profile-card/d6e111cce6-signature.png",
      fileName: "Mohammad-Abdelhaleem-Abazeed.vcf",
      ar: {
        name: "محمد عبدالحليم ابازيد",
        role: "نائب وزير الماليـــة",
        roleSub: "فـي الجمهوريـة العربيـة السوريـة",
        title: "نائب وزير المالية في الجمهورية العربية السورية",
      },
      en: {
        name: "Mohammad Abdelhaleem Abazeed",
        role: "Vice Minister of Finance",
        roleSub: "of the Syrian Arab Republic",
        title: "Vice Minister of Finance of the Syrian Arab Republic",
      },
      linkedin: "https://www.linkedin.com/in/mohamedaabazid",
    },
    contact: {
      emails: ["deputyminister@mof.gov.sy"],
      whatsapp: "963968444555",
      phones: [
        { type: "WORK,VOICE;PREF=1", number: "+96350005511" },
        { type: "WORK,VOICE", number: "+963950005511" },
        { type: "CELL", number: "+963968444555" },
      ],
    },
  },
  {
    card: {
      slug: "communications-director-9FaMUyl0Lx4p196W",
      portrait: "/profile-card/67bb9af009-portrait.jpg",
      signature: "/profile-card/67bb9af009-signature.png",
      fileName: "Mohammed-Shahhoud.vcf",
      ar: {
        name: "محمد شحود",
        role: "مدير الاتصال الحكومي",
        roleSub: "فـي وزارة الماليـة",
        title: "مدير الاتصال الحكومي في وزارة المالية",
      },
      en: {
        name: "Mohammed Shahhoud",
        role: "Government Communications Director",
        roleSub: "Ministry of Finance",
        title: "Government Communications Director, Ministry of Finance",
      },
    },
    contact: {
      emails: ["pr@mof.gov.sy"],
      whatsapp: "963989323335",
      phones: [{ type: "CELL;PREF=1", number: "+963989323335" }],
    },
  },
];

function find(slug: string) {
  return PROFILES.find((p) => p.card.slug === slug) ?? null;
}

// The cards now live in the database table private_profile_cards, read through
// exact-slug functions (get_private_profile_*). The copies above are only a
// fallback while the move is verified live; they are removed afterwards.
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

export async function findProfileCard(slug: string): Promise<ProfileCard | null> {
  try {
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
  return find(slug)?.card ?? null;
}

export async function findProfileContact(slug: string): Promise<ProfileContact | null> {
  try {
    const row = (await rpc("get_private_profile_contact", {
      p_slug: slug,
    })) as ProfileContact | null;
    if (row) return row;
  } catch (error) {
    console.error("Profile contact lookup failed", error);
  }
  return find(slug)?.contact ?? null;
}

export async function findProfileImage(
  slug: string,
  kind: "portrait" | "signature",
): Promise<{ mime: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  const rows = (await rpc("get_private_profile_image", { p_slug: slug, p_kind: kind })) as
    | { mime: string | null; b64: string | null }[]
    | null;
  const row = rows?.[0];
  if (!row?.mime || !row.b64) return null;
  return { mime: row.mime, bytes: Uint8Array.from(atob(row.b64), (c) => c.charCodeAt(0)) };
}
