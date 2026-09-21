import React, { Suspense, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import homeHtml from "@/components/cinematic/html/home.html?raw";
import type { CinematicScript } from "@/components/cinematic/CinematicPage";
import { MobileHome } from "@/components/home/MobileHome";
import { DesktopFaqScroll } from "@/components/home/DesktopFaqScroll";
import type { NewsEntry } from "@/components/home/mobile-home-content";
import { useHeroCapability } from "@/hooks/useHeroCapability";
import { supabase } from "@/integrations/supabase/client";
import { loadPartners, type Partner } from "@/features/website/partners/data";
import { applyHomePartners } from "@/features/website/partners/render";
import {
  NEWS_CARD_COLUMNS,
  applyHomeNews,
  mobileNewsEntries,
  renderHomeNews,
  replaceRegion,
  type NewsCardRow,
} from "@/lib/cinematic-db-content";

// Desktop-only cinematic shell. Lazy so the phone import graph stays light.
const CinematicPageLazy = React.lazy(() =>
  import("@/components/cinematic/CinematicPage").then((m) => ({ default: m.CinematicPage })),
);
const HomepageNewsPortalLazy = React.lazy(() =>
  import("@/components/home/HomepageNews").then((m) => ({ default: m.HomepageNewsPortal })),
);

// Desktop-only partners logo carousel, portalled into the cinematic markup.
const DesktopPartnerCarouselLazy = React.lazy(() =>
  import("@/components/home/DesktopPartnerCarousel").then((m) => ({
    default: m.DesktopPartnerCarousel,
  })),
);

const DesktopMotionFooterLazy = React.lazy(() =>
  import("@/components/home/DesktopMotionFooter").then((m) => ({
    default: m.DesktopMotionFooter,
  })),
);

const DesktopSectionGuideLazy = React.lazy(() =>
  import("@/components/home/DesktopSectionGuide").then((m) => ({
    default: m.DesktopSectionGuide,
  })),
);

/* Desktop only: the phone page loads none of these. The hero's two scripts
   come first and the rest run after them in order. They stay one list so the
   page-ready events the later scripts wait for are replayed once, after all
   of them have run. */
const DESKTOP_SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/home-inline.js" },
  { src: "/cinematic/js/hero-instrument.js", module: true },
  { src: "/cinematic/js/sections.js" },
  { src: "/cinematic/js/gsap.min.js" },
  { src: "/cinematic/js/ScrollTrigger.min.js" },
  { src: "/cinematic/js/lenis.min.js" },
  { src: "/cinematic/js/scroll-engine.js" },
  { src: "/cinematic/js/checkpoints.js" },
  { src: "/cinematic/js/motion.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
  { src: "/cinematic/js/home-mobile.js" },
  { src: "/cinematic/js/partner-handoff.js" },
];

export const Route = createFileRoute("/")({
  loader: async () => {
    const [newsResult, partners] = await Promise.all([
      (async () => {
        try {
          const { data, error } = await supabase
            .from("news")
            .select(NEWS_CARD_COLUMNS)
            .eq("show_on_home", true)
            .order("published_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(4);
          const rows = (data ?? []) as NewsCardRow[];
          const failed = Boolean(error);
          return {
            news: renderHomeNews(rows, failed),
            mobileNews: mobileNewsEntries(rows),
            newsFailed: failed,
          };
        } catch {
          return { news: renderHomeNews([], true), mobileNews: [], newsFailed: true };
        }
      })(),
      loadPartners(true),
    ]);
    return { ...newsResult, partners };
  },
  head: () => ({
    meta: [
      { title: "SAAE — Syrian Association for AI & Entrepreneurship" },
      {
        name: "description",
        content:
          "Syria's first official organization for AI, innovation and entrepreneurship — empowering youth and rebuilding technological capacity.",
      },
      { property: "og:title", content: "SAAE — AI & Entrepreneurship in Syria" },
      {
        property: "og:description",
        content:
          "Education, research, and entrepreneurship building Syria's AI future, line by line.",
      },
      { property: "og:url", content: "https://aisyria.org/" },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/" },
      { rel: "stylesheet", href: "/cinematic/css/home.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/motion-button.css" },
      { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
      { rel: "stylesheet", href: "/cinematic/css/home-mobile.css" },
    ],
  }),
  component: Home,
});

function DesktopHome({
  html,
  news,
  newsFailed,
  partners,
}: {
  html: string;
  news: NewsEntry[];
  newsFailed: boolean;
  partners: Partner[];
}) {
  return (
    <>
      <Suspense fallback={null}>
        <CinematicPageLazy html={html} scripts={DESKTOP_SCRIPTS} htmlClass="site-loading" />
        <HomepageNewsPortalLazy html={html} news={news} newsFailed={newsFailed} />
      </Suspense>
      <Suspense fallback={null}>
        <DesktopPartnerCarouselLazy partners={partners} />
      </Suspense>
      <Suspense fallback={null}>
        <DesktopSectionGuideLazy />
      </Suspense>
      <DesktopFaqScroll />
      <Suspense fallback={null}>
        <DesktopMotionFooterLazy />
      </Suspense>
    </>
  );
}

function Home() {
  const { news, mobileNews, newsFailed, partners } = Route.useLoaderData();
  const html = useMemo(
    () =>
      replaceRegion(
        applyHomePartners(applyHomeNews(homeHtml, news), partners),
        "home-news-feature",
        '<section class="section news hn-section" id="news" aria-labelledby="news-title"><div id="home-news-slot"></div></section>',
      ),
    [news, partners],
  );
  const capability = useHeroCapability();
  // Mobile-first: SSR, first paint, phones and reduced motion get the phone
  // page; only a confirmed desktop mounts the cinematic enhancement.
  if (capability === "desktop") {
    return (
      <DesktopHome
        html={html}
        news={mobileNews}
        newsFailed={newsFailed}
        partners={partners.failed ? [] : partners.partners}
      />
    );
  }
  return (
    <MobileHome
      news={mobileNews}
      newsFailed={newsFailed}
      partners={partners.partners}
      partnersFailed={partners.failed}
    />
  );
}
