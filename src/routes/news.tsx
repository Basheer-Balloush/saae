import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "الأخبار والنشاطات — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      {
        name: "description",
        content: "آخر الأخبار والنشاطات للجمعية السورية للذكاء الصنعي وريادة الأعمال.",
      },
      { property: "og:title", content: "الأخبار والنشاطات" },
      {
        property: "og:description",
        content: "آخر الأخبار والنشاطات للجمعية السورية للذكاء الصنعي وريادة الأعمال.",
      },
    ],
  }),
  component: NewsPage,
});

type NewsRow = {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

function NewsPage() {
  const { t, dir, lang } = useLang();
  const isRtl = dir === "rtl";
  const [items, setItems] = useState<NewsRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("news")
      .select("id,title,excerpt,image_url,category,published_at")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
      });
  }, []);

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
            <p className="text-caption text-primary">{t.news.eyebrow}</p>
            <h1 className="mt-4 text-display-2 leading-[1.4] text-foreground">{t.news.title}</h1>
            <p className="mt-5 text-body text-muted-foreground">{t.news.subtitle}</p>
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
              {items.map((n, i) => (
                <Link
                  key={n.id}
                  to="/news/$id"
                  params={{ id: n.id }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    <img
                      src={n.image_url || FALLBACK_IMG}
                      alt={n.title}
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
                    <h3 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                      {n.title}
                    </h3>
                    {n.excerpt ? (
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {n.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      {t.news.readMore}
                      <ArrowUpRight className={isRtl ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                    </span>
                  </div>
                </motion.a>
              ))}
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
