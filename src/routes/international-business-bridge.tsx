import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Mic, Landmark, Presentation, Link2, MessageSquare, Users, Boxes, Clock, Calendar, MapPin } from "lucide-react";
import ministryEconomy from "@/assets/ministry-economy.png.asset.json";
import ministryComms from "@/assets/ministry-communications-v2.png.asset.json";
import { useLang } from "@/lib/i18n";

// 30 July 2026, 11:00 AM Damascus time (UTC+3, no DST)
const TARGET_MS = Date.UTC(2026, 6, 30, 8, 0, 0);

type Lang = "ar" | "en";

const CONTENT = {
  ar: {
    title1: "جسر الأعمال الدولي",
    title2: "نحو المهارات السورية",
    subtitle: "معاً نربط المهارات السورية بالفرص الدولية ونبني مستقبل الأعمال والتكنولوجيا",
    sponsors: "برعاية كريمة من:",
    economyAlt: "وزارة الاقتصاد والصناعة",
    commsAlt: "وزارة الاتصالات وتقانة المعلومات",
    countdownTitle: "العد التنازلي حتى انطلاق المؤتمر",
    countdownSub: "30 تموز 2026 — 11:00 صباحاً بتوقيت دمشق",
    started: "انطلق المؤتمر!",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثواني",
    agendaTitle: "محاور المؤتمر",
    metaTime: { label: "التوقيت", value: "11:00 صباحاً" },
    metaDate: { label: "التاريخ", value: "30 تموز 2026" },
    metaPlace: { label: "المكان", value: "المكتبة الوطنية — دمشق" },
    agenda: [
      "كلمة رئيس مجلس إدارة الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
      "كلمة وزارة الاقتصاد والصناعة",
      "كلمة وزارة الاتصالات وتقانة المعلومات",
      "عرض تجربة تدريب المهارات السورية في شركة Mozaic AI الألمانية",
      "عرض تجربة تدريب المهارات السورية في شركة Devista الرومانية",
      "إطلاق منصة ربط المهارات السورية بالأعمال الدولية",
      "جلسة حوارية: أثر التدريب العملي على الاقتصاد السوري",
      "جلسة حوارية: حوار مع خبراء في علوم البيانات والذكاء الاصطناعي",
      "معرض تقني مرافق للمؤتمر",
    ],
    meta: {
      title: "جسر الأعمال الدولي نحو المهارات السورية — SAAE",
      description:
        "مؤتمر جسر الأعمال الدولي نحو المهارات السورية — 30 تموز 2026، المكتبة الوطنية، دمشق.",
      ogDescription: "معاً نربط المهارات بالفرص ونبني مستقبل الأعمال والتكنولوجيا.",
    },
  },
  en: {
    title1: "International Business Bridge\u00A0",
    title2: "to Syrian Talent",
    subtitle:
      "Together we connect Syrian talent with international opportunities and build the future of business and technology",
    sponsors: "Under the generous patronage of:",
    economyAlt: "Ministry of Economy and Industry",
    commsAlt: "Ministry of Communications and Information Technology",
    countdownTitle: "Countdown to the Conference",
    countdownSub: "July 30, 2026 — 11:00 AM Damascus time",
    started: "The conference has started!",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    agendaTitle: "Conference Agenda",
    metaTime: { label: "Time", value: "11:00 AM" },
    metaDate: { label: "Date", value: "July 30, 2026" },
    metaPlace: { label: "Venue", value: "National Library — Damascus" },
    agenda: [
      "Opening speech by the Chairman of the Syrian Association for AI and Entrepreneurship",
      "Speech by the Ministry of Economy and Industry",
      "Speech by the Ministry of Communications and Information Technology",
      "Case study: training Syrian talent at Mozaic AI (Germany)",
      "Case study: training Syrian talent at Devista (Romania)",
      "Launch of the platform connecting Syrian talent with international business",
      "Panel: the impact of practical training on the Syrian economy",
      "Panel: dialogue with experts in data science and AI",
      "Tech exhibition alongside the conference",
    ],
    meta: {
      title: "International Business Bridge to Syrian Talent — SAAE",
      description:
        "International Business Bridge to Syrian Talent conference — July 30, 2026, National Library, Damascus.",
      ogDescription: "Connecting talent with opportunities, building the future of business and technology.",
    },
  },
} as const;

const AGENDA_ICONS = [Mic, Landmark, Landmark, Presentation, Presentation, Link2, MessageSquare, Users, Boxes];

function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = now === null ? target - Date.now() : Math.max(0, target - now);
  const safe = Math.max(0, diff);
  const days = Math.floor(safe / 86_400_000);
  const hours = Math.floor((safe % 86_400_000) / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  return { days, hours, minutes, seconds, done: now !== null && diff === 0, ready: now !== null };
}


export const Route = createFileRoute("/international-business-bridge")({
  head: () => ({
    meta: [
      { title: "جسر الأعمال الدولي نحو المهارات السورية — SAAE" },
      {
        name: "description",
        content:
          "مؤتمر جسر الأعمال الدولي نحو المهارات السورية — 30 تموز 2026، المكتبة الوطنية، دمشق. برعاية وزارة الاقتصاد والصناعة ووزارة الاتصالات وتقانة المعلومات.",
      },
      { property: "og:title", content: "جسر الأعمال الدولي نحو المهارات السورية" },
      {
        property: "og:description",
        content: "معاً نربط المهارات بالفرص ونبني مستقبل الأعمال والتكنولوجيا.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://aisyria.org/international-business-bridge" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/international-business-bridge" },
    ],
  }),
  component: IbbPage,
});

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-4 py-4 shadow-soft min-w-20 sm:min-w-24">
      <span className="text-3xl sm:text-5xl font-bold tabular-nums text-primary">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-xs sm:text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function IbbPage() {
  const { lang } = useLang();
  const l = (lang as Lang) === "en" ? "en" : "ar";
  const t = CONTENT[l];
  const dir = l === "ar" ? "rtl" : "ltr";
  const { days, hours, minutes, seconds, done } = useCountdown(TARGET_MS);

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 sm:pb-24">
        <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-primary/5 via-background to-background py-24 sm:py-32 md:py-40">
          <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <h1 className="relative z-10 text-center text-4xl font-extrabold leading-tight tracking-tight text-primary sm:text-6xl md:text-7xl">
            {t.title1}
            <br className="hidden sm:block" />
            <span className="text-foreground">{t.title2}</span>
          </h1>
          <p className="relative z-10 mx-auto mt-6 max-w-2xl text-center text-base text-muted-foreground sm:text-xl">
            {t.subtitle}
          </p>
        </section>

        <section className="mt-12">
          <p className="text-center text-lg sm:text-xl text-muted-foreground">
            {t.sponsors}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-20">
            <div className="flex flex-col items-center gap-3">
              <img
                src={ministryEconomy.url}
                alt={t.economyAlt}
                className="h-32 sm:h-40 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              <img
                src={ministryComms.url}
                alt={t.commsAlt}
                className="h-32 sm:h-40 w-auto object-contain"
              />
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold">
            {t.countdownTitle}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t.countdownSub}
          </p>
          {done ? (
            <p className="mt-6 text-center text-xl font-semibold text-primary">
              {t.started}
            </p>
          ) : (
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4" dir="ltr">
              <Cell value={days} label={t.days} />
              <Cell value={hours} label={t.hours} />
              <Cell value={minutes} label={t.minutes} />
              <Cell value={seconds} label={t.seconds} />
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold">
            {t.agendaTitle}
          </h2>
          <ol className="mx-auto mt-8 max-w-3xl space-y-3">
            {t.agenda.map((text, i) => {
              const Icon = AGENDA_ICONS[i] ?? Mic;
              return (
                <li
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pt-1.5 text-base sm:text-lg leading-relaxed">
                    <span className={`${l === "ar" ? "ml-2" : "mr-2"} text-sm font-semibold text-primary tabular-nums`}>
                      {String(i + 1).padStart(2, "0")}.
                    </span>
                    {text}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, ...t.metaTime },
              { icon: Calendar, ...t.metaDate },
              { icon: MapPin, ...t.metaPlace },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
