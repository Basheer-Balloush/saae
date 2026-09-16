/* Fills the community page template (communities.html) region by region. Every string goes through bilingualHtml, so the page follows <html lang> like the rest of the cinematic site and language.js needs no dictionary entries. */
import {
  bilingualHtml,
  escapeHtml,
  formatNewsDate,
  replaceRegion,
} from "@/lib/cinematic-db-content";
import { communityLabel } from "@/lib/communityCategories";

export type Bilingual = { en: string; ar: string };
export type CommunityNewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  category: string;
  published_at: string;
  image_url: string | null;
};
export type CommunityNewsResult = { rows: CommunityNewsRow[]; failed: boolean };
export type CommunityNeighbour = { key: string; index: number; name: Bilingual };
export type CommunityPageData = {
  index: number;
  total: number;
  name: Bilingual;
  /** The homepage card's name ("Healthcare") and its one-line promise. */
  shortName: Bilingual;
  tagline: Bilingual;
  prev: CommunityNeighbour;
  next: CommunityNeighbour;
  mission: Bilingual;
  iconSvg: string;
  details: { label: Bilingual; text: Bilingual }[];
  metrics: { value: string; label: Bilingual }[];
};
export const COMMUNITY_NEWS_COLUMNS =
  "id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,category,published_at,image_url";

const pad = (n: number) => String(n).padStart(2, "0");
const b = (t: Bilingual) => bilingualHtml(t.en, t.ar);
const ARROW =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* The site's shared MotionButton (public/cinematic/css/motion-button.css):
   a turquoise circle holding the icon that fills the pill on hover. */
const MOTION_ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
const MOTION_DOWN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>';
const motionInner = (icon: string, label: string) =>
  `<span class="circle" aria-hidden="true"></span><span class="motion-icon" aria-hidden="true">${icon}</span><span class="button-text">${label}</span>`;
const JOIN_BUTTON = `<button class="button-primary motion-button community-join" type="button" data-community-join>${motionInner(MOTION_ARROW, bilingualHtml("Join the community", "انضم إلى المجتمع"))}</button>`;
const LATEST_BUTTON = `<a class="button-ghost motion-button button-quiet community-quiet" href="#community-news">${motionInner(MOTION_DOWN, bilingualHtml("Latest activity", "آخر الأنشطة"))}</a>`;

/* The homepage headline's two-tone fall, one block per language because the
   word order differs: "Healthcare / Community." against "مجتمع / الرعاية الصحية.". */
function titleHtml(short: Bilingual): string {
  const line = (text: string, accent = false) =>
    `<span class="community-title-line${accent ? " community-title-accent" : ""}">${escapeHtml(text)}</span>`;
  return (
    `<span data-db-lang="en">${line(short.en)}${line("Community.", true)}</span>` +
    `<span data-db-lang="ar" dir="rtl">${line("مجتمع", true)}${line(`${short.ar}.`)}</span>`
  );
}

/* One shared foundation: nine roots from a single trunk, this community's
   root lit and ending in its seal. Drawn left to right in community order;
   the stylesheet mirrors it for Arabic and counter-mirrors the icon. */
function rootsSvg(p: CommunityPageData): string {
  const trunk = { x: 200, y: 10 };
  const roots = Array.from({ length: p.total }, (_, i) => {
    const x = 28 + i * ((400 - 56) / (p.total - 1));
    const y = 252 - Math.abs(i - (p.total - 1) / 2) * 22;
    const current = i + 1 === p.index;
    const path = `M${trunk.x} ${trunk.y} C${trunk.x} 120 ${x.toFixed(1)} ${(y - 96).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    return { x, y, current, path };
  });
  const lit = roots.find((r) => r.current) ?? roots[0];
  return [
    `<svg class="community-roots" viewBox="0 0 400 290" aria-hidden="true" focusable="false">`,
    ...roots
      .filter((r) => !r.current)
      .map(
        (r) =>
          `  <path class="root" d="${r.path}"/><circle class="root-node" cx="${r.x.toFixed(1)}" cy="${r.y.toFixed(1)}" r="3"/>`,
      ),
    `  <path class="root is-current" pathLength="1" d="${lit.path}"/>`,
    `  <circle class="root-trunk" cx="${trunk.x}" cy="${trunk.y}" r="4"/>`,
    `  <circle class="root-seal" cx="${lit.x.toFixed(1)}" cy="${lit.y.toFixed(1)}" r="21"/>`,
    `  <g transform="translate(${(lit.x - 10).toFixed(1)} ${(lit.y - 10).toFixed(1)}) scale(0.8333)"><g class="root-icon">${p.iconSvg}</g></g>`,
    `</svg>`,
  ].join("\n");
}

const CHEVRON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function pagerLinkHtml(n: CommunityNeighbour, dir: "prev" | "next"): string {
  const label =
    dir === "prev" ? bilingualHtml("Previous", "السابق") : bilingualHtml("Next", "التالي");
  return `<a class="community-pager-link is-${dir}" href="/communities/${encodeURIComponent(n.key)}" rel="${dir}"><span class="community-pager-dir">${CHEVRON}${label}</span><span class="community-pager-name"><b dir="ltr">${pad(n.index)}</b> ${b(n.name)}</span></a>`;
}

/* The contact/About composition: light two-tone copy beside a mark stage,
   where the number takes the SAAE photo fill above the community's root. */
function heroHtml(p: CommunityPageData): string {
  return [
    `<section class="community-hero">`,
    `  <span class="hero-glow hero-glow-a" aria-hidden="true"></span>`,
    `  <span class="hero-glow hero-glow-b" aria-hidden="true"></span>`,
    `  <div class="community-hero-copy">`,
    `    <p class="community-label">${bilingualHtml("SAAE communities", "مجتمعات SAAE")}<span class="community-label-n" dir="ltr">${pad(p.index)} / ${pad(p.total)}</span></p>`,
    `    <h1 class="community-title">${titleHtml(p.shortName)}</h1>`,
    `    <p class="community-tagline">${b(p.tagline)}</p>`,
    `    <p class="community-intro">${b(p.mission)}</p>`,
    `    <div class="community-actions">${JOIN_BUTTON}${LATEST_BUTTON}</div>`,
    `  </div>`,
    `  <div class="community-markstage" aria-hidden="true">`,
    `    <span class="community-ghost">${bilingualHtml("COMMUNITY", "مجتمع")}</span>`,
    `    <p class="photo-head community-mark">${pad(p.index)}</p>`,
    `    ${rootsSvg(p)}`,
    `  </div>`,
    `  <nav class="community-pager">`,
    `    <h2 class="sr-only">${bilingualHtml("Other communities", "مجتمعات أخرى")}</h2>`,
    `    ${pagerLinkHtml(p.prev, "prev")}`,
    `    ${pagerLinkHtml(p.next, "next")}`,
    `  </nav>`,
    `</section>`,
  ].join("\n");
}

function statsHtml(metrics: CommunityPageData["metrics"]): string {
  if (metrics.length === 0) return "";
  return [
    `<section class="community-section page-shell"><ul class="community-stats">`,
    ...metrics.map(
      (m) =>
        `  <li class="community-stat"><b>${escapeHtml(m.value)}</b><span>${b(m.label)}</span></li>`,
    ),
    `</ul></section>`,
  ].join("\n");
}

function workHtml(details: CommunityPageData["details"]): string {
  if (details.length === 0) return "";
  return [
    `<section class="community-section page-shell" aria-labelledby="community-work-h">`,
    `  <div class="head"><p class="eyebrow">${bilingualHtml("How it works", "كيف يعمل")}</p><h2 id="community-work-h" class="photo-head">${bilingualHtml("What the community works on.", "ما الذي يعمل عليه المجتمع.")}</h2></div>`,
    `  <ul class="community-grid">`,
    ...details.map(
      (d, i) =>
        `    <li class="community"><h3>${b(d.label)}</h3><p class="community-line">${b(d.text)}</p></li>`,
    ),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

function storyHtml(r: CommunityNewsRow): string {
  const title = { en: r.title_en || r.title, ar: r.title_ar || r.title };
  const excerpt = { en: r.excerpt_en || r.excerpt || "", ar: r.excerpt_ar || r.excerpt || "" };
  // Only https images, the same rule the news page applies to its cards.
  const photo = r.image_url && /^https:\/\//i.test(r.image_url) ? r.image_url : null;
  return [
    `<li><a class="community-story${photo ? "" : " is-textonly"}" href="/news/${encodeURIComponent(r.id)}">`,
    photo
      ? `  <figure class="community-story-photo"><img src="${escapeHtml(photo)}" alt="" loading="lazy" decoding="async" draggable="false"></figure>`
      : "",
    `  <div class="community-story-body"><p class="news-meta"><span class="news-tag">${bilingualHtml(communityLabel(r.category, "en"), communityLabel(r.category, "ar"))}</span><time datetime="${escapeHtml(r.published_at.slice(0, 10))}">${bilingualHtml(formatNewsDate(r.published_at, "en"), formatNewsDate(r.published_at, "ar"))}</time></p>`,
    `  <h3>${b(title)}</h3>${excerpt.en || excerpt.ar ? `<p class="community-story-excerpt">${b(excerpt)}</p>` : ""}<span class="community-story-cta">${bilingualHtml("Read the story", "اقرأ الخبر")} ${ARROW}</span></div>`,
    `</a></li>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function newsHtml(news: CommunityNewsResult): string {
  const list = news.failed
    ? `<p class="community-empty" role="status">${bilingualHtml("News could not be loaded. Please try again.", "تعذّر تحميل الأخبار. يرجى المحاولة مرة أخرى.")}</p>`
    : news.rows.length === 0
      ? `<p class="community-empty">${bilingualHtml("No news yet for this community.", "لا توجد أخبار بعد لهذا المجتمع.")}</p>`
      : `<ol class="community-news">\n${news.rows.map(storyHtml).join("\n")}\n</ol>`;
  return [
    `<section class="community-section page-shell" id="community-news" aria-labelledby="community-news-h">`,
    `  <div class="head"><p class="eyebrow">${bilingualHtml("From the record", "من السجل")}</p><h2 id="community-news-h" class="photo-head">${bilingualHtml("News and events.", "الأخبار والفعاليات.")}</h2><p>${bilingualHtml("A chronological index of what the community makes: workshops, research, meetups and partnerships.", "أرشيفٌ زمنيٌّ لما يصنعه المجتمع: ورشات، أبحاث، لقاءات وشراكات.")}</p></div>`,
    `  ${list}`,
    `</section>`,
  ].join("\n");
}

function closeHtml(): string {
  return [
    `<section class="community-close page-shell"><div class="community-close-panel">`,
    `  <h2 class="photo-head">${bilingualHtml("Be part of the story.", "كُنْ جزءاً من القصّة.")}</h2>`,
    `  <p>${bilingualHtml("We invite researchers, students and practitioners to join a community working — quietly and persistently — to build lasting impact.", "ندعو الباحثين والطلاب والممارسين للانضمام إلى مجتمعٍ يعمل بهدوءٍ وإصرارٍ على بناء أثرٍ مستدام.")}</p>`,
    `  <div class="community-actions">${JOIN_BUTTON}</div>`,
    `</div></section>`,
  ].join("\n");
}

export function applyCommunityPage(
  html: string,
  page: CommunityPageData,
  news: CommunityNewsResult,
): string {
  return replaceRegion(
    html,
    "community",
    [heroHtml(page), statsHtml(page.metrics), workHtml(page.details), newsHtml(news), closeHtml()]
      .filter(Boolean)
      .join("\n"),
  );
}
