import { useEffect, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";

import { PageV2 } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";

export const Route = createFileRoute("/news/")({
  loader: async () => {
    const { data } = await supabase
      .from("news")
      .select("id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,image_url,category,categories,published_at")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });
    return { items: (data ?? []) as NewsRow[] };
  },
  head: () => ({
    meta: [
      { title: "الأخبار والنشاطات — SAAE" },
      {
        name: "description",
        content: "آخر الأخبار والنشاطات والفعاليات للجمعية السورية للذكاء الصنعي وريادة الأعمال ومجتمعاتها المتخصصة.",
      },
      { property: "og:title", content: "أخبار الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      {
        property: "og:description",
        content: "تابع أحدث الفعاليات والأنشطة والمبادرات التي تنظمها SAAE ومجتمعاتها المتخصصة في الذكاء الصنعي وريادة الأعمال.",
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
  categories: string[] | null;
  published_at: string;
};

function pick(ar: string | null, en: string | null, fallback: string | null, lang: "ar" | "en"): string {
  if (lang === "ar") return ar || en || fallback || "";
  return en || ar || fallback || "";
}

function formatDate(iso: string, lang: "ar" | "en"): string {
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

function tagsOf(row: { categories: string[] | null; category: string }): string[] {
  return ((row.categories && row.categories.length > 0 ? row.categories : [row.category]) ?? []).filter(Boolean);
}

/** Small inline arrow, matching the prototype's CTA glyph. */
function CtaArrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 15 15 5M7 5h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NewsPage() {
  const { lang } = useLang();
  const items = Route.useLoaderData().items as NewsRow[];
  const location = useLocation();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const v = useLang().t.v2.news;

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

  const [featured, ...rest] = items;

  return (
    <PageV2>
      <div className="v2-shell v2-news-head">
        <Reveal>
          <p className="v2-eyebrow">{v.eyebrow}</p>
          <h1 className="v2-news-title">{v.title}</h1>
          <p className="v2-news-intro">{v.intro}</p>
          <div className="v2-rule" aria-hidden="true" />
        </Reveal>
      </div>

      <div className="v2-shell v2-news-body">
        {items.length === 0 ? (
          <p className="v2-news-empty">{v.empty}</p>
        ) : (
          <>
            {featured ? (
              <Reveal>
                <article
                  id={`news-card-${featured.id}`}
                  className={`v2-featured${highlightId === featured.id ? " is-highlight" : ""}`}
                >
                  <div className="v2-featured-media">
                    {featured.image_url ? (
                      <img
                        src={featured.image_url}
                        alt=""
                        width={1200}
                        height={900}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <span className="v2-news-placeholder" aria-hidden="true" />
                    )}
                    <span className="v2-featured-veil" aria-hidden="true" />
                  </div>
                  <div className="v2-featured-copy">
                    <p className="v2-news-meta">
                      {tagsOf(featured).slice(0, 2).map((c) => (
                        <span key={c} className="v2-news-tag">
                          {communityLabel(c, lang)}
                        </span>
                      ))}
                      <time dateTime={featured.published_at}>{formatDate(featured.published_at, lang)}</time>
                    </p>
                    <h2 className="v2-featured-headline">
                      {pick(featured.title_ar, featured.title_en, featured.title, lang)}
                    </h2>
                    {pick(featured.excerpt_ar, featured.excerpt_en, featured.excerpt, lang) ? (
                      <p className="v2-news-excerpt is-lead">
                        {pick(featured.excerpt_ar, featured.excerpt_en, featured.excerpt, lang)}
                      </p>
                    ) : null}
                    <Link className="v2-news-cta" to="/news/$id" params={{ id: featured.id }}>
                      <span>{v.readStory}</span>
                      <CtaArrow />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ) : null}

            {rest.length > 0 ? (
              <ul className="v2-story-grid">
                {rest.map((n, i) => {
                  const title = pick(n.title_ar, n.title_en, n.title, lang);
                  const excerpt = pick(n.excerpt_ar, n.excerpt_en, n.excerpt, lang);
                  return (
                    <li key={n.id} id={`news-card-${n.id}`}>
                      <Reveal
                        className={`v2-story${highlightId === n.id ? " is-highlight" : ""}`}
                        delay={Math.min(i, 8) * 0.04}
                      >
                        <Link to="/news/$id" params={{ id: n.id }} className="v2-story-link">
                          <span className="v2-story-media">
                            {n.image_url ? (
                              <img
                                src={n.image_url}
                                alt=""
                                width={800}
                                height={1000}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : (
                              <span className="v2-news-placeholder" aria-hidden="true" />
                            )}
                            <span className="v2-story-veil" aria-hidden="true" />
                          </span>
                          <span className="v2-story-copy">
                            <span className="v2-news-meta">
                              {tagsOf(n).slice(0, 1).map((c) => (
                                <span key={c} className="v2-news-tag">
                                  {communityLabel(c, lang)}
                                </span>
                              ))}
                              <time dateTime={n.published_at}>{formatDate(n.published_at, lang)}</time>
                            </span>
                            <span className="v2-story-headline">{title}</span>
                            {excerpt ? <span className="v2-news-excerpt">{excerpt}</span> : null}
                            <span className="v2-news-cta as-static">
                              <span>{v.readStory}</span>
                              <CtaArrow />
                            </span>
                          </span>
                        </Link>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </PageV2>
  );
}
