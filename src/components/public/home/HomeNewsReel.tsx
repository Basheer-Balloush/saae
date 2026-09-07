import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { communityLabel } from "@/lib/communityCategories";

export type PublicNewsRow = {
  id: string;
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

const TINTS = ["4, 128, 144", "105, 143, 63", "0, 139, 157", "249, 156, 0"];
const FALLBACK_IMAGE = "/site/images/hero-static.jpg";

const arrow = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function HomeNewsReel({ news }: { news: PublicNewsRow[] }) {
  const { lang } = useLang();
  const isArabic = lang === "ar";
  const items = news.slice(0, 4);
  const slideCount = items.length + 1;

  const pick = (ar: string | null, en: string | null, fallback: string | null) =>
    (isArabic ? (ar ?? en) : (en ?? ar)) ?? fallback ?? "";

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(isArabic ? "ar" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <section className="section news" id="news" aria-labelledby="news-title">
      <div className="page-shell">
        <div className="section-heading reveal">
          <p className="eyebrow">{isArabic ? "آخر الأخبار" : "Latest news"}</p>
          <h2 id="news-title" className="photo-head">
            {isArabic ? "العمل كما يحدث" : "The work, as it happens"}
          </h2>
          <p>
            {isArabic
              ? "قاعات التدريب والبرامج الوطنية والإطلاقات العامة — السجل الجاري لما تبنيه الجمعية."
              : "Training rooms, national broadcasts and public launches — the running record of what SAAE is building."}
          </p>
        </div>
      </div>

      <div className="flow-reel flow-reel-news" id="news-reel">
        <div className="flow-screen" id="news-screen">
          <div
            className="flow flow-news reveal"
            id="news-flow"
            data-flow="news"
            role="region"
            aria-roledescription="carousel"
            aria-label={isArabic ? "آخر الأخبار" : "Latest news"}
            tabIndex={0}
          >
            <span className="flow-glow" aria-hidden="true" />

            <div className="flow-view">
              <div className="flow-stage">
                <ul className="flow-track" id="news-track">
                  {items.map((item, index) => (
                    <li className="flow-slide news-slide" data-tint={TINTS[index % TINTS.length]} key={item.id}>
                      <article className="news-card">
                        <img
                          className="news-photo"
                          src={item.image_url || FALLBACK_IMAGE}
                          alt={pick(item.title_ar, item.title_en, item.title)}
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                        />
                        <span className="news-veil" aria-hidden="true" />
                        <div className="news-copy">
                          <p className="news-meta">
                            <span className="news-tag">{communityLabel(item.category, lang)}</span>
                            <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
                          </p>
                          <h3 className="news-headline">{pick(item.title_ar, item.title_en, item.title)}</h3>
                          <p className="news-excerpt">{pick(item.excerpt_ar, item.excerpt_en, item.excerpt)}</p>
                          <Link className="news-cta" to="/news/$id" params={{ id: item.id }}>
                            {isArabic ? "اقرأ الخبر" : "Read the story"} {arrow}
                          </Link>
                        </div>
                      </article>
                    </li>
                  ))}

                  <li className="flow-slide news-slide news-slide-more" data-tint="4, 128, 144">
                    <article className="news-card news-card-more">
                      <div className="news-more-mosaic" aria-hidden="true">
                        {items.slice(0, 4).map((item) => (
                          <img key={item.id} src={item.image_url || FALLBACK_IMAGE} alt="" loading="lazy" decoding="async" draggable="false" />
                        ))}
                      </div>
                      <span className="news-veil" aria-hidden="true" />
                      <div className="news-copy">
                        <p className="news-meta">
                          <span className="news-tag">{isArabic ? "السجل الكامل" : "The full record"}</span>
                        </p>
                        <h3 className="news-headline">
                          {isArabic ? "كل ما نشرته الجمعية." : "Everything SAAE has published."}
                        </h3>
                        <p className="news-excerpt">
                          {isArabic
                            ? "كل إعلان، بترتيب التاريخ، بالعربية والإنجليزية."
                            : "Every announcement, in date order, in Arabic and English."}
                        </p>
                        <Link className="news-cta" to="/news">
                          {isArabic ? "كل الأخبار" : "All news stories"} {arrow}
                        </Link>
                      </div>
                    </article>
                  </li>
                </ul>
              </div>
            </div>

            <button className="flow-arrow flow-prev" type="button" data-step="-1" aria-label={isArabic ? "السابق" : "Previous item"}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="flow-arrow flow-next" type="button" data-step="1" aria-label={isArabic ? "التالي" : "Next item"}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flow-dots">
              {Array.from({ length: slideCount }).map((_, index) => (
                <button
                  key={index}
                  className="flow-dot"
                  type="button"
                  data-go={index}
                  aria-label={`Show item ${index + 1} of ${slideCount}`}
                  aria-current={index === 0 ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
