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
};
export type CommunityNewsResult = { rows: CommunityNewsRow[]; failed: boolean };
export type CommunityPageData = {
  index: number;
  total: number;
  name: Bilingual;
  mission: Bilingual;
  iconSvg: string;
  details: { label: Bilingual; text: Bilingual }[];
  metrics: { value: string; label: Bilingual }[];
};
export const COMMUNITY_NEWS_COLUMNS =
  "id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,category,published_at";

const pad = (n: number) => String(n).padStart(2, "0");
const b = (t: Bilingual) => bilingualHtml(t.en, t.ar);
const ARROW =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const JOIN_BUTTON = `<button class="community-join" type="button" data-community-join>${bilingualHtml("Join the community", "انضم إلى المجتمع")} ${ARROW}</button>`;

/* The contact/About composition: light copy beside a mark stage, where the
   community's number takes the SAAE photo fill over a hollow ghost word. */
function heroHtml(p: CommunityPageData): string {
  const dots = Array.from(
    { length: p.total },
    (_, i) => `<li${i + 1 === p.index ? ' class="is-current"' : ""}></li>`,
  ).join("");
  return [
    `<section class="community-hero">`,
    `  <span class="hero-glow hero-glow-a" aria-hidden="true"></span>`,
    `  <span class="hero-glow hero-glow-b" aria-hidden="true"></span>`,
    `  <div class="community-hero-copy">`,
    `    <p class="community-label">${bilingualHtml("SAAE communities", "مجتمعات SAAE")}</p>`,
    `    <h1 class="community-title">${bilingualHtml(`${p.name.en}.`, `${p.name.ar}.`)}</h1>`,
    `    <p class="community-intro">${b(p.mission)}</p>`,
    `    <div class="community-actions">${JOIN_BUTTON}<a class="community-quiet" href="#community-news">${bilingualHtml("Latest activity", "آخر الأنشطة")}</a></div>`,
    `  </div>`,
    `  <div class="community-markstage" aria-hidden="true">`,
    `    <span class="community-ghost">${bilingualHtml("COMMUNITY", "مجتمع")}</span>`,
    `    <p class="photo-head community-mark">${pad(p.index)}</p>`,
    `    <span class="community-sigil"><svg viewBox="0 0 24 24">${p.iconSvg}</svg></span>`,
    `    <ol class="community-dots">${dots}</ol>`,
    `  </div>`,
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
        `    <li class="community"><span class="community-n">${pad(i + 1)}</span><h3>${b(d.label)}</h3><p class="community-line">${b(d.text)}</p></li>`,
    ),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

function storyHtml(r: CommunityNewsRow): string {
  const title = { en: r.title_en || r.title, ar: r.title_ar || r.title };
  const excerpt = { en: r.excerpt_en || r.excerpt || "", ar: r.excerpt_ar || r.excerpt || "" };
  return [
    `<li><a class="community-story" href="/news/${encodeURIComponent(r.id)}">`,
    `  <p class="news-meta"><span class="news-tag">${bilingualHtml(communityLabel(r.category, "en"), communityLabel(r.category, "ar"))}</span><time datetime="${escapeHtml(r.published_at.slice(0, 10))}">${bilingualHtml(formatNewsDate(r.published_at, "en"), formatNewsDate(r.published_at, "ar"))}</time></p>`,
    `  <div><h3>${b(title)}</h3>${excerpt.en || excerpt.ar ? `<p class="community-story-excerpt">${b(excerpt)}</p>` : ""}<span class="community-story-cta">${bilingualHtml("Read the story", "اقرأ الخبر")} ${ARROW}</span></div>`,
    `</a></li>`,
  ].join("\n");
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
    `  <p class="eyebrow">${bilingualHtml("Join", "انضم")}</p>`,
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
