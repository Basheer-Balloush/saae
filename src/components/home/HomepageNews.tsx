import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import ScrollExpandMedia from "@/components/ui/scroll-expansion-hero";
import MotionButton from "@/components/ui/motion-button";
import { NEWS_COPY, type Locale, type NewsEntry } from "./mobile-home-content";
import "./homepage-news.css";

type Props = { news: NewsEntry[]; newsFailed?: boolean; lang: Locale; embedded?: boolean };
const pick = (value: { ar: string; en: string }, lang: Locale) => value[lang];

export function HomepageNews({ news, newsFailed = false, lang, embedded = false }: Props) {
  const stories = newsFailed ? [] : news;
  const Arrow = lang === "ar" ? ArrowUpLeft : ArrowUpRight;
  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper className="hn-root" data-react-i18n id={embedded ? undefined : "news"} aria-labelledby="news-title" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="hn-tech-details" aria-hidden="true"><span /><span /></div>
      <ScrollExpandMedia
        headline={lang === "ar" ? "العمل كما يحدث" : "The Work, as It Happens"}
        description={lang === "ar" ? "من الفكرة إلى الأثر، تابعوا أخبار الجمعية ومبادراتها وفعالياتها في الذكاء الاصطناعي وريادة الأعمال." : "From ideas to impact, follow the association’s news, initiatives, and events in artificial intelligence and entrepreneurship."}
        mediaSrc="/cinematic/images/home-news-intro.webp"
        mediaAlt={lang === "ar" ? "ميكروفون وصحف ورمز بث وشجرة تقنية تمثل أخبار الجمعية" : "Microphone, newspapers, and an AI broadcast motif representing SAAE news"}
        titleLeading={lang === "ar" ? "آخر" : "Latest"}
        titleTrailing={lang === "ar" ? "الأخبار" : "News"}
      />
      <div className="hn-more">
        {stories.length ? (
          <div className="hn-story-grid">
            {stories.map((item, i) => (
              <article className="hn-story" key={item.id}>
                <a className="hn-story-photo" href={item.href} tabIndex={-1} aria-hidden="true"><img src={item.image} alt="" width={800} height={500} loading="lazy" decoding="async" /></a>
                <div className="hn-story-meta"><span dir="ltr">{String(i + 1).padStart(2, "0")}</span><time dateTime={item.dateTime}>{pick(item.date, lang)}</time></div>
                <h3><a href={item.href}>{pick(item.headline, lang)}<Arrow size={18} aria-hidden="true" /></a></h3>
                <p>{pick(item.excerpt, lang)}</p>
                <div className="hn-story-action">
                  <MotionButton href={item.href} className="hn-show-all hn-open-news" label={lang === "ar" ? "فتح الخبر" : "Open News"} aria-label={`${lang === "ar" ? "فتح الخبر" : "Open News"}: ${pick(item.headline, lang)}`} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="hn-empty" role="status">{pick(newsFailed ? NEWS_COPY.failed : NEWS_COPY.empty, lang)}</p>
        )}
        <div className="hn-actions">
          <MotionButton href="/news" className="hn-show-all" label={lang === "ar" ? "عرض جميع الأخبار" : "Show All News"} />
        </div>
      </div>
    </Wrapper>
  );
}

export function HomepageNewsPortal({ news, newsFailed, html }: { news: NewsEntry[]; newsFailed: boolean; html: string }) {
  const [lang, setLang] = useState<Locale>("ar");
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById("home-news-slot"));
    const syncLanguage = () => setLang(document.documentElement.lang === "en" ? "en" : "ar");
    syncLanguage();
    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [html]);
  return host ? createPortal(<HomepageNews news={news} newsFailed={newsFailed} lang={lang} embedded />, host) : null;
}
