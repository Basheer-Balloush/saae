// Server-only: these cards carry private phone numbers, so they must never be
// bundled into client code. Each card is reachable only at /profile/<slug>,
// and the slug is the secret — don't link to it or list it anywhere.

export type PrivateProfile = {
  slug: string;
  portrait: string;
  signature: string;
  fileName: string;
  ar: { name: string; role: string; roleSub: string; title: string };
  en: { name: string; role: string; roleSub: string; title: string };
  email: string;
  whatsapp: string;
  linkedin: string;
  x?: string;
  phones: { type: string; number: string }[];
};

const PROFILES: PrivateProfile[] = [
  {
    slug: "vice-minister-of-finance-0sjkVkNguqqBcuWL",
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
    email: "deputyminister@mof.gov.sy",
    whatsapp: "963968444555",
    linkedin: "https://www.linkedin.com/in/mohamedaabazid",
    phones: [
      { type: "CELL;PREF=1", number: "+963968444555" },
      { type: "WORK,VOICE", number: "+96350005511" },
      { type: "CELL", number: "+963950005511" },
    ],
  },
];

export function findPrivateProfile(slug: string): PrivateProfile | null {
  return PROFILES.find((p) => p.slug === slug) ?? null;
}
