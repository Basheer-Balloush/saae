import { communityLabel } from "@/lib/communityCategories";
import { resizedImage, resizedSrcSet } from "@/lib/image-url";
import type { NewsEntry } from "@/components/home/mobile-home-content";

/**
 * Database content for the cinematic pages.
 *
 * The cinematic pages are static prototype markup. Each region that should
 * show live data is fenced with <!-- db:<name>:start --> and
 * <!-- db:<name>:end -->. News regions always replace the prototype content,
 * including when the database is empty or unavailable.
 *
 * Loaders call the render* functions and return only the fragments, so the
 * page markup is not shipped a second time in the loader data. Dates are
 * formatted there, once, which keeps server and client output identical.
 * Components splice the fragments into the ?raw page with the apply*
 * functions.
 *
 * Every function whose name ends in Html returns markup with its database
 * values already escaped. Every other value is plain text and must go
 * through escapeHtml before it reaches markup.
 */

type Lang = "ar" | "en";

export const NEWS_CARD_COLUMNS =
  "id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,image_url,category,published_at";
export const NEWS_ARTICLE_COLUMNS =
  "id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,image_url,images,videos,category,categories,published_at";
export const RELATED_NEWS_COLUMNS = "id,title,title_ar,title_en,image_url,published_at";
export const MEMBER_COLUMNS =
  "id,category,display_order,full_name_ar,full_name_en,position_ar,position_en,bio_ar,bio_en,photo_url";

export type NewsCardRow = {
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

export type NewsArticleRow = NewsCardRow & {
  content: string | null;
  content_ar: string | null;
  content_en: string | null;
  images: string[] | null;
  videos: string[] | null;
  categories: string[] | null;
};

export type RelatedNewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  image_url: string | null;
  published_at: string;
};

export type MemberRow = {
  id: string;
  category: string;
  display_order: number;
  full_name_ar: string;
  full_name_en: string | null;
  position_ar: string;
  position_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
};

const FALLBACK_IMAGE = "/cinematic/images/event-initiative.jpg";
const TINTS = ["4, 128, 144", "105, 143, 63", "249, 156, 0"];
const HOME_NEWS_LIMIT = 4;
/* Short, listing-only headlines for the published news cards. Article pages
   continue to use the full titles from the database. */
const NEWS_LIST_HEADLINES: Record<string, { en: string; ar: string }> = {
  "3d1ad0d0-55da-4343-9d71-046dfc27a027": {
    en: "Million Syrian Users initiative on Syrian TV",
    ar: "تطورات مبادرة «مليون مستخدم سوري» على قناة السورية",
  },
  "d00e3f20-8d09-43e0-a4d5-a16f60af4e22": {
    en: "Million Syrian AI Users initiative launches",
    ar: "إطلاق مبادرة تدريب مليون مستخدم سوري",
  },
  "859c1adc-24ab-4129-a8f0-d6e4fe5d85ea": {
    en: "Syria's first AI symposium opens",
    ar: "الندوة السورية الأولى للذكاء الاصطناعي",
  },
  "6a20d591-18f7-4e40-9fe0-07317cec708e": {
    en: "Syria's first AI trainers graduate",
    ar: "تخريج أول مدربي الذكاء الاصطناعي",
  },
  "38accff9-cee7-45fb-99f6-2ada9f829da6": {
    en: "Greater Aleppo project at BUILDEX",
    ar: "مشروع حلب الكبرى في معرض بيلدكس",
  },
  "08108acd-4d78-4c56-9c01-858e56a28c9d": {
    en: "Archathon: Syria's smart architecture marathon",
    ar: "إطلاق أركاثون للعمارة الذكية",
  },
};
const CALENDAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PREV_SVG =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NEXT_SVG =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------------------------------------------------------------- basics -- */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Both languages side by side; db-content.css shows the one matching <html lang>. */
export function bilingualHtml(en: string, ar: string): string {
  return `<span data-db-lang="en">${escapeHtml(en)}</span><span data-db-lang="ar" dir="rtl">${escapeHtml(ar)}</span>`;
}

/** Replaces what sits between a region's markers, keeping the markers. */
export function replaceRegion(html: string, name: string, fragmentHtml: string): string {
  const start = `<!-- db:${name}:start -->`;
  const end = `<!-- db:${name}:end -->`;
  const s = html.indexOf(start);
  if (s === -1) return html;
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return html;
  return `${html.slice(0, s + start.length)}\n${fragmentHtml}\n${html.slice(e)}`;
}

/** "19 July 2026" / "١٩ تموز ٢٠٢٦". UTC, so the server and browser agree. */
export function formatNewsDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Only absolute https URLs reach src attributes. */
function httpsUrl(url: string | null | undefined): string | null {
  return url && /^https:\/\//i.test(url) ? url : null;
}

function titles(row: { title: string; title_ar: string | null; title_en: string | null }) {
  return { en: row.title_en || row.title, ar: row.title_ar || row.title };
}

function newsListTitles(row: NewsCardRow) {
  return NEWS_LIST_HEADLINES[row.id] ?? titles(row);
}

function newsHref(id: string): string {
  return `/news/${encodeURIComponent(id)}`;
}

function dateHtml(iso: string, className?: string): string {
  const cls = className ? ` class="${className}"` : "";
  return `<time${cls} datetime="${escapeHtml(iso.slice(0, 10))}">${bilingualHtml(formatNewsDate(iso, "en"), formatNewsDate(iso, "ar"))}</time>`;
}

function categoryHtml(key: string): string {
  return bilingualHtml(communityLabel(key, "en"), communityLabel(key, "ar"));
}

/* ----------------------------------------------------------- news cards -- */

/* Resized copies from Supabase's image endpoint (src/lib/image-url.ts): the
   uploads are full camera size, which a phone stalls decoding. */
function srcSetAttr(src: string, widths?: number[]): string {
  const set = resizedSrcSet(src, widths);
  return set ? ` srcset="${escapeHtml(set)}"` : "";
}

function cardImageHtml(row: NewsCardRow, className?: string): string {
  const cls = className ? ` class="${className}"` : "";
  const src = httpsUrl(row.image_url) ?? FALLBACK_IMAGE;
  return `<img${cls} src="${escapeHtml(resizedImage(src, 720))}"${srcSetAttr(src)} sizes="(max-width: 767px) 92vw, 33vw" alt="${escapeHtml(titles(row).en)}" loading="lazy" decoding="async" draggable="false">`;
}

function cardMetaHtml(row: NewsCardRow): string {
  return `<p class="news-meta"><span class="news-tag">${categoryHtml(row.category)}</span>${dateHtml(row.published_at)}</p>`;
}

function cardExcerptHtml(row: NewsCardRow): string {
  const en = row.excerpt_en || row.excerpt || "";
  const ar = row.excerpt_ar || row.excerpt || "";
  if (!en && !ar) return "";
  return `<p class="news-excerpt">${bilingualHtml(en || ar, ar || en)}</p>`;
}

/* The shared MotionButton markup (public/cinematic/css/motion-button.css):
   the circle and arrow are decoration, the label is the link's name. */
const MOTION_ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

function motionLinkHtml(href: string, labelHtml: string, className: string): string {
  return `<a class="${className} motion-button" href="${href}"><span class="circle" aria-hidden="true"></span><span class="motion-icon" aria-hidden="true">${MOTION_ARROW_SVG}</span><span class="button-text">${labelHtml}</span></a>`;
}

/* "Read the story" stays the only text in its span so language.js translates it. */
function readStoryHtml(id: string): string {
  return motionLinkHtml(newsHref(id), "Read the story", "news-cta");
}

function readNewsHtml(id: string): string {
  return motionLinkHtml(newsHref(id), "Read the news", "news-cta");
}

/* The phone homepage draws its cards in React, so it takes plain bilingual
   text rather than markup; React does the escaping. */
export function mobileNewsEntries(rows: NewsCardRow[]): NewsEntry[] {
  return rows.slice(0, HOME_NEWS_LIMIT).map((row) => {
    const headline = titles(row);
    const en = row.excerpt_en || row.excerpt || "";
    const ar = row.excerpt_ar || row.excerpt || "";
    return {
      id: row.id,
      tag: { en: communityLabel(row.category, "en"), ar: communityLabel(row.category, "ar") },
      date: { en: formatNewsDate(row.published_at, "en"), ar: formatNewsDate(row.published_at, "ar") },
      dateTime: row.published_at.slice(0, 10),
      headline,
      excerpt: { en: en || ar, ar: ar || en },
      image: httpsUrl(row.image_url) ?? FALLBACK_IMAGE,
      imageAlt: headline,
      href: newsHref(row.id),
    };
  });
}

export type HomeNewsFragments = { slidesHtml: string; dotsHtml: string; total: number };

function newsStatusHtml(failed: boolean): string {
  const title = failed
    ? bilingualHtml("News could not be loaded", "تعذّر تحميل الأخبار")
    : bilingualHtml("No news yet", "لا توجد أخبار حالياً");
  const detail = failed
    ? bilingualHtml("Please try again.", "يرجى المحاولة مرة أخرى.")
    : bilingualHtml("Check back for our latest updates.", "تابعونا للاطلاع على آخر المستجدات.");
  const retry = failed
    ? motionLinkHtml("/news", bilingualHtml("Try again", "حاول مرة أخرى"), "news-cta")
    : "";
  return `<div class="db-news-status" role="status"><h3>${title}</h3><p>${detail}</p>${retry}</div>`;
}

/** The homepage ring: up to four stories, then the design's own "all news" card. */
export function renderHomeNews(rows: NewsCardRow[], failed = false): HomeNewsFragments {
  if (failed || rows.length === 0) return {
    slidesHtml: `<li class="flow-slide news-slide" data-tint="4, 128, 144"><article class="news-card news-card-more"><div class="news-copy">${newsStatusHtml(failed)}</div></article></li>`,
    dotsHtml: [0, 1].map(i => `<button class="flow-dot carousel-dot-btn" type="button" data-go="${i}" aria-label="Show item ${i + 1} of 2"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("\n"),
    total: 2,
  };
  const items = rows.slice(0, HOME_NEWS_LIMIT);
  const total = items.length + 1;
  const slidesHtml = items
    .map((row, i) =>
      [
        `<li class="flow-slide news-slide" data-tint="${TINTS[i % TINTS.length]}">`,
        `  <article class="news-card">`,
        `    ${cardImageHtml(row, "news-photo")}`,
        `    <span class="news-veil" aria-hidden="true"></span>`,
        `    <div class="news-copy">`,
        `      ${cardMetaHtml(row)}`,
        `      <h3 class="news-headline">${bilingualHtml(titles(row).en, titles(row).ar)}</h3>`,
        `      ${cardExcerptHtml(row)}`,
        `      ${readStoryHtml(row.id)}`,
        `    </div>`,
        `  </article>`,
        `</li>`,
      ].join("\n"),
    )
    .join("\n");
  const dotsHtml = Array.from(
    { length: total },
    (_, i) =>
      `<button class="flow-dot carousel-dot-btn" type="button" data-go="${i}" aria-label="Show item ${i + 1} of ${total}"${i === 0 ? ' aria-current="true"' : ""}></button>`,
  ).join("\n");
  return { slidesHtml, dotsHtml, total };
}

export function applyHomeNews(html: string, fragments: HomeNewsFragments | null): string {
  fragments ??= renderHomeNews([]);
  return replaceRegion(
    replaceRegion(html, "home-news-slides", fragments.slidesHtml),
    "home-news-dots",
    fragments.dotsHtml,
  ).replace('aria-label="Latest news, five items"', `aria-label="Latest news, ${fragments.total} items"`);
}

/** The news page: the newest story featured, every other one in the grid. */
export function renderNewsListHtml(rows: NewsCardRow[], failed = false): string {
  if (failed || rows.length === 0) return newsStatusHtml(failed);
  const [first, ...rest] = rows;
  const firstTitle = newsListTitles(first);
  const featured = [
    `<article class="featured reveal" style="--tint: ${TINTS[0]}">`,
    `  <div class="featured-media">`,
    `    ${cardImageHtml(first)}`,
    `    <span class="featured-veil" aria-hidden="true"></span>`,
    `  </div>`,
    `  <div class="featured-copy">`,
    `    ${cardMetaHtml(first)}`,
    `    <h2 class="featured-headline">${bilingualHtml(firstTitle.en, firstTitle.ar)}</h2>`,
    `    ${readNewsHtml(first.id)}`,
    `  </div>`,
    `</article>`,
  ].join("\n");
  if (rest.length === 0) return featured;
  const stories = rest
    .map((row, i) =>
      [
        `<li class="story reveal" style="--tint: ${TINTS[(i + 1) % TINTS.length]}">`,
        `  <article>`,
        `    <div class="story-media">`,
        `      ${cardImageHtml(row)}`,
        `      <span class="story-veil" aria-hidden="true"></span>`,
        `      <div class="story-copy">`,
        `        ${cardMetaHtml(row)}`,
        `        <h3 class="story-headline">${bilingualHtml(newsListTitles(row).en, newsListTitles(row).ar)}</h3>`,
        `        ${readNewsHtml(row.id)}`,
        `      </div>`,
        `    </div>`,
        `  </article>`,
        `</li>`,
      ].join("\n"),
    )
    .join("\n");
  return `${featured}\n<ul class="story-grid">\n${stories}\n</ul>`;
}

export function applyNewsList(html: string, fragmentHtml: string | null): string {
  return replaceRegion(html, "news-list", fragmentHtml ?? renderNewsListHtml([]));
}

/* -------------------------------------------------------------- members -- */

const MEMBER_GROUPS = [
  {
    category: "board",
    title: ["Board of Directors", "مجلس الإدارة"],
    subtitle: [
      "The strategic leadership that sets the association's vision and direction.",
      "القيادة الاستراتيجية التي ترسم رؤية الجمعية واتجاهها.",
    ],
  },
  {
    category: "executive",
    title: ["Executive Team", "الفريق التنفيذي"],
    subtitle: [
      "The team that leads the daily work and turns the vision into tangible impact.",
      "الفريق الذي يقود العمل اليومي ويُترجم الرؤية إلى أثر ملموس.",
    ],
  },
] as const;

function memberHtml(m: MemberRow): string {
  const nameEn = m.full_name_en || m.full_name_ar;
  const photo = httpsUrl(m.photo_url);
  const bioEn = m.bio_en || m.bio_ar || "";
  const bioAr = m.bio_ar || m.bio_en || "";
  return [
    `<li class="community member">`,
    photo
      ? `  <img class="member-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(nameEn)}" loading="lazy" decoding="async">`
      : "",
    `  <h3>${bilingualHtml(nameEn, m.full_name_ar)}</h3>`,
    `  <p class="community-line">${bilingualHtml(m.position_en || m.position_ar, m.position_ar)}</p>`,
    bioEn || bioAr ? `  <p class="member-bio">${bilingualHtml(bioEn, bioAr)}</p>` : "",
    `</li>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Board, then executive team; a group with nobody in it is left out, as before. */
export function renderMembersHtml(members: MemberRow[]): string {
  return MEMBER_GROUPS.map((group) => {
    const people = members.filter((m) => m.category === group.category);
    if (people.length === 0) return "";
    return [
      `<section class="communities page-shell reveal" aria-labelledby="members-${group.category}-h">`,
      `  <div class="head">`,
      `    <p class="eyebrow">${bilingualHtml("SAAE people", "أعضاء الجمعية")}</p>`,
      `    <h2 id="members-${group.category}-h" class="photo-head">${bilingualHtml(group.title[0], group.title[1])}</h2>`,
      `    <p>${bilingualHtml(group.subtitle[0], group.subtitle[1])}</p>`,
      `  </div>`,
      `  <ul class="community-grid">`,
      people.map(memberHtml).join("\n"),
      `  </ul>`,
      `</section>`,
    ].join("\n");
  })
    .filter(Boolean)
    .join("\n");
}

export function applyMembers(html: string, fragmentHtml: string): string {
  return replaceRegion(html, "about-members", fragmentHtml);
}

/* -------------------------------------------------------------- article -- */

export type ArticleFragments = {
  headHtml: string;
  coverHtml: string;
  bodyHtml: string;
  galleryHtml: string;
  videosHtml: string;
  relatedHtml: string;
};

/** Blank lines separate paragraphs; single line breaks stay inside one. */
function paragraphsHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("\n");
}

export function renderArticle(article: NewsArticleRow, related: RelatedNewsRow[]): ArticleFragments {
  const title = titles(article);
  const categories = (article.categories?.length ? article.categories : [article.category]).filter(Boolean);
  const cover = httpsUrl(article.image_url);

  const headHtml = [
    `<header class="article-head">`,
    ...categories.map((c) => `  <span class="article-chip">${categoryHtml(c)}</span>`),
    `  <h1 class="article-title">${bilingualHtml(title.en, title.ar)}</h1>`,
    `  <p class="article-meta">`,
    `    ${CALENDAR_SVG}`,
    `    ${dateHtml(article.published_at)}`,
    `  </p>`,
    `</header>`,
  ].join("\n");

  const coverHtml = cover
    ? `<figure class="article-cover reveal">\n  <img src="${escapeHtml(resizedImage(cover, 1600))}"${srcSetAttr(cover, [720, 1080, 1600])} sizes="(max-width: 767px) 100vw, 80vw" alt="${escapeHtml(title.en)}" decoding="async">\n</figure>`
    : "";

  const bodyEn = article.content_en || article.content || article.excerpt_en || article.excerpt || "";
  const bodyAr = article.content_ar || article.content || article.excerpt_ar || article.excerpt || "";
  const bodyHtml =
    bodyEn || bodyAr
      ? [
          `<article class="article-body">`,
          `  <div data-db-lang="en" dir="ltr">`,
          paragraphsHtml(bodyEn || bodyAr),
          `  </div>`,
          `  <div data-db-lang="ar" dir="rtl">`,
          paragraphsHtml(bodyAr || bodyEn),
          `  </div>`,
          `</article>`,
        ].join("\n")
      : `<article class="article-body">\n  <p>${bilingualHtml("No content available yet.", "لا يوجد محتوى بعد.")}</p>\n</article>`;

  // The cover leads the gallery, as on the hand-built stories; one image alone
  // is already the cover, so a gallery needs at least two.
  const slides = Array.from(
    new Set([cover, ...(article.images ?? []).map(httpsUrl)].filter((u): u is string => !!u)),
  );
  const galleryHtml =
    slides.length < 2
      ? ""
      : [
          `<section class="gallery reveal" aria-label="صور الخبر" style="margin-top: clamp(36px, 5vw, 58px);">`,
          `  <div class="gallery-track" id="gallery-track">`,
          ...slides.map(
            (src, i) =>
              `    <figure class="gallery-slide${i === 0 ? " is-active" : ""}"><img src="${escapeHtml(src)}" alt="${escapeHtml(`${title.en} — ${i + 1}`)}" loading="lazy" decoding="async"></figure>`,
          ),
          `  </div>`,
          `  <button class="gallery-arrow gallery-prev" type="button" id="gallery-prev" aria-label="الشريحة السابقة">${PREV_SVG}</button>`,
          `  <button class="gallery-arrow gallery-next" type="button" id="gallery-next" aria-label="الشريحة التالية">${NEXT_SVG}</button>`,
          `  <div class="gallery-dots" role="tablist" aria-label="اختيار الشريحة">`,
          ...slides.map(
            (_, i) =>
              `    <button class="gallery-dot${i === 0 ? " is-active" : ""}" type="button" data-go="${i}" aria-label="الشريحة ${i + 1} من ${slides.length}"${i === 0 ? ' aria-current="true"' : ""}></button>`,
          ),
          `  </div>`,
          `</section>`,
        ].join("\n");

  const videos = (article.videos ?? []).map(httpsUrl).filter((u): u is string => !!u);
  const videosHtml =
    videos.length === 0
      ? ""
      : [
          `<section class="article-videos reveal" aria-labelledby="videos-title">`,
          `  <h2 class="related-heading" id="videos-title">${bilingualHtml("Videos", "فيديوهات")}</h2>`,
          ...videos.map((src) => `  <video src="${escapeHtml(src)}" controls preload="metadata" playsinline></video>`),
          `</section>`,
        ].join("\n");

  // The heading is the template's own Arabic, which language.js translates.
  const relatedHtml =
    related.length === 0
      ? ""
      : [
          `<section class="related" aria-labelledby="related-title">`,
          `  <h2 class="related-heading" id="related-title">أخبار ذات صلة</h2>`,
          `  <ul class="related-grid">`,
          ...related.map((r, i) => {
            const t = titles(r);
            const src = httpsUrl(r.image_url) ?? FALLBACK_IMAGE;
            return [
              `    <li>`,
              `      <a class="related-card reveal" style="--tint: ${TINTS[(i + 1) % TINTS.length]}" href="${newsHref(r.id)}">`,
              `        <div class="related-media">`,
              `          <img src="${escapeHtml(resizedImage(src, 720))}"${srcSetAttr(src)} sizes="(max-width: 767px) 92vw, 33vw" alt="${escapeHtml(t.en)}" loading="lazy" decoding="async">`,
              `          <span class="related-veil" aria-hidden="true"></span>`,
              `        </div>`,
              `        <div class="related-copy">`,
              `          ${dateHtml(r.published_at, "related-time")}`,
              `          <h3 class="related-title">${bilingualHtml(t.en, t.ar)}</h3>`,
              `        </div>`,
              `      </a>`,
              `    </li>`,
            ].join("\n");
          }),
          `  </ul>`,
          `</section>`,
        ].join("\n");

  return { headHtml, coverHtml, bodyHtml, galleryHtml, videosHtml, relatedHtml };
}

export function renderArticleNotFound(): ArticleFragments {
  return {
    headHtml: `<header class="article-head">\n  <h1 class="article-title">${bilingualHtml("Article not found", "المقال غير موجود")}</h1>\n</header>`,
    coverHtml: "",
    bodyHtml: "",
    galleryHtml: "",
    videosHtml: "",
    relatedHtml: "",
  };
}

export function applyArticle(html: string, f: ArticleFragments): string {
  let out = html;
  out = replaceRegion(out, "article-head", f.headHtml);
  out = replaceRegion(out, "article-cover", f.coverHtml);
  out = replaceRegion(out, "article-body", f.bodyHtml);
  out = replaceRegion(out, "article-gallery", f.galleryHtml);
  out = replaceRegion(out, "article-videos", f.videosHtml);
  out = replaceRegion(out, "article-related", f.relatedHtml);
  return out;
}
