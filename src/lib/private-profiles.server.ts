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
];

function find(slug: string) {
  return PROFILES.find((p) => p.card.slug === slug) ?? null;
}

export function findProfileCard(slug: string): ProfileCard | null {
  return find(slug)?.card ?? null;
}

export function findProfileContact(slug: string): ProfileContact | null {
  return find(slug)?.contact ?? null;
}
