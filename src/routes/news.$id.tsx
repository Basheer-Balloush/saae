import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/news-article.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { supabase } from "@/integrations/supabase/client";
import {
  NEWS_ARTICLE_COLUMNS,
  RELATED_NEWS_COLUMNS,
  applyArticle,
  renderArticle,
  renderArticleNotFound,
  type ArticleFragments,
  type NewsArticleRow,
  type RelatedNewsRow,
} from "@/lib/cinematic-db-content";

/* The hand-built stories' script: reveal-on-scroll and the image gallery. */
const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/news-tv-interview-inline.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
];

/* The template's own labels are Arabic; language.js translates them to English. */
const HTML_ATTRS = { "data-i18n-source": "ar" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_OG_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

type ArticleMeta = { title: string; description: string; image: string | null; publishedAt: string | null };

type LoaderData = { meta: ArticleMeta | null; fragments: ArticleFragments };

export const Route = createFileRoute("/news/$id")({
  loader: async ({ params }): Promise<LoaderData> => {
    const notFound: LoaderData = { meta: null, fragments: renderArticleNotFound() };
    if (!UUID.test(params.id)) return notFound;
    try {
      const { data } = await supabase
        .from("news")
        .select(NEWS_ARTICLE_COLUMNS)
        .eq("id", params.id)
        .maybeSingle();
      if (!data) return notFound;
      const article = data as unknown as NewsArticleRow;
      const cats = article.categories?.length ? article.categories : [article.category];
      const { data: rel } = await supabase
        .from("news")
        .select(RELATED_NEWS_COLUMNS)
        .or(`category.in.(${cats.join(",")}),categories.ov.{${cats.join(",")}}`)
        .neq("id", params.id)
        .order("published_at", { ascending: false })
        .limit(3);

      const title = article.title_en ?? article.title_ar ?? article.title ?? "News";
      const rawDesc = article.excerpt_en ?? article.excerpt_ar ?? article.excerpt ?? "";
      const fullDesc =
        rawDesc && rawDesc.length >= 50
          ? rawDesc
          : `${title} — ${rawDesc || "خبر من الجمعية السورية للذكاء الصنعي وريادة الأعمال (SAAE)."}`;
      const description = fullDesc.length > 160 ? `${fullDesc.slice(0, 157).trimEnd()}…` : fullDesc;
      return {
        meta: { title, description, image: article.image_url ?? null, publishedAt: article.published_at ?? null },
        fragments: renderArticle(article, (rel ?? []) as unknown as RelatedNewsRow[]),
      };
    } catch {
      return notFound;
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const url = `https://aisyria.org/news/${params.id}`;
    const title = m?.title ? `${m.title} — SAAE` : "News — SAAE";
    const description =
      m?.description ??
      "News article from the Syrian Association for AI & Entrepreneurship (SAAE) — read the latest activities and updates.";
    const image = m?.image ?? FALLBACK_OG_IMAGE;
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
        { name: "theme-color", content: "#144248" },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "stylesheet", href: "/cinematic/css/news-buildex-aleppo-inline.css" },
        { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
        { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
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
  component: Page,
});

function Page() {
  const { fragments } = Route.useLoaderData();
  const html = useMemo(() => applyArticle(pageHtml, fragments), [fragments]);
  return <CinematicPage html={html} scripts={SCRIPTS} htmlAttrs={HTML_ATTRS} />;
}
