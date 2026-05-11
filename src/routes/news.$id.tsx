import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Calendar } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";

export const Route = createFileRoute("/news/$id")({
  head: () => ({
    meta: [
      { title: "News — SAAE" },
      { name: "description", content: "News article from SAAE." },
    ],
  }),
  component: NewsDetailPage,
});

const TEAL = "#048090";
const GREEN = "#698F3F";

type NewsArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

type RelatedItem = {
  id: string;
  title: string;
  image_url: string | null;
  published_at: string;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6 },
};

function estimateReadTime(text: string | null | undefined, lang: string): string {
  if (!text) return lang === "ar" ? "٣ دقائق" : "3 min";
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  if (lang === "ar") {
    const arNums = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const arMin = String(mins)
      .split("")
      .map((d) => arNums[parseInt(d)])
      .join("");
    return `${arMin} دقائق`;
  }
  return `${mins} min read`;
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SY" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Render paragraphs from plain text content */
function renderContent(text: string) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="mb-6 last:mb-0">
      {para.split("\n").map((line, j, arr) => (
        <span key={j}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ))}
    </p>
  ));
}

function NewsDetailPage() {
  const { id } = Route.useParams();
  const { lang, dir } = useLang();
  const isRtl = dir === "rtl";

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("news")
      .select("id,title,excerpt,content,image_url,category,published_at")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setArticle(data as NewsArticle | null);
        setLoading(false);
        if (data) {
          supabase
            .from("news")
            .select("id,title,image_url,published_at")
            .neq("id", id)
            .eq("category", data.category)
            .order("published_at", { ascending: false })
            .limit(4)
            .then(({ data: rel }) => setRelated((rel as RelatedItem[]) ?? []));
        }
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-32">
          <div className="mx-auto max-w-[850px] px-6">
            <div className="h-6 w-32 animate-pulse rounded bg-muted/40" />
            <div className="mt-6 h-12 w-3/4 animate-pulse rounded bg-muted/40" />
            <div className="mt-4 h-5 w-48 animate-pulse rounded bg-muted/40" />
            <div className="mt-10 aspect-[16/9] animate-pulse rounded-lg bg-muted/40" />
            <div className="mt-10 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/40" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[60vh] items-center justify-center pt-24">
          <div className="text-center">
            <h1
              className="text-3xl font-black"
              style={{ fontFamily: '"Cairo", system-ui, sans-serif' }}
            >
              {lang === "ar" ? "المقال غير موجود" : "Article not found"}
            </h1>
            <Link
              to="/news"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: TEAL }}
            >
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {lang === "ar" ? "العودة للأخبار" : "Back to news"}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const bodyText = article.content || article.excerpt || "";
  const readTime = estimateReadTime(bodyText, lang);
  const dateStr = formatDate(article.published_at, lang);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-24 lg:pt-32 lg:pb-32">
        {/* ── Hero Section ── */}
        <motion.header {...fade} className="mx-auto max-w-[850px] px-6 text-center">
          {/* Category pill */}
          <span
            className="inline-block rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white"
            style={{ backgroundColor: GREEN }}
          >
            {communityLabel(article.category, lang)}
          </span>

          {/* Title */}
          <h1
            className="mx-auto mt-7 max-w-3xl leading-[1.35]"
            style={{
              fontFamily: '"Cairo", system-ui, sans-serif',
              fontWeight: 900,
              fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)",
              color: "var(--foreground)",
            }}
          >
            {article.title}
          </h1>

          {/* Date & reading time */}
          <div className="mt-5 flex items-center justify-center gap-6 text-sm" style={{ color: "#999" }}>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
              {dateStr}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              {readTime}
            </span>
          </div>
        </motion.header>

        {/* ── Featured Image ── */}
        <motion.div
          {...fade}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-12 max-w-5xl px-6"
        >
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: "1px solid #e0e0e0" }}
          >
            <img
              src={article.image_url || FALLBACK_IMG}
              alt={article.title}
              className="h-auto w-full object-cover"
              style={{ maxHeight: 520 }}
            />
          </div>
        </motion.div>

        {/* ── Editorial Body ── */}
        <motion.article
          {...fade}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-14 max-w-[850px] px-6"
          style={{
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.8,
            color: "var(--foreground)",
          }}
        >
          {bodyText ? (
            renderContent(bodyText)
          ) : (
            <p style={{ color: "#999" }}>
              {lang === "ar" ? "لا يوجد محتوى بعد." : "No content available yet."}
            </p>
          )}
        </motion.article>

        {/* ── Related News Widget ── */}
        {related.length > 0 && (
          <motion.section
            {...fade}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-24 max-w-[850px] px-6"
          >
            <div
              className="mb-8 flex items-center gap-4"
              style={{ borderBottom: `1px solid ${TEAL}`, paddingBottom: 12 }}
            >
              <h2
                style={{
                  fontFamily: '"Cairo", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  color: "var(--foreground)",
                }}
              >
                {lang === "ar" ? "أخبار ذات صلة" : "Related News"}
              </h2>
            </div>

            <div className="space-y-0">
              {related.map((r, i) => (
                <Link
                  key={r.id}
                  to="/news/$id"
                  params={{ id: r.id }}
                  className="group flex items-start gap-5 border-b border-border/40 py-5 transition-colors hover:bg-muted/20"
                >
                  {/* Thumbnail — 30% */}
                  <div className="w-[30%] flex-none">
                    <div className="aspect-[16/10] overflow-hidden rounded-md">
                      <img
                        src={r.image_url || FALLBACK_IMG}
                        alt={r.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "#999" }}>
                      {formatDate(r.published_at, lang)}
                    </p>
                  </div>

                  {/* Title — remaining */}
                  <div className="flex flex-1 flex-col justify-center pt-1">
                    <h3
                      className="line-clamp-2 transition-colors group-hover:text-primary"
                      style={{
                        fontFamily: '"Cairo", system-ui, sans-serif',
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        lineHeight: 1.5,
                        color: "var(--foreground)",
                      }}
                    >
                      {r.title}
                    </h3>
                    <span
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: TEAL }}
                    >
                      {lang === "ar" ? "اقرأ المزيد" : "Read more"}
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 ${isRtl ? "-scale-x-100" : ""}`}
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Back to news */}
        <div className="mx-auto mt-16 max-w-[850px] px-6 text-center">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {lang === "ar" ? "العودة للأخبار" : "Back to news"}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
