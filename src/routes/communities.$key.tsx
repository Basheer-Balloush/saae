import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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

type ActivityItem = { id: string; date: string; category: string; title: string; desc: string };
type Metric = { value: string; label: { ar: string; en: string } };

const MISSION: Record<CommunityKey, { ar: string; en: string }> = {
  data: {
    ar: "نُوفِّر طبقة «الذكاء» الأساسية لجميع قطاعات الجمعية عبر علوم البيانات، ونبني كفاءاتٍ سورية قادرة على قراءة الواقع وصياغة قراراته.",
    en: "Providing the foundational 'Intelligence' layer for all other SAAE sectors through data science — and building Syrian talent that can read reality and shape its decisions.",
  },
  architecture: {
    ar: "ندمج الذكاء الاصطناعي وإنترنت الأشياء وتحليل البيانات في إعادة إعمار سوريا وتخطيطها العمراني لبناء مدنٍ أكثر ذكاءً واستدامة.",
    en: "Integrating AI, IoT and data analysis into Syrian reconstruction and urban planning to build smarter, more sustainable cities.",
  },
  medical: {
    ar: "نَصِل الخبرة الطبية بالذكاء الاصطناعي (MedInvoVision) لتحسين دقّة التشخيص وجودة الرعاية الصحية في سوريا.",
    en: "Bridging medical expertise and AI (MedInvoVision) to improve diagnostic accuracy and quality of care in Syria.",
  },
  entrepreneurship: {
    ar: "نُمكِّن الشباب السوري من بناء شركات ناشئة تعتمد على الذكاء الاصطناعي وقيادة الاقتصاد الرقمي.",
    en: "Empowering Syrian youth to build AI-driven startups and lead the digital economy.",
  },
  research: {
    ar: "نبني جسراً علمياً بين الذكاء الاصطناعي النظري والتطبيقات السورية العملية عبر بحوثٍ رصينة ومنشورة.",
    en: "Building a scientific bridge between theoretical AI and practical Syrian applications through rigorous, published research.",
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

function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y} / ${m} / ${day}`;
}

const DEFAULT_METRICS: Metric[] = [
  { value: "320+", label: { ar: "عضو نشط", en: "Active Members" } },
  { value: "18", label: { ar: "ورقة بحثية", en: "Research Papers" } },
  { value: "42", label: { ar: "ورشة وفعالية", en: "Workshops & Events" } },
  { value: "27", label: { ar: "مشروع تطبيقي", en: "Applied Projects" } },
];

const METRICS_BY_KEY: Record<CommunityKey, Metric[]> = {
  entrepreneurship: [
    { value: "+15", label: { ar: "شركة ناشئة مدعومة", en: "Startups Supported" } },
    { value: "+50", label: { ar: "روّاد أعمال مُدرَّبون", en: "Entrepreneurs Trained" } },
  ],
  research: [
    { value: "+20", label: { ar: "ورقة بحثية", en: "Research Papers" } },
    { value: "+100", label: { ar: "باحث متّصِل بالشبكة", en: "Researchers Connected" } },
  ],
  medical: [
    { value: "+5", label: { ar: "نموذجٌ طبيٌّ مبتكر", en: "Innovative Medical Prototypes" } },
    { value: "+300", label: { ar: "طالب طبٍّ مُستفيد", en: "Medical Students Impacted" } },
  ],
  architecture: [
    { value: "+12", label: { ar: "مشروع تصميمٍ ذكي", en: "Smart Design Projects" } },
    { value: "+50", label: { ar: "معماري متخصّص بالذكاء الاصطناعي", en: "Architects Specialized in AI" } },
  ],
  data: [
    { value: "+200", label: { ar: "مُحلِّل بيانات مُدرَّب", en: "Data Analysts Trained" } },
    { value: "+10", label: { ar: "مجموعة بيانات مفتوحة", en: "Open-Source Datasets Curated" } },
  ],
  software: DEFAULT_METRICS,
  economy: DEFAULT_METRICS,
};

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

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingNews(true);
    supabase
      .from("news")
      .select("id,title,excerpt,category,published_at")
      .eq("category", k)
      .order("published_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("Community news fetch error:", error.message);
        const rows = (data ?? []).map((r): ActivityItem => ({
          id: r.id,
          date: formatNewsDate(r.published_at),
          category: r.category,
          title: r.title,
          desc: r.excerpt ?? "",
        }));
        setActivities(rows);
        setLoadingNews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [k]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-20">
        <Prelude name={name} mission={mission} img={HERO_IMG[k]} isRtl={isRtl} lang={lang} />
        <ActivityFeed isRtl={isRtl} lang={lang} activities={activities} loading={loadingNews} />
        <ImpactMatrix isRtl={isRtl} lang={lang} metrics={METRICS_BY_KEY[k] ?? DEFAULT_METRICS} />
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
function ActivityFeed({ isRtl, lang, activities, loading }: { isRtl: boolean; lang: "ar" | "en"; activities: ActivityItem[]; loading: boolean }) {
  const heading = lang === "ar" ? "الأخبار والفعاليات" : "News & Events";
  const sub = lang === "ar" ? "أرشيفٌ زمنيٌّ لما يصنعه المجتمع: ورشات، أبحاث، لقاءات وشراكات." : "A chronological index of what the community makes: workshops, research, meetups and partnerships.";
  const emptyMsg = lang === "ar" ? "لا توجد أخبار بعد لهذا المجتمع." : "No news yet for this community.";

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
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {sub}
          </p>
        </motion.div>

        <div className="mt-16" style={{ borderTop: `1px solid ${TEAL}` }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-4 py-10 lg:grid-cols-[30%_1fr] lg:gap-12 lg:py-12"
                style={{ borderBottom: `1px solid ${TEAL}` }}
              >
                <div className="space-y-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/50" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted/40" />
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                </div>
              </div>
            ))
          ) : activities.length === 0 ? (
            <div className="py-16 text-center" style={{ borderBottom: `1px solid ${TEAL}` }}>
              <p className="text-base" style={{ color: "var(--muted-foreground)", fontFamily: '"Cairo", system-ui, sans-serif' }}>
                {emptyMsg}
              </p>
            </div>
          ) : (
            activities.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                style={{ borderBottom: `1px solid ${TEAL}` }}
              >
                <Link
                  to="/news/$id"
                  params={{ id: a.id }}
                  className="grid grid-cols-1 gap-4 py-10 lg:grid-cols-[30%_1fr] lg:gap-12 lg:py-12 transition-opacity hover:opacity-80"
                >
                  {/* Column 1: Date + Category (30%) */}
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <div
                      className="text-xs font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TEAL, fontFamily: '"Cairo", system-ui, sans-serif' }}
                    >
                      {a.category}
                    </div>
                    <div
                      className="mt-3 text-sm"
                      style={{ color: "var(--muted-foreground)", fontFamily: '"Cairo", system-ui, sans-serif', letterSpacing: "0.04em" }}
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
                        color: "var(--foreground)",
                      }}
                    >
                      {a.title}
                    </h3>
                    {a.desc && (
                      <p
                        className="mt-3 line-clamp-2 text-base leading-[1.75]"
                        style={{ color: "var(--muted-foreground)", fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 300 }}
                      >
                        {a.desc}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION 4: Impact Matrix ---------- */
function ImpactMatrix({ isRtl, lang, metrics }: { isRtl: boolean; lang: "ar" | "en"; metrics: Metric[] }) {
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
              {metrics.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: i * 0.08 }}
                  className={`group flex flex-col justify-center rounded-2xl bg-muted/40 ${heights[i % heights.length]}`}
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
                        color: "var(--muted-foreground)",
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
    <section style={{ backgroundColor: "var(--surface)", paddingTop: 160, paddingBottom: 160 }}>
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
              color: "var(--foreground)",
            }}
          >
            {lang === "ar"
              ? "كُنْ جزءاً من القصّة."
              : "Be part of the story."}
          </h2>
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-[1.85]"
            style={{ color: "var(--muted-foreground)", fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 300 }}
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
              style={{ color: "var(--foreground)", fontFamily: '"Cairo", system-ui, sans-serif' }}
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
