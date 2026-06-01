import { useEffect, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "الأخبار والنشاطات — SAAE" },
      {
        name: "description",
        content: "آخر الأخبار والنشاطات والفعاليات للجمعية السورية للذكاء الصنعي وريادة الأعمال ومجتمعاتها المتخصصة.",
      },
      { property: "og:title", content: "الأخبار والنشاطات — SAAE" },
      {
        property: "og:description",
        content: "آخر الأخبار والنشاطات والفعاليات للجمعية السورية للذكاء الصنعي وريادة الأعمال ومجتمعاتها المتخصصة.",
      },
      { property: "og:url", content: "https://aisyria.org/news" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/news" },
    ],
  }),
  component: NewsPage,
});

type NewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

function pick(ar: string | null, en: string | null, fallback: string | null, lang: "ar" | "en"): string {
  if (lang === "ar") return ar || en || fallback || "";
  return en || ar || fallback || "";
}

function NewsPage() {
  const { t, dir, lang } = useLang();
  const isRtl = dir === "rtl";
  const [items, setItems] = useState<NewsRow[] | null>(null);
  const location = useLocation();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("news")
      .select("id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,image_url,category,published_at")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as NewsRow[]);
      });
  }, []);

  useEffect(() => {
    const hash = location.hash?.replace(/^#/, "");
    if (!hash || !items || items.length === 0) return;
    let cancelled = false;
    let attempts = 0;
    const tryRun = () => {
      if (cancelled) return;
      const el = document.getElementById(`news-card-${hash}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(hash);
        window.setTimeout(() => {
          if (!cancelled) setHighlightId(null);
        }, 1600);
        return;
      }
      if (attempts++ < 40) window.setTimeout(tryRun, 50);
    };
    tryRun();
    return () => {
      cancelled = true;
    };
  }, [location.hash, items]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-24 lg:pt-28 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 max-w-2xl"
          >
            <h1 className="mt-4 text-display-2 leading-[2.1] text-foreground">
              {lang === "ar" ? "جميع الأخبار والنشاطات" : "All news & activities"}
            </h1>
            <p className="mt-5 text-body text-muted-foreground">
              {lang === "ar"
                ? "أرشيف كامل لأخبار ونشاطات الجمعية السورية للذكاء الاصطناعي وريادة الأعمال."
                : "The full archive of news and activities from the Syrian Association for AI & Entrepreneurship."}
            </p>
          </motion.div>

          {items === null ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[380px] animate-pulse rounded-2xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-body text-muted-foreground">
                {lang === "ar" ? "لا توجد أخبار حالياً." : "No news yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((n) => {
                const title = pick(n.title_ar, n.title_en, n.title, lang);
                const excerpt = pick(n.excerpt_ar, n.excerpt_en, n.excerpt, lang);
                const isHighlight = highlightId === n.id;
                return (
                  <Link
                    key={n.id}
                    id={`news-card-${n.id}`}
                    to="/news/$id"
                    params={{ id: n.id }}
                    className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:shadow-lift ${
                      isHighlight
                        ? "border-primary ring-2 ring-primary/60 shadow-lift scale-[1.01]"
                        : "border-border"
                    }`}
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={n.image_url || FALLBACK_IMG}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                          {communityLabel(n.category, lang)}
                        </span>
                        <span className="text-muted-foreground">{n.published_at}</span>
                      </div>
                      <h2 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                        {title}
                      </h2>
                      {excerpt ? (
                        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                          {excerpt}
                        </p>
                      ) : null}
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        {t.news.readMore}
                        <ArrowUpRight className={isRtl ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-16 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {lang === "ar" ? "العودة إلى الرئيسية" : "Back to home"}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
