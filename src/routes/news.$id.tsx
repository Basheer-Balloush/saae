import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";

import { PageV2 } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";
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
  loader: async ({
    params,
  }): Promise<{
    meta: null | {
      title: string;
      description: string;
      image: string | null;
      publishedAt: string | null;
    };
    article: NewsArticleLoader | null;
    related: RelatedItemLoader[];
  }> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    );
    if (!isUuid) return { meta: null, article: null, related: [] };
    try {
      const { data } = await supabase.from("news").select("*").eq("id", params.id).maybeSingle();
      if (!data) return { meta: null, article: null, related: [] };
      const article = data as unknown as NewsArticleLoader;
      const cats: string[] =
        article.categories && article.categories.length > 0
          ? article.categories
          : [article.category];
      const { data: rel } = await supabase
        .from("news")
        .select("id,title,title_ar,title_en,image_url,published_at,category,categories")
        .or(`category.in.(${cats.join(",")}),categories.ov.{${cats.join(",")}}`)
        .neq("id", params.id)
        .order("published_at", { ascending: false })
        .limit(3);

      const title = (article.title_en ?? article.title_ar ?? article.title ?? "News") as string;
      const rawDesc = (article.excerpt_en ?? article.excerpt_ar ?? article.excerpt ?? "") as string;
      const fullDesc =
        rawDesc && rawDesc.length >= 50
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
    const description =
      m?.description ??
      "News article from the Syrian Association for AI & Entrepreneurship (SAAE) — read the latest activities and updates.";
    const image =
      m?.image ??
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";
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
      links: [{ rel: "canonical", href: url }],
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

function pickLang<T>(
  ar: T | null | undefined,
  en: T | null | undefined,
  fallback: T | null | undefined,
  lang: "ar" | "en",
): T | null {
  if (lang === "ar") return (ar ?? en ?? fallback ?? null) as T | null;
  return (en ?? ar ?? fallback ?? null) as T | null;
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SY" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Plain-text body → paragraphs. Never HTML: the column is not sanitised. */
function renderContent(text: string) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>
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
  const { lang, dir, t } = useLang();
  const isRtl = dir === "rtl";
  const v = t.v2.news;
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

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  if (!article) {
    return (
      <PageV2>
        <div className="v2-shell v2-article-missing">
          <h1>{v.notFound}</h1>
          <Link to="/news" className="v2-back-link">
            <BackArrow className="v2-back-icon" aria-hidden="true" />
            {v.back}
          </Link>
        </div>
      </PageV2>
    );
  }

  const title = pickLang(article.title_ar, article.title_en, article.title, lang) || article.title;
  const lead = pickLang(article.excerpt_ar, article.excerpt_en, article.excerpt, lang) || "";
  const bodyText =
    pickLang(article.content_ar, article.content_en, article.content, lang) || lead || "";
  const dateStr = formatDate(article.published_at, lang);
  const tags = (
    (article.categories && article.categories.length > 0
      ? article.categories
      : [article.category]) ?? []
  ).filter(Boolean);

  const gallery = (article.images ?? []).filter(Boolean);
  // Build full carousel: cover + gallery (dedup)
  const carouselImages = Array.from(
    new Set([article.image_url, ...gallery].filter(Boolean) as string[]),
  );
  const videos = (article.videos ?? []).filter(Boolean);

  return (
    <PageV2>
      <div className="v2-shell">
        <header className="v2-article-head">
          <div className="v2-article-chips">
            {tags.map((c) => (
              <span key={c} className="v2-article-chip">
                {communityLabel(c, lang)}
              </span>
            ))}
          </div>
          <h1 className="v2-article-title">{title}</h1>
          <p className="v2-article-meta">
            <Calendar className="v2-article-meta-icon" aria-hidden="true" />
            <time dateTime={article.published_at}>{dateStr}</time>
          </p>
        </header>

        {carouselImages.length > 0 ? (
          <Reveal className="v2-article-media">
            {carouselImages.length === 1 ? (
              <figure className="v2-article-cover">
                <img
                  src={carouselImages[0]}
                  alt={title}
                  width={1600}
                  height={900}
                  decoding="async"
                />
              </figure>
            ) : (
              <Carousel
                opts={{ loop: true, direction: isRtl ? "rtl" : "ltr" }}
                className="v2-article-carousel"
              >
                <CarouselContent>
                  {carouselImages.map((url, i) => (
                    <CarouselItem key={url + i}>
                      <figure className="v2-article-cover">
                        <img
                          src={url}
                          alt={`${title} — ${i + 1}`}
                          width={1600}
                          height={900}
                          loading={i === 0 ? undefined : "lazy"}
                          decoding="async"
                        />
                      </figure>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="v2-carousel-btn !left-3 !right-auto" />
                <CarouselNext className="v2-carousel-btn !right-3 !left-auto" />
              </Carousel>
            )}
          </Reveal>
        ) : null}

        <article className="v2-article-body">
          {lead && bodyText !== lead ? <p className="v2-article-lead">{lead}</p> : null}
          {bodyText ? renderContent(bodyText) : <p className="v2-article-muted">{v.noContent}</p>}
        </article>

        {videos.length > 0 ? (
          <section className="v2-article-videos">
            <h2 className="v2-article-subhead">{v.videos}</h2>
            <div className="v2-article-video-stack">
              {videos.map((url) => (
                <video key={url} src={url} controls preload="metadata" />
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="v2-related">
            <h2 className="v2-related-heading">{v.related}</h2>
            <ul className="v2-related-grid">
              {related.map((r, i) => {
                const rTitle = pickLang(r.title_ar, r.title_en, r.title, lang) || r.title;
                return (
                  <li key={r.id}>
                    <Reveal delay={Math.min(i, 3) * 0.05}>
                      <Link to="/news/$id" params={{ id: r.id }} className="v2-related-card">
                        <span className="v2-related-media">
                          {r.image_url ? (
                            <img
                              src={r.image_url}
                              alt=""
                              width={800}
                              height={550}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="v2-news-placeholder" aria-hidden="true" />
                          )}
                          <span className="v2-related-veil" aria-hidden="true" />
                        </span>
                        <span className="v2-related-copy">
                          <time className="v2-related-time" dateTime={r.published_at}>
                            {formatDate(r.published_at, lang)}
                          </time>
                          <span className="v2-related-title">{rTitle}</span>
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="v2-article-foot">
          <Link to="/news" onClick={handleBack} className="v2-back-link">
            <BackArrow className="v2-back-icon" aria-hidden="true" />
            {v.back}
          </Link>
        </div>
      </div>
    </PageV2>
  );
}
