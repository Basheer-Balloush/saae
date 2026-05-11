import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import {
  COMMUNITY_KEYS,
  COMMUNITY_LABELS_AR,
  COMMUNITY_LABELS_EN,
  type CommunityKey,
} from "@/lib/communityCategories";

const TEAL = "#048090";
const OLIVE = "#698F3F";
const OFFWHITE = "#F9F9F9";

// Hero imagery — natural-light human collaboration, no robots
const HERO_IMG: Record<CommunityKey, string> = {
  data: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1600&q=80",
  architecture: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
  medical: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80",
  entrepreneurship: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=80",
  research: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80",
  software: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=80",
  economy: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80",
};

type ActivityItem = { date: string; category: { ar: string; en: string }; title: { ar: string; en: string }; desc: { ar: string; en: string } };
type Metric = { value: string; label: { ar: string; en: string } };

const MISSION: Record<CommunityKey, { ar: string; en: string }> = {
  data: {
    ar: "نُمكِّن العقول السورية من قراءة البيانات وتحويلها إلى قرارات تصنع فرقاً حقيقياً.",
    en: "Empowering Syrian minds to read data and turn it into decisions that make a real difference.",
  },
  architecture: {
    ar: "نُعيد تخيّل المدن السورية عبر عمارة ذكية تجمع الإنسان بالتقنية والمعنى.",
    en: "Reimagining Syrian cities through smart architecture that unites people, technology and meaning.",
  },
  medical: {
    ar: "نُسخِّر الذكاء الاصطناعي لخدمة المريض السوري وبناء طبٍّ أكثر دقّةً وإنسانية.",
    en: "Harnessing AI to serve the Syrian patient and build a more precise, more human medicine.",
  },
  entrepreneurship: {
    ar: "نُحوّل الأفكار الجريئة إلى مشاريع رقمية مستدامة تصنع اقتصاد سوريا الجديد.",
    en: "Turning bold ideas into sustainable digital ventures that shape Syria's new economy.",
  },
  research: {
    ar: "نبني جسراً بين الأكاديميا والميدان عبر بحوث تطبيقية تخدم المجتمع.",
    en: "Bridging academia and the field through applied research that serves the community.",
  },
  software: {
    ar: "نصنع برمجياتٍ من سوريا، للعالم — بمعايير حِرفية وجودة معرفية عالية.",
    en: "Building software from Syria, for the world — with craft and world-class quality.",
  },
  economy: {
    ar: "نُعيد تعريف الاقتصاد عبر البيانات والذكاء الاصطناعي وأدوات القرن الجديد.",
    en: "Redefining the economy through data, AI, and the tools of a new century.",
  },
};

const ACTIVITIES: ActivityItem[] = [
  {
    date: "2025 / 11 / 12",
    category: { ar: "ورشة عمل", en: "Workshop" },
    title: { ar: "ورشة تطبيقية: من الفكرة إلى النموذج الأولي", en: "Hands-on Workshop: From Idea to MVP" },
    desc: {
      ar: "ثلاث جلسات تطبيقية يقودها ممارسون من القطاع، تركّز على التحقّق من الأفكار وبناء نماذج أولية قابلة للاختبار.",
      en: "Three practitioner-led sessions focused on validating ideas and building testable prototypes end-to-end.",
    },
  },
  {
    date: "2025 / 10 / 28",
    category: { ar: "حوار", en: "Roundtable" },
    title: { ar: "حوار مفتوح حول مستقبل القطاع في سوريا", en: "Open Roundtable on the Sector's Future in Syria" },
    desc: {
      ar: "جمعنا روّاد القطاع وأعضاء المجتمع لمناقشة الفرص والتحدّيات وصياغة خارطة طريق مشتركة للسنة القادمة.",
      en: "We gathered leaders and members to debate opportunities, challenges and a shared one-year roadmap.",
    },
  },
  {
    date: "2025 / 10 / 05",
    category: { ar: "بحث", en: "Research" },
    title: { ar: "إطلاق ورقة بحثية حول الأثر المحلي", en: "Launch of a Research Paper on Local Impact" },
    desc: {
      ar: "ورقة بحثية ميدانية أعدّها أعضاء المجتمع تستعرض الأثر التطبيقي للحلول المطوَّرة محلياً خلال العام.",
      en: "A field paper by community members reviewing the applied impact of locally-built solutions this year.",
    },
  },
  {
    date: "2025 / 09 / 14",
    category: { ar: "لقاء", en: "Meetup" },
    title: { ar: "لقاء الانطلاق الفصلي للمجتمع", en: "Quarterly Community Kickoff" },
    desc: {
      ar: "لقاءٌ ودّي وصارمٌ في آن؛ نستعرض إنجازات الفصل المنصرم ونعلن مبادرات الفصل القادم.",
      en: "A warm yet rigorous gathering — reviewing the past quarter's wins and announcing the next initiatives.",
    },
  },
  {
    date: "2025 / 08 / 22",
    category: { ar: "تعاون", en: "Collaboration" },
    title: { ar: "شراكة جديدة مع شركاء أكاديميين", en: "New Partnership With Academic Allies" },
    desc: {
      ar: "اتفاقية تعاون تفتح أبواب المختبرات والمكتبات أمام أعضاء المجتمع لمشاريعهم البحثية والتطبيقية.",
      en: "A cooperation agreement that opens labs and libraries to members for research and applied projects.",
    },
  },
];

const METRICS: Metric[] = [
  { value: "320+", label: { ar: "عضو نشط", en: "Active Members" } },
  { value: "18", label: { ar: "ورقة بحثية", en: "Research Papers" } },
  { value: "42", label: { ar: "ورشة وفعالية", en: "Workshops & Events" } },
  { value: "27", label: { ar: "مشروع تطبيقي", en: "Applied Projects" } },
];

export const Route = createFileRoute("/communities/$key")({
  beforeLoad: ({ params }) => {
    if (!(COMMUNITY_KEYS as readonly string[]).includes(params.key)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const k = params.key as CommunityKey;
    const nameAr = COMMUNITY_LABELS_AR[k] ?? "مجتمع";
    const nameEn = COMMUNITY_LABELS_EN[k] ?? "Community";
    return {
      meta: [
        { title: `${nameAr} — SAAE` },
        { name: "description", content: `${nameEn} — part of the SAAE ecosystem. Activities, research, achievements and how to join.` },
        { property: "og:title", content: `${nameEn} — SAAE` },
        { property: "og:description", content: MISSION[k]?.en ?? "" },
        { property: "og:image", content: HERO_IMG[k] },
        { name: "twitter:image", content: HERO_IMG[k] },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-3 text-muted-foreground">Community not found.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">Home</Link>
      </main>
      <Footer />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen p-10">
      <p>{error.message}</p>
    </div>
  ),
  component: CommunityPage,
});

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function CommunityPage() {
  const { key } = Route.useParams();
  const k = key as CommunityKey;
  const { lang, dir } = useLang();
  const isRtl = dir === "rtl";
  const name = lang === "ar" ? COMMUNITY_LABELS_AR[k] : COMMUNITY_LABELS_EN[k];
  const mission = MISSION[k][lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-20">
        <Prelude name={name} mission={mission} img={HERO_IMG[k]} isRtl={isRtl} lang={lang} />
        <ActivityFeed isRtl={isRtl} lang={lang} />
        <ImpactMatrix isRtl={isRtl} lang={lang} />
        <CallToConnection isRtl={isRtl} lang={lang} />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- SECTION 2: Editorial Prelude ---------- */
function Prelude({
  name,
  mission,
  img,
  isRtl,
  lang,
}: {
  name: string;
  mission: string;
  img: string;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  return (
    <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Text */}
          <motion.div {...fadeUp} className="lg:col-span-6">
            <Link
              to="/"
              hash="communities"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: TEAL }}
            >
              {isRtl ? <ArrowRight className="h-3.5 w-3.5 -scale-x-100" /> : <ArrowLeft className="h-3.5 w-3.5" />}
              {lang === "ar" ? "مجتمعات SAAE" : "SAAE Communities"}
            </Link>

            <h1
              className={`mt-6 ${isRtl ? "text-right" : "text-left"}`}
              style={{
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 900,
                lineHeight: isRtl ? 1.25 : 1.05,
                letterSpacing: "-0.02em",
                fontSize: "clamp(2.25rem, 5vw, 4rem)",
              }}
            >
              {name}
            </h1>

            <div className="mt-8 h-[2px] w-16" style={{ backgroundColor: TEAL }} />

            <p
              className={`mt-8 max-w-xl text-lg leading-[1.85] ${isRtl ? "text-right" : "text-left"}`}
              style={{
                fontFamily: lang === "ar" ? '"Cairo", system-ui, sans-serif' : '"Evanston Tavern 1919", Georgia, serif',
                fontWeight: lang === "ar" ? 400 : 500,
                color: "var(--foreground)",
                letterSpacing: "0.005em",
              }}
            >
              {mission}
            </p>
          </motion.div>

          {/* Image */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "4 / 5" }}>
              <img
                src={img}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ boxShadow: "inset 0 0 0 1px rgba(4,128,144,0.08)" }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 3: Activity Feed (Editorial Index) ---------- */
function ActivityFeed({ isRtl, lang }: { isRtl: boolean; lang: "ar" | "en" }) {
  const heading = lang === "ar" ? "الأخبار والفعاليات" : "News & Events";
  const sub = lang === "ar" ? "أرشيفٌ زمنيٌّ لما يصنعه المجتمع: ورشات، أبحاث، لقاءات وشراكات." : "A chronological index of what the community makes: workshops, research, meetups and partnerships.";

  return (
    <section className="relative bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div {...fadeUp} className={isRtl ? "text-right" : "text-left"}>
          <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: TEAL }}>
            {lang === "ar" ? "نشاط المجتمع" : "Community Activity"}
          </span>
          <h2
            className="mt-4"
            style={{
              fontFamily: '"Cairo", system-ui, sans-serif',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
            }}
          >
            {heading}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "#555" }}>
            {sub}
          </p>
        </motion.div>

        <div className="mt-16" style={{ borderTop: `1px solid ${TEAL}` }}>
          {ACTIVITIES.map((a, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 gap-4 py-10 lg:grid-cols-[30%_1fr] lg:gap-12 lg:py-12"
              style={{ borderBottom: `1px solid ${TEAL}` }}
            >
              {/* Column 1: Date + Category (30%) */}
              <div className={isRtl ? "text-right" : "text-left"}>
                <div
                  className="text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TEAL, fontFamily: '"Cairo", system-ui, sans-serif' }}
                >
                  {a.category[lang]}
                </div>
                <div
                  className="mt-3 text-sm"
                  style={{ color: "#888", fontFamily: '"Cairo", system-ui, sans-serif', letterSpacing: "0.04em" }}
                  dir="ltr"
                >
                  {a.date}
                </div>
              </div>

              {/* Column 2: Title + Description */}
              <div className={isRtl ? "text-right" : "text-left"}>
                <h3
                  style={{
                    fontFamily: '"Cairo", system-ui, sans-serif',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    fontSize: "clamp(1.25rem, 1.8vw, 1.625rem)",
                    color: "#1a1a1a",
                  }}
                >
                  {a.title[lang]}
                </h3>
                <p
                  className="mt-3 line-clamp-2 text-base leading-[1.75]"
                  style={{ color: "#555", fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 300 }}
                >
                  {a.desc[lang]}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 4: Impact Matrix ---------- */
function ImpactMatrix({ isRtl, lang }: { isRtl: boolean; lang: "ar" | "en" }) {
  // Long-Short / Short-Long
  const heights = [
    "min-h-[260px] lg:min-h-[300px]",
    "min-h-[180px] lg:min-h-[200px]",
    "min-h-[180px] lg:min-h-[200px]",
    "min-h-[260px] lg:min-h-[300px]",
  ];

  const headlineAr = "نصنع الأثر عبر المعرفة والتعاون.";
  const headlineEn = "We craft impact through knowledge and collaboration.";

  return (
    <section className="relative bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.div {...fadeUp} className={`lg:col-span-5 ${isRtl ? "text-right" : "text-left"}`}>
            <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: TEAL }}>
              {lang === "ar" ? "أرقام المجتمع" : "Community in Numbers"}
            </span>
            <h2
              className="mt-5"
              style={{
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 900,
                lineHeight: isRtl ? 1.4 : 1.05,
                letterSpacing: "-0.02em",
                fontSize: "clamp(2rem, 3.8vw, 3rem)",
              }}
            >
              {lang === "ar" ? headlineAr : headlineEn}
            </h2>
            <div className="mt-8 h-[2px] w-16" style={{ backgroundColor: TEAL }} />
          </motion.div>

          <div className="lg:col-span-7">
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ columnGap: "32px", rowGap: "40px" }}
            >
              {METRICS.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: i * 0.08 }}
                  className={`group flex flex-col justify-center rounded-2xl bg-muted/40 ${heights[i]}`}
                  style={{ padding: "28px" }}
                >
                  <div className={`flex flex-col ${isRtl ? "items-end text-right" : "items-start text-left"}`}>
                    <span
                      className="block leading-none"
                      style={{
                        color: TEAL,
                        fontFamily: '"Cairo", system-ui, sans-serif',
                        fontWeight: 900,
                        letterSpacing: "-0.03em",
                        fontSize: "clamp(2.75rem, 5vw, 4rem)",
                      }}
                    >
                      {m.value}
                    </span>
                    <span aria-hidden className="mt-5 block h-[2px] w-full" style={{ backgroundColor: TEAL }} />
                    <span
                      className="mt-5 block"
                      style={{
                        fontFamily: '"Cairo", system-ui, sans-serif',
                        fontWeight: 400,
                        fontSize: "14px",
                        letterSpacing: "0.01em",
                        color: "#555",
                      }}
                    >
                      {m.label[lang]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 5: Call to Connection ---------- */
function CallToConnection({ isRtl, lang }: { isRtl: boolean; lang: "ar" | "en" }) {
  return (
    <section style={{ backgroundColor: OFFWHITE, paddingTop: 160, paddingBottom: 160 }}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: OLIVE }}>
            {lang === "ar" ? "انضمَّ إلينا" : "Join Us"}
          </span>
          <h2
            className="mt-6"
            style={{
              fontFamily: '"Cairo", system-ui, sans-serif',
              fontWeight: 900,
              lineHeight: isRtl ? 1.35 : 1.1,
              letterSpacing: "-0.02em",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "#1a1a1a",
            }}
          >
            {lang === "ar"
              ? "كُنْ جزءاً من القصّة."
              : "Be part of the story."}
          </h2>
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-[1.85]"
            style={{ color: "#555", fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 300 }}
          >
            {lang === "ar"
              ? "ندعو الباحثين والطلاب والممارسين للانضمام إلى مجتمعٍ يعمل بهدوءٍ وإصرارٍ على بناء أثرٍ مستدام."
              : "We invite researchers, students and practitioners to join a community working — quietly and persistently — to build lasting impact."}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: TEAL, fontFamily: '"Cairo", system-ui, sans-serif' }}
            >
              {lang === "ar" ? "انضم إلى المجتمع" : "Join Community"}
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </a>
            <a
              href="mailto:info@aisyria.org"
              className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: "#1a1a1a", fontFamily: '"Cairo", system-ui, sans-serif' }}
            >
              <Mail className="h-4 w-4" style={{ color: OLIVE }} />
              {lang === "ar" ? "تواصَل مع المنسِّق" : "Contact Coordinator"}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
