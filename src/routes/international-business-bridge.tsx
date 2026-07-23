import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import ministryEconomy from "@/assets/ministry-economy.png.asset.json";
import ministryComms from "@/assets/ministry-communications.png.asset.json";
import agenda from "@/assets/ibb-agenda.jpg.asset.json";

// 30 July 2026, 11:00 AM Damascus time (UTC+3, no DST)
const TARGET_MS = Date.UTC(2026, 6, 30, 8, 0, 0);

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
      { property: "og:image", content: `https://aisyria.org${agenda.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://aisyria.org${agenda.url}` },
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
  const { days, hours, minutes, seconds, done } = useCountdown(TARGET_MS);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-center text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          جسر الأعمال الدولي نحو المهارات السورية
        </h1>

        <section className="mt-12">
          <p className="text-center text-lg sm:text-xl text-muted-foreground">
            برعاية كريمة من:
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-20">
            {/* Right (RTL first) — Ministry of Economy & Industry */}
            <div className="flex flex-col items-center gap-3">
              <img
                src={ministryEconomy.url}
                alt="وزارة الاقتصاد والصناعة"
                className="h-32 sm:h-40 w-auto object-contain"
              />
            </div>
            {/* Left — Ministry of Communications */}
            <div className="flex flex-col items-center gap-3">
              <img
                src={ministryComms.url}
                alt="وزارة الاتصالات وتقانة المعلومات"
                className="h-32 sm:h-40 w-auto object-contain"
              />
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold">
            العد التنازلي حتى انطلاق المؤتمر
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            30 تموز 2026 — 11:00 صباحاً بتوقيت دمشق
          </p>
          {done ? (
            <p className="mt-6 text-center text-xl font-semibold text-primary">
              انطلق المؤتمر!
            </p>
          ) : (
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4" dir="ltr">
              <Cell value={days} label="أيام" />
              <Cell value={hours} label="ساعات" />
              <Cell value={minutes} label="دقائق" />
              <Cell value={seconds} label="ثواني" />
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold">
            محاور المؤتمر
          </h2>
          <div className="mt-8 flex justify-center">
            <img
              src={agenda.url}
              alt="أجندة مؤتمر جسر الأعمال الدولي نحو المهارات السورية"
              className="w-full max-w-3xl rounded-2xl border border-border shadow-soft"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
