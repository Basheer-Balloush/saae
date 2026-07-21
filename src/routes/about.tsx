import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { aboutContent } from "@/lib/about-content";
import {
  Target,
  Compass,
  Brain,
  Code2,
  Briefcase,
  Lightbulb,
  GraduationCap,
  Users,
  HeartHandshake,
  TrendingUp,
  Share2,
  ArrowLeft,
  ArrowRight,
  UserCircle2,
} from "lucide-react";

type Member = {
  id: string;
  category: "board" | "executive";
  full_name_ar: string;
  full_name_en: string | null;
  position_ar: string;
  position_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
  display_order: number;
};

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن الجمعية — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      {
        name: "description",
        content:
          "الجمعية السورية للذكاء الصنعي وريادة الأعمال — منظمة شبابية تنشر ثقافة الذكاء الصنعي وريادة الأعمال وتمكّن الشباب السوري من صناعة المستقبل. Syrian Association for AI & Entrepreneurship (SAAE) — a youth-led organization empowering Syrian youth through AI and entrepreneurship.",
      },
      { property: "og:title", content: "About SAAE — Syrian Association for AI & Entrepreneurship" },
      {
        property: "og:description",
        content:
          "We build a knowledge ecosystem that pairs modern technology with the spirit of initiative — training, workshops, and applied projects for Syrian youth.",
      },
      { property: "og:url", content: "https://aisyria.org/about" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "ar", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "en", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "x-default", href: "https://aisyria.org/about" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { dir } = useLang();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-20">
        <Hero Arrow={Arrow} />
        <VisionMission />
        <Goals />
        <Fields />
        <Values />
        <MembersSection category="board" />
        <MembersSection category="executive" />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- MEMBERS ---------- */
function MembersSection({ category }: { category: "board" | "executive" }) {
  const { lang } = useLang();
  const t = aboutContent[lang];
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .eq("category", category)
      .order("display_order", { ascending: true })
      .then(({ data }) => setMembers((data ?? []) as Member[]));
  }, [category]);

  const title = category === "board" ? t.members.boardTitle : t.members.executiveTitle;
  const subtitle = category === "board" ? t.members.boardSubtitle : t.members.executiveSubtitle;

  if (members.length === 0) return null;

  const pick = (arVal: string | null, enVal: string | null) =>
    lang === "ar" ? (arVal ?? enVal ?? "") : (enVal ?? arVal ?? "");

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-5 text-base leading-loose text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <article
            key={m.id}
            className="group flex flex-col items-center rounded-3xl border border-border bg-card p-7 text-center transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
          >
            <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-primary/10">
              {m.photo_url ? (
                <img src={m.photo_url} alt={pick(m.full_name_ar, m.full_name_en)} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <UserCircle2 className="h-14 w-14" />
                </div>
              )}
            </div>
            <h3 className="mt-5 text-lg font-bold text-foreground">
              {pick(m.full_name_ar, m.full_name_en)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-primary">
              {pick(m.position_ar, m.position_en)}
            </p>
            {(m.bio_ar || m.bio_en) && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {pick(m.bio_ar, m.bio_en)}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- HERO ---------- */
function Hero({ Arrow: _Arrow }: { Arrow: typeof ArrowRight }) {
  const { lang } = useLang();
  const t = aboutContent[lang];
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 start-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 end-1/4 h-[24rem] w-[24rem] rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,hsl(var(--background))_80%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-12 text-center lg:px-10 lg:pb-24 lg:pt-20">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {t.hero.title}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-loose text-muted-foreground sm:text-lg">
          {t.hero.p1}
        </p>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-loose text-muted-foreground sm:text-lg">
          {t.hero.p2}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
          >
            {t.hero.backHome}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- VISION & MISSION ---------- */
function VisionMission() {
  const { lang } = useLang();
  const t = aboutContent[lang];
  const cards = [
    { Icon: Compass, eyebrow: t.vision.eyebrow, body: t.vision.body },
    { Icon: Target, eyebrow: t.mission.eyebrow, body: t.mission.body },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map(({ Icon, eyebrow, body }) => (
          <article
            key={eyebrow}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft sm:p-10"
          >
            <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-primary/5 transition-transform duration-700 group-hover:scale-150" />
            <div className="relative">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                {eyebrow}
              </h2>
              <p className="mt-4 text-base leading-loose text-muted-foreground">
                {body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- GOALS ---------- */
function Goals() {
  const { lang } = useLang();
  const t = aboutContent[lang];

  return (
    <section className="relative border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.goals.heading}
            </h2>
            <p className="mt-5 text-base leading-loose text-muted-foreground">
              {t.goals.intro}
            </p>
          </div>

          <ol className="lg:col-span-8 space-y-4">
            {t.goals.items.map((g, i) => (
              <li
                key={i}
                className="group flex items-start gap-5 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-soft sm:p-6"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="pt-2 text-base leading-relaxed text-foreground/90 sm:text-lg">
                  {g}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- FIELDS ---------- */
function Fields() {
  const { lang } = useLang();
  const t = aboutContent[lang];
  const icons = [Brain, Code2, Briefcase, Lightbulb, GraduationCap];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.fields.heading}
        </h2>
        <p className="mt-5 text-base leading-loose text-muted-foreground">
          {t.fields.intro}
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {t.fields.items.map((title, i) => {
          const Icon = icons[i] ?? Brain;
          return (
            <div
              key={title}
              className="group flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary transition-colors group-hover:from-primary group-hover:to-secondary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold leading-snug text-foreground sm:text-lg">
                {title}
              </h3>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- VALUES ---------- */
function Values() {
  const { lang } = useLang();
  const t = aboutContent[lang];
  const icons = [Lightbulb, Users, Share2, TrendingUp, HeartHandshake];

  return (
    <section className="relative overflow-hidden border-y border-border bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.values.heading}
          </h2>
          <p className="mt-5 text-base leading-loose text-muted-foreground">
            {t.values.intro}
          </p>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          {t.values.items.map((title, i) => {
            const Icon = icons[i] ?? Lightbulb;
            return (
              <div
                key={title}
                className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground/90 shadow-sm transition-all hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
