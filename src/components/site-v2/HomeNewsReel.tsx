import { useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";
import { V2Link } from "./V2Link";
import type { HomeNewsRow } from "@/components/site/FeaturedNews";
import {
  COMMUNITY_LABELS_AR,
  COMMUNITY_LABELS_EN,
  type CommunityKey,
} from "@/lib/communityCategories";

function categoryLabel(category: string | null, isAr: boolean) {
  if (!category) return null;
  const key = category as CommunityKey;
  const map = isAr ? COMMUNITY_LABELS_AR : COMMUNITY_LABELS_EN;
  return map[key] ?? category;
}

export function HomeNewsReel({ news }: { news: HomeNewsRow[] }) {
  const { t, lang } = useLang();
  const h = t.v2.home;
  const isAr = lang === "ar";

  if (news.length === 0) return null;

  const formatDate = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(isAr ? "ar" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <section id="news" className="v2-home-section">
      <div className="v2-shell">
        <Reveal>
          <p className="v2-eyebrow">{h.newsEyebrow}</p>
          <h2 className="v2-section-title">{h.newsTitle}</h2>
          <p className="v2-section-intro">{h.newsCopy}</p>
        </Reveal>
      </div>

      <div className="v2-shell">
        <ul className="v2-news-reel">
          {news.map((row) => {
            const title = (isAr ? row.title_ar : row.title_en) || row.title;
            const tag = categoryLabel(row.category, isAr);
            return (
              <li key={row.id} className="v2-news-card">
                <V2Link to="/news/$id" params={{ id: row.id }} className="v2-news-link">
                  <span className="v2-news-media">
                    {row.image_url ? (
                      <img src={row.image_url} alt="" loading="lazy" />
                    ) : (
                      <span className="v2-news-placeholder" aria-hidden="true" />
                    )}
                  </span>
                  <span className="v2-news-body">
                    <span className="v2-news-meta">
                      {tag ? <span className="v2-news-tag">{tag}</span> : null}
                      <span className="v2-news-date">{formatDate(row.published_at)}</span>
                    </span>
                    <span className="v2-news-title">{title}</span>
                  </span>
                </V2Link>
              </li>
            );
          })}

          <li className="v2-news-card is-all">
            <V2Link to="/news" className="v2-news-link v2-news-all">
              <span className="v2-news-title">{h.newsAllTitle}</span>
              <span className="v2-news-copy">{h.newsAllCopy}</span>
              <span className="v2-news-allcta">{h.newsAllCta}</span>
            </V2Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default HomeNewsReel;
