import { useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type NewsArticleLoader = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  content: string | null;
  content_ar: string | null;
  content_en: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  category: string;
  categories: string[] | null;
  published_at: string;
};

type RelatedItemLoader = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  image_url: string | null;
  published_at: string;
};

export const Route = createFileRoute("/news/$id")({
  loader: async ({ params }): Promise<{
    meta: null | { title: string; description: string; image: string | null; publishedAt: string | null };
    article: NewsArticleLoader | null;
    related: RelatedItemLoader[];
  }> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    if (!isUuid) return { meta: null, article: null, related: [] };
    try {
      const { data } = await supabase
        .from("news")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      if (!data) return { meta: null, article: null, related: [] };
      const article = data as unknown as NewsArticleLoader;
      const cats: string[] = (article.categories && article.categories.length > 0) ? article.categories : [article.category];
      const { data: rel } = await supabase
        .from("news")
        .select("id,title,title_ar,title_en,image_url,published_at,category,categories")
        .or(`category.in.(${cats.join(",")}),categories.ov.{${cats.join(",")}}`)
        .neq("id", params.id)
        .order("published_at", { ascending: false })
        .limit(3);

      const title = (article.title_en ?? article.title_ar ?? article.title ?? "News") as string;
      const rawDesc = (article.excerpt_en ?? article.excerpt_ar ?? article.excerpt ?? "") as string;
      const fullDesc = rawDesc && rawDesc.length >= 50
        ? rawDesc
        : `${title} — ${rawDesc || "خبر من الجمعية السورية للذكاء الصنعي وريادة الأعمال (SAAE)."}`;
      const description = fullDesc.length > 160 ? `${fullDesc.slice(0, 157).trimEnd()}…` : fullDesc;
      return {
        meta: {
          title,
          description,
          image: article.image_url ?? null,
          publishedAt: article.published_at ?? null,
        },
        article,
        related: (rel ?? []) as unknown as RelatedItemLoader[],
      };
    } catch {
      return { meta: null, article: null, related: [] };
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const url = `https://aisyria.org/news/${params.id}`;
    const title = m?.title ? `${m.title} — SAAE` : "News — SAAE";
    const description = m?.description ?? "News article from the Syrian Association for AI & Entrepreneurship (SAAE) — read the latest activities and updates.";
    const image = m?.image ?? "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ],
      links: [
        { rel: "canonical", href: url },
      ],
      scripts: m
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: m.title,
                description,
                image: image ? [image] : undefined,
                datePublished: m.publishedAt ?? undefined,
                url,
              }),
            },
          ]
        : undefined,
    };
  },
  component: NewsDetailPage,
});

const TEAL = "#048090";
const GREEN = "#698F3F";

type NewsArticle = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  content: string | null;
  content_ar: string | null;
  content_en: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  category: string;
  categories: string[] | null;
  published_at: string;
};

type RelatedItem = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  image_url: string | null;
  published_at: string;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const STATIC_ARTICLE: NewsArticle = {
  id: "static",
  title: "SAAE — News",
  title_ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
  title_en: "Syrian Association for AI & Entrepreneurship",
  excerpt: null,
  excerpt_ar: "محتوى تعريفي عن نشاطات الجمعية ومجتمعاتها.",
  excerpt_en: "Introductory content about SAAE activities and communities.",
  content: null,
  content_ar:
    "نعمل في الجمعية السورية للذكاء الاصطناعي وريادة الأعمال على بناء بيئةٍ علميةٍ وتقنيةٍ تجمع الباحثين والمطورين ورواد الأعمال لخدمة سوريا الجديدة.",
  content_en:
    "The Syrian Association for AI & Entrepreneurship (SAAE) builds a scientific and technical environment connecting researchers, developers and entrepreneurs to serve the new Syria.",
  image_url: FALLBACK_IMG,
  images: null,
  videos: null,
  category: "research",
  categories: ["research"],
  published_at: new Date().toISOString(),
};

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
  transition: { duration: 0.6 },
};

function pickLang<T>(ar: T | null | undefined, en: T | null | undefined, fallback: T | null | undefined, lang: "ar" | "en"): T | null {
  if (lang === "ar") return (ar ?? en ?? fallback ?? null) as T | null;
  return (en ?? ar ?? fallback ?? null) as T | null;
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
  const router = useRouter();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  const handleBack = (e: React.MouseEvent) => {
    if (canGoBack) {
      e.preventDefault();
      router.history.back();
      // After the previous page restores, force scroll to top
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 0);
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 120);
    }
  };

  const loaderData = Route.useLoaderData();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const article: NewsArticle | null = isUuid
    ? ((loaderData.article as unknown as NewsArticle | null) ?? null)
    : STATIC_ARTICLE;
  const related: RelatedItem[] = (loaderData.related as unknown as RelatedItem[]) ?? [];



  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[60vh] items-center justify-center pt-24">
          <div className="text-center">
            <h1 className="text-3xl font-black" style={{ fontFamily: '"Cairo", system-ui, sans-serif' }}>
              {lang === "ar" ? "المقال غير موجود" : "Article not found"}
            </h1>
            <Link to="/news" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TEAL }}>
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {lang === "ar" ? "العودة للأخبار" : "Back to news"}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = pickLang(article.title_ar, article.title_en, article.title, lang) || article.title;
  const bodyText = pickLang(article.content_ar, article.content_en, article.content, lang) || pickLang(article.excerpt_ar, article.excerpt_en, article.excerpt, lang) || "";
  const dateStr = formatDate(article.published_at, lang);

  const gallery = (article.images ?? []).filter(Boolean);
  // Build full carousel: cover + gallery (dedup)
  const carouselImages = Array.from(new Set([article.image_url, ...gallery].filter(Boolean) as string[]));
  const videos = (article.videos ?? []).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-24 lg:pt-32 lg:pb-32">
        <motion.header {...fade} className="mx-auto max-w-[850px] px-6 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {((article.categories && article.categories.length > 0 ? article.categories : [article.category]).filter(Boolean)).map((c) => (
              <span
                key={c}
                className="inline-block rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white"
                style={{ backgroundColor: GREEN }}
              >
                {communityLabel(c, lang)}
              </span>
            ))}
          </div>

          <h1
            className="mx-auto mt-7 max-w-3xl leading-[1.35]"
            style={{
              fontFamily: '"Cairo", system-ui, sans-serif',
              fontWeight: 900,
              fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)",
              color: "var(--foreground)",
            }}
          >
            {title}
          </h1>

          <div className="mt-5 flex items-center justify-center gap-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
              {dateStr}
            </span>
          </div>
        </motion.header>

        {/* ── Image Carousel ── */}
        {carouselImages.length > 0 && (
          <motion.div
            {...fade}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-12 max-w-5xl px-6"
          >
            {carouselImages.length === 1 ? (
              <div className="overflow-hidden rounded-lg" style={{ border: "1px solid #e0e0e0" }}>
                <img
                  src={carouselImages[0]}
                  alt={title}
                  className="h-auto w-full object-cover"
                  style={{ maxHeight: 520 }}
                />
              </div>
            ) : (
              <Carousel opts={{ loop: true, direction: isRtl ? "rtl" : "ltr" }} className="w-full">
                <CarouselContent>
                  {carouselImages.map((url, i) => (
                    <CarouselItem key={url + i}>
                      <div className="overflow-hidden rounded-lg" style={{ border: "1px solid #e0e0e0" }}>
                        <img
                          src={url}
                          alt={`${title} — ${i + 1}`}
                          className="h-auto w-full object-cover"
                          style={{ maxHeight: 520 }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="h-7 w-7 lg:h-8 lg:w-8 left-1 lg:-left-12 [&_svg]:h-3.5 [&_svg]:w-3.5" />
                <CarouselNext className="h-7 w-7 lg:h-8 lg:w-8 right-1 lg:-right-12 [&_svg]:h-3.5 [&_svg]:w-3.5" />
              </Carousel>
            )}
          </motion.div>
        )}

        {/* ── Body ── */}
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
            <p style={{ color: "var(--muted-foreground)" }}>
              {lang === "ar" ? "لا يوجد محتوى بعد." : "No content available yet."}
            </p>
          )}
        </motion.article>

        {/* ── Videos ── */}
        {videos.length > 0 && (
          <motion.section
            {...fade}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-16 max-w-[850px] px-6"
          >
            <div className="mb-6 flex items-center gap-4" style={{ borderBottom: `1px solid ${TEAL}`, paddingBottom: 12 }}>
              <h2 style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 800, fontSize: "1.25rem" }}>
                {lang === "ar" ? "فيديوهات" : "Videos"}
              </h2>
            </div>
            <div className="space-y-6">
              {videos.map((url) => (
                <video
                  key={url}
                  src={url}
                  controls
                  preload="metadata"
                  className="w-full rounded-lg"
                  style={{ border: "1px solid #e0e0e0", maxHeight: 560 }}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Related News ── */}
        {related.length > 0 && (
          <motion.section
            {...fade}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-24 max-w-[850px] px-6"
            style={{ borderTop: `2px solid ${TEAL}`, paddingTop: 32 }}
          >
            <div className="mb-8 flex items-center gap-4">
              <h2 style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 800, fontSize: "1.25rem", color: "var(--foreground)" }}>
                {lang === "ar" ? "أخبار ذات صلة" : "Related News"}
              </h2>
            </div>

            <div className="space-y-0">
              {related.map((r) => {
                const rTitle = pickLang(r.title_ar, r.title_en, r.title, lang) || r.title;
                return (
                  <Link
                    key={r.id}
                    to="/news/$id"
                    params={{ id: r.id }}
                    className="group flex items-start gap-5 border-b border-border/40 py-5 transition-colors hover:bg-muted/20"
                  >
                    <div className="w-[30%] flex-none">
                      <div className="aspect-[16/10] overflow-hidden rounded-md">
                        <img
                          src={r.image_url || FALLBACK_IMG}
                          alt={rTitle}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      </div>
                      <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {formatDate(r.published_at, lang)}
                      </p>
                    </div>
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
                        {rTitle}
                      </h3>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
                        {lang === "ar" ? "اقرأ المقال كاملاً" : "Read full article"}
                        <ArrowUpRight className={`h-3.5 w-3.5 ${isRtl ? "-scale-x-100" : ""}`} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        <div className="mx-auto mt-16 max-w-[850px] px-6 text-center">
          <Link
            to="/news"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {lang === "ar" ? "رجوع" : "Back"}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
