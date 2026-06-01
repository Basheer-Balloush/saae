import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";
import { LogoParticles } from "./LogoParticles";

const SCROLL_KEY = "saae-news-marquee-offset";

const IMG = {
  featured: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
  a: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80",
  b: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  c: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=900&q=80",
  d: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=900&q=80",
  e: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80",
  f: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80",
  g: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80",
};

type Slide = { key: string; img: string; cat: string; title: string; date: string; id?: string };
export type HomeNewsRow = {
  id: string;
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

function mapNewsRows(rows: HomeNewsRow[], lang: "ar" | "en"): Slide[] {
  return rows.map((r) => ({
    key: r.id,
    id: r.id,
    img: r.image_url || IMG.featured,
    cat: communityLabel(r.category, lang),
    title: (lang === "ar" ? (r.title_ar ?? r.title_en) : (r.title_en ?? r.title_ar)) ?? r.title ?? "",
    date: r.published_at,
  }));
}

export function FeaturedNews({ initialNews }: { initialNews?: HomeNewsRow[] }) {
  const { t, dir, lang } = useLang();
  const cats = t.news.categories;
  const items = t.news.items;

  const [slides, setSlides] = useState<Slide[] | null>(() => initialNews ? mapNewsRows(initialNews, lang) : null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialNews) {
      setSlides(mapNewsRows(initialNews, lang));
      return;
    }
    supabase
      .from("news")
      .select("id,title,title_ar,title_en,image_url,category,published_at")
      .eq("show_on_home", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setSlides(mapNewsRows((data ?? []) as HomeNewsRow[], lang));
      });
  }, [initialNews, lang]);

  // Restore marquee position when returning from a news detail page.
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;
    const savedPx = parseFloat(raw);
    if (!Number.isFinite(savedPx)) return;
    const row = rowRef.current;
    if (!row) return;
    // Wait for layout/images so scrollWidth is accurate.
    const apply = () => {
      const cycle = row.scrollWidth / 2; // duplicated row
      if (!cycle) return;
      const pct = Math.min(Math.max(savedPx / cycle, 0), 1);
      // CSS animation runs 60s, translates 0 → -50%. delay = -(pct * 60s).
      row.style.animationDelay = `-${(pct * 60).toFixed(3)}s`;
      sessionStorage.removeItem(SCROLL_KEY);
    };
    const id = window.setTimeout(apply, 50);
    return () => window.clearTimeout(id);
  }, [slides, dir]);

  const saveOffset = () => {
    const row = rowRef.current;
    if (!row) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    // translateX is negative while marquee moves left; for RTL it goes the other way.
    const offset = Math.abs(m.m41);
    try { sessionStorage.setItem(SCROLL_KEY, String(offset)); } catch {}
  };

  // Hide section entirely until we have published news to show
  if (!slides || slides.length === 0) return null;

  const row = [...slides, ...slides];

  return (
    <section id="news" aria-labelledby="news-heading" className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
      <h1 className="sr-only">
        {lang === "ar"
          ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — نبني مستقبل سوريا الرقمي"
          : "Syrian Association for AI & Entrepreneurship — Building Syria's Digital Future"}
      </h1>

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 grid gap-8 lg:mb-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12"
        >
        <div className="order-2 max-w-2xl lg:order-1">
            <h1 className="mt-4 text-display-2 leading-[1.5] text-foreground">{t.news.title}</h1>
            <p className="mt-5 max-w-xl text-body text-muted-foreground">{t.news.subtitle}</p>
          </div>
          <div className={`order-1 flex justify-center lg:order-2 ${dir === "rtl" ? "lg:justify-start lg:-ml-8 lg:pl-0" : "lg:justify-end lg:-mr-8 lg:pr-0"}`}>
            <LogoParticles size={200} className="hidden sm:block" />
            <LogoParticles size={150} className="sm:hidden" />
          </div>
        </motion.div>
      </div>

      <div dir="ltr" className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div ref={rowRef} className={`flex w-max gap-6 hover:[animation-play-state:paused] ${dir === "rtl" ? "animate-[news-marquee-rtl_60s_linear_infinite]" : "animate-[news-marquee_60s_linear_infinite]"}`}>
          {row.map((c, i) => {
            const cardClass = "group flex w-[78vw] max-w-[320px] flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift sm:w-[340px] sm:max-w-none lg:w-[360px]";
            const inner = (
              <>
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    width={800}
                    height={600}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                      {c.cat}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">{c.date}</span>
                  </div>
                  <h3 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                    {c.title}
                  </h3>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {t.news.readMore}
                    <ArrowUpRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                  </span>
                </div>
              </>
            );
            return (
              <Link key={`${c.key}-${i}`} to="/news/$id" params={{ id: c.id! }} onClick={saveOffset} className={cardClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl justify-center px-6 lg:px-10">
        <Link
          to="/news"
          className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {t.news.viewAll}
          <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
        </Link>
      </div>

      <style>{`
        @keyframes news-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes news-marquee-rtl {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
