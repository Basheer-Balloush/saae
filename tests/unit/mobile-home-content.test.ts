/**
 * v3 ("The living tree") mobile-homepage contracts, checked against real
 * rendered output:
 *
 * - MobileHomeView is rendered to static markup directly per language (pure
 *   props, no provider or global stubs) and anchors are parsed from that
 *   markup — no hand-built href inventories.
 * - Rendered anchors are compared with the actual desktop source
 *   (src/components/cinematic/html/home.html): every non-fragment desktop
 *   href must appear either verbatim or as its DESKTOP_HREF_EQUIVALENTS
 *   value, and no rendered link may point at https://aisyria.org.
 * - Local asset paths from rendered markup must exist under public/; SSR
 *   markup assigns no video src (client-only) but carries both posters.
 * - Local href targets must resolve to real route files / community keys /
 *   in-page ids found in the same markup.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import homeHtml from "@/components/cinematic/html/home.html?raw";
import { COMMUNITY_KEYS } from "@/lib/communityCategories";
import { MobileHomeView } from "@/components/home/MobileHome";
import { DESKTOP_HOME_QUERY } from "@/hooks/useHeroCapability";
import {
  ACHIEVEMENTS,
  COMMUNITIES,
  DESKTOP_HREF_EQUIVALENTS,
  FAQS,
  MISSION_STEPS,
  NEWS_COPY,
  OPENING,
  OPENING_HEADLINE,
  PARTNERS,
} from "@/components/home/mobile-home-content";
import { mobileNewsEntries, type NewsCardRow } from "@/lib/cinematic-db-content";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* Two stories shaped like the organization project's news rows. */
const NEWS_ROWS: NewsCardRow[] = [
  {
    id: "3d1ad0d0-55da-4343-9d71-046dfc27a027",
    title: "Chairman of the Board on Syria TV",
    title_ar: "رئيس مجلس الإدارة على شاشة التلفزيون السوري",
    title_en: "Chairman of the Board on Syria TV",
    excerpt: null,
    excerpt_ar: null,
    excerpt_en: "The initiative's progress on national television.",
    image_url:
      "https://zkpuyhrmyslmstzwojvw.supabase.co/storage/v1/object/public/news-images/images/3d1ad.jpg",
    category: "trainers",
    published_at: "2026-07-19",
  },
  {
    id: "d00e3f20-8d09-43e0-a4d5-a16f60af4e22",
    title: "Launch of the Train One Million initiative",
    title_ar: "إطلاق مبادرة تدريب مليون مستخدم",
    title_en: "Launch of the Train One Million initiative",
    excerpt: null,
    excerpt_ar: "برنامج وطني.",
    excerpt_en: "A national programme.",
    image_url: null,
    category: "data",
    published_at: "2026-06-25",
  },
];
const NEWS = mobileNewsEntries(NEWS_ROWS);
const PARTNER_ROWS = PARTNERS.map((p, i) => ({
  id: String(i),
  name: p.name.en,
  logo: p.logo,
  lightLogo: null,
  height: 96,
}));

/** renderToStaticMarkup escapes quotes/apostrophes; decode before text checks. */
function decodeEntities(markup: string): string {
  return markup
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function renderHome(lang: "ar" | "en"): string {
  return decodeEntities(
    renderToStaticMarkup(
      createElement(MobileHomeView, {
        lang,
        onToggleLang: () => {},
        news: NEWS,
        partners: PARTNER_ROWS,
      }),
    ),
  );
}

function anchors(markup: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*href="([^"]*)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup)) !== null) out.push(m[1]);
  return out;
}

function ids(markup: string): Set<string> {
  const out = new Set<string>();
  const re = /\sid="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup)) !== null) out.add(m[1]);
  return out;
}

function localAssets(markup: string): string[] {
  const out: string[] = [];
  const img = /<img\b[^>]*src="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = img.exec(markup)) !== null) out.push(m[1]);
  const poster = /poster="([^"]*)"/g;
  while ((m = poster.exec(markup)) !== null) out.push(m[1]);
  return out;
}

const arMarkup = () => renderHome("ar");
const enMarkup = () => renderHome("en");

describe("mobile homepage rendered output", () => {
  it("renders the exact approved opening headline with matching dir/lang", () => {
    const ar = arMarkup();
    expect(ar).toContain(OPENING_HEADLINE.ar);
    expect(ar).toContain('dir="rtl"');
    expect(ar).toContain('lang="ar"');
    const en = enMarkup();
    expect(en).toContain(OPENING_HEADLINE.en);
    expect(en).toContain('dir="ltr"');
    expect(en).toContain('lang="en"');
  });

  it("sends the primary CTA to learning (same tab) and the secondary action to the initiative", () => {
    const hrefs = new Set(anchors(arMarkup()));
    expect(OPENING.primary.href).toBe("/learning-management-system");
    expect(hrefs.has(OPENING.primary.href)).toBe(true);
    expect(hrefs.has(OPENING.secondary.href)).toBe(true);
  });

  it("exposes every desktop destination verbatim or via its equivalent", () => {
    // Destinations from the real desktop source file — not a fixture list.
    // Pure in-page anchors (#hero-sec, …) are excluded here; the id test
    // below proves every rendered fragment resolves instead.
    // Database regions are always replaced, so their sample links don't count.
    const desktopSource = homeHtml.replace(
      /<!-- db:([\w-]+):start -->[\s\S]*?<!-- db:\1:end -->/g,
      "",
    );
    const desktopHrefs = new Set<string>();
    const re = /href="([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(desktopSource)) !== null) {
      if (!m[1].startsWith("#")) desktopHrefs.add(m[1]);
    }

    const rendered = new Set([...anchors(arMarkup()), ...anchors(enMarkup())]);
    const missing = [...desktopHrefs].filter(
      (h) => !rendered.has(h) && !rendered.has(DESKTOP_HREF_EQUIVALENTS[h] ?? ""),
    );
    const detail = `missing mobile destinations: ${missing.join(", ")}`;
    expect(missing, detail).toEqual([]);
  });

  it("maps the desktop About-page section links to this page's sections", () => {
    expect(Object.keys(DESKTOP_HREF_EQUIVALENTS).sort()).toEqual(
      ["/about#communities-h", "/about#standing-h"].sort(),
    );
    for (const value of Object.values(DESKTOP_HREF_EQUIVALENTS)) {
      expect(value.startsWith("/") || value.startsWith("#")).toBe(true);
      expect(value.startsWith("https://aisyria.org")).toBe(false);
    }
  });

  it("never renders a link to https://aisyria.org", () => {
    for (const markup of [arMarkup(), enMarkup()]) {
      for (const href of anchors(markup)) {
        expect(href.startsWith("https://aisyria.org"), `leaked desktop href: ${href}`).toBe(false);
      }
    }
  });

  it("renders no autoplaying video on the phone homepage", () => {
    for (const markup of [arMarkup(), enMarkup()]) {
      expect(markup).not.toContain("hero-scrub.mp4");
      expect(markup).not.toContain("hero-tree-loop.mp4");
      expect(markup).not.toContain("tv-interview-");
      expect(markup).not.toContain("<video");
    }
  });

  it("renders the pixel-tree hero with Abu Al-Joud and the headline gated on scroll", () => {
    for (const markup of [arMarkup(), enMarkup()]) {
      const hero = markup.match(/<section\b[^>]*\bid="hero-sec"[\s\S]*?<\/section>/)?.[0];
      expect(hero).toBeDefined();
      expect(hero).toContain('data-hero-layout="centred"');
      expect(hero).toContain('id="hero-canvas"');
      expect(hero).not.toContain("<video");
      expect(hero).not.toContain("mh-is-revealed");
      expect(hero).toContain("mh-hero-guide");
      expect(hero).toContain("/cinematic/images/abu-al-joud-comic-welcome.webp");
    }
  });

  it("gates desktop visibility with the shared media query", () => {
    for (const markup of [arMarkup(), enMarkup()]) {
      expect(markup).toContain(DESKTOP_HOME_QUERY);
      expect(markup).toContain(".mobile-home.mh-gate{visibility:hidden}");
      expect(markup).toContain(".mobile-home.mh-gate{visibility:visible!important}");
    }
  });

  it("resolves every in-page anchor to a rendered section id", () => {
    const markup = arMarkup();
    const have = ids(markup);
    const fragments = new Set(
      anchors(markup)
        .filter((h) => h.startsWith("#"))
        .map((h) => h.slice(1)),
    );
    expect(fragments.size).toBeGreaterThan(3);
    for (const f of fragments) {
      expect(have.has(f), `in-page target missing: #${f}`).toBe(true);
    }
    for (const required of ["main-content", "hero-sec", "news", "mission", "partners", "faq"]) {
      expect(have.has(required), `section id missing: #${required}`).toBe(true);
    }
  });

  it("maps every local href to a real route file or community page", () => {
    const rendered = new Set([...anchors(arMarkup()), ...anchors(enMarkup())]);
    const local = [...rendered].filter((h) => h.startsWith("/") && !h.startsWith("//"));
    expect(local.length).toBeGreaterThan(10);
    for (const href of local) {
      const [pathname] = href.split("#");
      if (pathname.startsWith("/communities/")) {
        const key = pathname.slice("/communities/".length);
        const known = (COMMUNITY_KEYS as readonly string[]).includes(key);
        expect(known, `unknown community: ${href}`).toBe(true);
        expect(existsSync(path.join(ROOT, "src/routes/communities.$key.tsx"))).toBe(true);
        continue;
      }
      if (pathname.startsWith("/news/")) {
        expect(existsSync(path.join(ROOT, "src/routes/news.$id.tsx"))).toBe(true);
        continue;
      }
      const table: Record<string, string> = {
        "/": "src/routes/index.tsx",
        "/about": "src/routes/about.tsx",
        "/partners": "src/routes/partners.tsx",
        "/initiative": "src/routes/initiative.index.tsx",
        "/contact": "src/routes/contact.tsx",
        "/news": "src/routes/news.index.tsx",
        "/learning-management-system": "src/routes/learning-management-system.tsx",
        "/resources/ai-tools": "src/routes/resources.ai-tools.tsx",
        "/one-million-initiative-home": "src/routes/one-million-initiative-home.tsx",
        "/registration": "src/routes/registration.tsx",
        "/learning-management-system/catalog": "src/routes/learning-management-system.catalog.tsx",
      };
      expect(table[pathname] !== undefined, `unexpected local route: ${href}`).toBe(true);
      const routeFile = path.join(ROOT, table[pathname]);
      expect(existsSync(routeFile), `missing route file for ${href}`).toBe(true);
    }
  });

  it("references only local assets that exist in public/", () => {
    const markup = arMarkup();
    const files = localAssets(markup).filter((s) => s.startsWith("/"));
    expect(files.length).toBeGreaterThan(20);
    for (const src of files) {
      const disk = path.join(ROOT, "public", src.split("?")[0]);
      expect(existsSync(disk), `missing asset: ${src}`).toBe(true);
    }
  });

  it("restricts photography to news and keeps reviewed graphics elsewhere", () => {
    const nonNewsAssets = new Set([
      "/cinematic/images/initiative-tree.svg",
      "/cinematic/images/logo-tree-transparent.png",
      "/cinematic/images/abu-al-joud-comic-welcome.webp",
      "/cinematic/mobile/saae-wordmark-ar-light.webp",
      "/cinematic/mobile/saae-wordmark-en-light.webp",
      "/cinematic/images/saae-map.png",
      "/cinematic/images/faq-phone-mockup.avif",
      ...PARTNERS.map((partner) => partner.logo),
    ]);
    for (const markup of [arMarkup(), enMarkup()]) {
      const newsSection = markup.match(/<section\b[^>]*\bid="news"[\s\S]*?<\/section>/)?.[0];
      expect(newsSection).toBeDefined();
      for (const story of NEWS) expect(newsSection).toContain(story.image);
      const outsideNews = markup.replace(newsSection!, "");
      for (const src of localAssets(outsideNews)) {
        expect(nonNewsAssets.has(src), `unreviewed asset outside news: ${src}`).toBe(true);
      }
    }
  });

  it("renders all communities, stories, partners, FAQs and mission steps", () => {
    const ar = arMarkup();
    const en = enMarkup();
    const both = `${ar}\n${en}`;
    // The hero's community card links one community at a time and names all
    // eight in its pips; the card's arrows and pips reach the rest.
    expect(both).toContain(`/communities/${COMMUNITIES[0].key}`);
    for (const c of COMMUNITIES) {
      expect(both).toContain(c.name.ar);
      expect(both).toContain(c.name.en);
    }
    expect(COMMUNITIES).toHaveLength(8);
    expect(COMMUNITIES[0].key).toBe("software");
    expect(COMMUNITIES.map((c) => c.key)).not.toContain("quality");
    for (const n of NEWS) {
      expect(both).toContain(n.href);
      expect(both).toContain(n.headline.ar);
      expect(both).toContain(n.headline.en);
    }
    expect(NEWS).toHaveLength(2);
    for (const p of PARTNERS) {
      expect(both).toContain(p.name.en);
    }
    expect(PARTNERS).toHaveLength(23);
    for (const f of FAQS) {
      expect(both).toContain(f.question.ar);
      expect(both).toContain(f.question.en);
    }
    expect(FAQS).toHaveLength(5);
    for (const s of MISSION_STEPS) {
      expect(both).toContain(s.title.ar);
      expect(both).toContain(s.title.en);
    }
    expect(MISSION_STEPS).toHaveLength(3);
  });

  it("shows a status line instead of the news carousel when there are no stories", () => {
    const render = (lang: "ar" | "en", newsFailed: boolean) =>
      decodeEntities(
        renderToStaticMarkup(
          createElement(MobileHomeView, {
            lang,
            onToggleLang: () => {},
            news: [],
            newsFailed,
            partners: [],
          }),
        ),
      );
    const empty = render("en", false);
    expect(empty).toContain(NEWS_COPY.empty.en);
    expect(empty).not.toContain("mh-news-card");
    expect(render("ar", true)).toContain(NEWS_COPY.failed.ar);
  });

  it("renders final number values in SSR markup (count-up is enhancement only)", () => {
    const ar = arMarkup();
    for (const a of ACHIEVEMENTS.map((x) => x.value)) {
      expect(ar).toContain(a);
    }
    expect(ar).toContain(">9<");
  });
});

describe("mobile homepage source contracts", () => {
  it("matches FAQ and mission counts with the desktop source file", () => {
    const faqCount = (homeHtml.match(/class="faq-item/g) ?? []).length;
    expect(FAQS).toHaveLength(faqCount);
    const missionCount = (homeHtml.match(/class="mission-item/g) ?? []).length;
    expect(MISSION_STEPS).toHaveLength(missionCount);
  });

  it("keeps mission copy free of invented metrics", () => {
    const missionText = MISSION_STEPS.map((s) => `${s.title.en} ${s.body.en}`).join(" ");
    for (const invented of ["5,000", "120+", "30+", "testimonial"]) {
      expect(missionText).not.toContain(invented);
    }
  });
});
