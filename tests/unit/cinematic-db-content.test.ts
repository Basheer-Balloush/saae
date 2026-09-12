import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  applyArticle,
  applyHomeNews,
  applyMembers,
  applyNewsList,
  escapeHtml,
  formatNewsDate,
  renderArticle,
  renderArticleNotFound,
  renderHomeNews,
  renderMembersHtml,
  renderNewsListHtml,
  replaceRegion,
  type MemberRow,
  type NewsArticleRow,
  type NewsCardRow,
} from "@/lib/cinematic-db-content";

const page = (name: string) =>
  readFileSync(path.resolve(import.meta.dirname, "../../src/components/cinematic/html", name), "utf8");

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/* Shaped like the organization project's rows on 12 September 2026. */
const STORAGE = "https://zkpuyhrmyslmstzwojvw.supabase.co/storage/v1/object/public/news-images/images";
function card(id: string, title: string, overrides: Partial<NewsCardRow> = {}): NewsCardRow {
  return {
    id,
    title,
    title_ar: `${title} (ar)`,
    title_en: title,
    excerpt: null,
    excerpt_ar: null,
    excerpt_en: null,
    image_url: `${STORAGE}/${id.slice(0, 5)}.jpg`,
    category: "trainers",
    published_at: "2026-06-25",
    ...overrides,
  };
}
const ROWS: NewsCardRow[] = [
  card("3d1ad0d0-55da-4343-9d71-046dfc27a027", "Chairman of the Board on Syria TV", { published_at: "2026-07-19" }),
  card("d00e3f20-8d09-43e0-a4d5-a16f60af4e22", "Launch of the Train One Million initiative", { excerpt_en: "A national programme.", excerpt_ar: "برنامج وطني." }),
  card("859c1adc-24ab-4129-a8f0-d6e4fe5d85ea", "The First Syrian AI Symposium"),
  card("6a20d591-18f7-4e40-9fe0-07317cec708e", "First AI trainers graduate"),
  card("38accff9-cee7-45fb-99f6-2ada9f829da6", "BUILDEX | Aleppo Governorate Pavilion", { category: "architecture", published_at: "2026-06-10" }),
  card("08108acd-4d78-4c56-9c01-858e56a28c9d", "Launch of Archathon", { category: "data", published_at: "2026-02-14" }),
];

const HOSTILE = `<img src=x onerror="alert(1)">`;

describe("markup helpers", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
  });

  it("replaces a region's contents and keeps its markers", () => {
    const html = "a<!-- db:x:start -->old<!-- db:x:end -->b";
    expect(replaceRegion(html, "x", "new")).toBe("a<!-- db:x:start -->\nnew\n<!-- db:x:end -->b");
  });

  it("leaves the page alone when a marker is missing or out of order", () => {
    expect(replaceRegion("a<!-- db:x:start -->old", "x", "new")).toBe("a<!-- db:x:start -->old");
    const reversed = "<!-- db:x:end -->old<!-- db:x:start -->";
    expect(replaceRegion(reversed, "x", "new")).toBe(reversed);
  });

  it("formats dates in UTC for both languages", () => {
    expect(formatNewsDate("2026-07-19", "en")).toBe("19 July 2026");
    expect(formatNewsDate("2026-07-19", "ar")).not.toBe("");
    expect(formatNewsDate("not a date", "en")).toBe("");
  });
});

describe("the cinematic pages carry every region the loaders fill", () => {
  it.each([
    ["home.html", ["home-news-slides", "home-news-dots"]],
    ["news.html", ["news-list"]],
    ["about.html", ["about-members"]],
    ["news-article.html", ["article-head", "article-cover", "article-body", "article-gallery", "article-videos", "article-related"]],
  ])("%s", (file, regions) => {
    const html = page(file);
    for (const name of regions) {
      expect(count(html, `<!-- db:${name}:start -->`)).toBe(1);
      expect(count(html, `<!-- db:${name}:end -->`)).toBe(1);
      expect(html.indexOf(`<!-- db:${name}:start -->`)).toBeLessThan(html.indexOf(`<!-- db:${name}:end -->`));
    }
  });
});

describe("homepage news", () => {
  const home = page("home.html");

  it("replaces static stories with a bilingual empty state", () => {
    const html = applyHomeNews(home, renderHomeNews([]));
    expect(html).toContain("No news yet");
    expect(html).toContain("لا توجد أخبار حالياً");
    expect(html).not.toContain('href="/news/tv-interview"');
    expect(count(html, 'class="flow-dot carousel-dot-btn"')).toBe(2);
    expect(applyHomeNews(home, null)).toBe(html);
  });

  it("shows an error and retry instead of sample news on failure", () => {
    const html = applyHomeNews(home, renderHomeNews([], true));
    expect(html).toContain("News could not be loaded");
    expect(html).toContain("Try again");
    expect(html).not.toContain("No news yet");
    expect(html).not.toContain('href="/news/tv-interview"');
  });

  it("shows the four newest stories plus the all-news card, with a dot each", () => {
    const html = applyHomeNews(home, renderHomeNews(ROWS));
    expect(count(html, 'class="flow-slide news-slide"')).toBe(4);
    expect(count(html, "news-slide-more")).toBe(1);
    expect(count(html, 'class="flow-dot carousel-dot-btn"')).toBe(5);
    expect(html).toContain('aria-label="Latest news, 5 items"');
    expect(html).toContain(`href="/news/${ROWS[0].id}"`);
    expect(html).not.toContain(`href="/news/${ROWS[4].id}"`);
    expect(html).not.toContain('href="/news/tv-interview"');
  });

  it("sizes the dots to the stories there are", () => {
    const html = applyHomeNews(home, renderHomeNews(ROWS.slice(0, 2)));
    expect(count(html, 'class="flow-dot carousel-dot-btn"')).toBe(3);
    expect(html).toContain('aria-label="Show item 3 of 3"');
  });

  it("escapes database text and refuses non-https images", () => {
    const frag = renderHomeNews([card("x", HOSTILE, { image_url: "javascript:alert(1)" })])!;
    expect(frag.slidesHtml).not.toContain("<img src=x");
    expect(frag.slidesHtml).toContain("&lt;img src=x");
    expect(frag.slidesHtml).not.toContain("javascript:");
    expect(frag.slidesHtml).toContain('src="/cinematic/images/event-initiative.jpg"');
  });

  it("renders both languages and omits an empty excerpt", () => {
    const frag = renderHomeNews(ROWS.slice(0, 2))!;
    expect(frag.slidesHtml).toContain('<span data-db-lang="ar" dir="rtl">Chairman of the Board on Syria TV (ar)</span>');
    expect(count(frag.slidesHtml, 'class="news-excerpt"')).toBe(1);
  });
});

describe("news page", () => {
  const news = page("news.html");

  it("replaces the static stories with an empty state", () => {
    const html = applyNewsList(news, renderNewsListHtml([]));
    expect(html).toContain("No news yet");
    expect(html).not.toContain('href="/news/buildex-aleppo"');
    expect(html).not.toContain('class="featured reveal"');
    expect(applyNewsList(news, null)).toBe(html);
  });

  it("distinguishes a failed load from an empty database", () => {
    const html = applyNewsList(news, renderNewsListHtml([], true));
    expect(html).toContain("News could not be loaded");
    expect(html).toContain("Try again");
    expect(html).not.toContain("No news yet");
    expect(html).not.toContain('href="/news/buildex-aleppo"');
  });

  it("features the newest story and lists every other one", () => {
    const html = applyNewsList(news, renderNewsListHtml(ROWS));
    expect(count(html, 'class="featured reveal"')).toBe(1);
    expect(count(html, 'class="story reveal"')).toBe(5);
    expect(html).toContain(`href="/news/${ROWS[5].id}"`);
    expect(html).not.toContain('href="/news/buildex-aleppo"');
  });

  it("omits the grid when there is a single story", () => {
    expect(renderNewsListHtml(ROWS.slice(0, 1))).not.toContain("story-grid");
  });
});

describe("about members", () => {
  const about = page("about.html");
  const member = (category: string, name: string): MemberRow => ({
    id: name,
    category,
    display_order: 1,
    full_name_ar: `${name} (ar)`,
    full_name_en: name,
    position_ar: "رئيس",
    position_en: "Chair",
    bio_ar: null,
    bio_en: null,
    photo_url: null,
  });

  it("adds nothing while the members table is empty", () => {
    const html = applyMembers(about, renderMembersHtml([]));
    expect(html).not.toContain("members-board-h");
    expect(html).not.toContain("members-executive-h");
  });

  it("shows only the groups that have people, board first", () => {
    const html = renderMembersHtml([member("executive", "Exec One"), member("board", "Board One")]);
    expect(html.indexOf("members-board-h")).toBeLessThan(html.indexOf("members-executive-h"));
    expect(renderMembersHtml([member("board", "Board One")])).not.toContain("members-executive-h");
  });

  it("escapes member text and skips photos that are not https", () => {
    const html = renderMembersHtml([{ ...member("board", HOSTILE), photo_url: "http://example.com/a.jpg" }]);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("member-photo");
  });
});

describe("article page", () => {
  const template = page("news-article.html");
  const article: NewsArticleRow = {
    ...ROWS[4],
    content: null,
    content_en: "The Greater Aleppo Vision.\n\nSpatial planning\nCommunity participation",
    content_ar: "رؤية حلب الكبرى.",
    images: [`${STORAGE}/a.jpg`, `${STORAGE}/b.jpg`, "http://insecure.example/c.jpg"],
    videos: [`${STORAGE}/v.mp4`, "http://insecure.example/v.mp4"],
    categories: ["architecture"],
  };

  it("splits paragraphs on blank lines and keeps single breaks inside one", () => {
    const f = renderArticle(article, []);
    expect(f.bodyHtml).toContain("<p>The Greater Aleppo Vision.</p>");
    expect(f.bodyHtml).toContain("<p>Spatial planning<br>Community participation</p>");
    expect(f.bodyHtml).toContain('<div data-db-lang="ar" dir="rtl">');
  });

  it("builds the gallery from the cover plus https images, and drops insecure videos", () => {
    const f = renderArticle(article, []);
    expect(count(f.galleryHtml, 'class="gallery-slide')).toBe(3);
    expect(count(f.galleryHtml, "data-go=")).toBe(3);
    expect(f.galleryHtml).not.toContain("insecure.example");
    expect(count(f.videosHtml, "<video")).toBe(1);
  });

  it("has no gallery for a cover alone, and no related section without related news", () => {
    const f = renderArticle({ ...article, images: [], videos: [] }, []);
    expect(f.galleryHtml).toBe("");
    expect(f.videosHtml).toBe("");
    expect(f.relatedHtml).toBe("");
  });

  it("links related stories to their article pages", () => {
    const f = renderArticle(article, ROWS.slice(0, 2));
    expect(count(f.relatedHtml, 'class="related-card reveal"')).toBe(2);
    expect(f.relatedHtml).toContain(`href="/news/${ROWS[1].id}"`);
  });

  it("fills the template and escapes the title", () => {
    const html = applyArticle(template, renderArticle({ ...article, title_en: HOSTILE }, []));
    expect(html).toContain('<h1 class="article-title">');
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("aisyria.org/news/3d1ad0d0");
  });

  it("shows a not-found heading for a missing story", () => {
    const html = applyArticle(template, renderArticleNotFound());
    expect(html).toContain("Article not found");
    expect(html).not.toContain('class="article-body"');
  });
});
