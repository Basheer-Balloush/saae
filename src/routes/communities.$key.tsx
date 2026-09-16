import { useEffect, useMemo } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/communities.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { supabase } from "@/integrations/supabase/client";
import {
  COMMUNITY_KEYS,
  COMMUNITY_LABELS_AR,
  COMMUNITY_LABELS_EN,
  type CommunityKey,
} from "@/lib/communityCategories";
import { COMMUNITY_ICON_SVG } from "@/lib/communityIcons";
import {
  DEFAULT_METRICS,
  DETAILS,
  METRICS_BY_KEY,
  MISSION,
  SHORT_NAME,
  TAGLINE,
} from "@/features/website/communities/content";
import {
  COMMUNITY_NEWS_COLUMNS,
  applyCommunityPage,
  type CommunityNewsResult,
  type CommunityNewsRow,
} from "@/features/website/communities/render";

/* The partner register's scripts: language pill, radial menu, text reveal. */
const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

const OG_IMAGE = "https://aisyria.org/cinematic/images/about-wordmark.webp";

export const Route = createFileRoute("/communities/$key")({
  beforeLoad: ({ params }) => {
    if (!(COMMUNITY_KEYS as readonly string[]).includes(params.key)) {
      throw notFound();
    }
  },
  loader: async ({ params }): Promise<CommunityNewsResult> => {
    const k = params.key;
    try {
      const { data, error } = await supabase
        .from("news")
        .select(COMMUNITY_NEWS_COLUMNS)
        .or(`category.eq.${k},categories.cs.{${k}}`)
        .order("published_at", { ascending: false })
        .limit(10);
      if (error) return { rows: [], failed: true };
      return { rows: (data ?? []) as unknown as CommunityNewsRow[], failed: false };
    } catch {
      return { rows: [], failed: true };
    }
  },
  head: ({ params }) => {
    const k = params.key as CommunityKey;
    const nameAr = COMMUNITY_LABELS_AR[k] ?? "مجتمع";
    const nameEn = COMMUNITY_LABELS_EN[k] ?? "Community";
    const url = `https://aisyria.org/communities/${params.key}`;
    return {
      meta: [
        { title: `${nameAr} — SAAE` },
        {
          name: "description",
          content: `${nameEn} — part of the SAAE ecosystem. Activities, research, achievements and how to join.`,
        },
        { property: "og:title", content: `${nameEn} — SAAE` },
        { property: "og:description", content: MISSION[k]?.en ?? "" },
        { property: "og:url", content: url },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:image", content: OG_IMAGE },
        { name: "theme-color", content: "#144248" },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "stylesheet", href: "/cinematic/css/communities-inline.css" },
        { rel: "stylesheet", href: "/cinematic/css/motion-button.css" },
        { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
        { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
      ],
    };
  },
  notFoundComponent: () => (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#06232a",
        color: "#e7f1f0",
        fontFamily: "Cairo, Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <div>
        <h1>404</h1>
        <p>Community not found.</p>
        <a href="/about#communities-h" style={{ color: "#77e0e8" }}>
          SAAE communities
        </a>
      </div>
    </main>
  ),
  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100vh", padding: 40 }}>
      <p>{error instanceof Error ? error.message : String(error)}</p>
    </div>
  ),
  component: CommunityPage,
});

/* The community before or after this one, wrapping at both ends. */
function neighbour(k: CommunityKey, step: -1 | 1) {
  const i = (COMMUNITY_KEYS.indexOf(k) + step + COMMUNITY_KEYS.length) % COMMUNITY_KEYS.length;
  const key = COMMUNITY_KEYS[i];
  return { key, index: i + 1, name: SHORT_NAME[key] };
}

function CommunityPage() {
  const { key } = Route.useParams();
  const k = key as CommunityKey;
  const news = Route.useLoaderData();
  const html = useMemo(
    () =>
      applyCommunityPage(
        pageHtml,
        {
          index: COMMUNITY_KEYS.indexOf(k) + 1,
          total: COMMUNITY_KEYS.length,
          name: { en: COMMUNITY_LABELS_EN[k], ar: COMMUNITY_LABELS_AR[k] },
          shortName: SHORT_NAME[k],
          tagline: TAGLINE[k],
          prev: neighbour(k, -1),
          next: neighbour(k, 1),
          mission: MISSION[k],
          iconSvg: COMMUNITY_ICON_SVG[k],
          details: DETAILS[k] ?? [],
          metrics: METRICS_BY_KEY[k] ?? DEFAULT_METRICS,
        },
        news,
      ),
    [k, news],
  );

  /* The join buttons are in the page markup. The assistant opens with the
     request already written, in whichever language the page is showing. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-community-join]"))
        return;
      const prefill =
        document.documentElement.lang === "ar"
          ? `أرغب بالانضمام إلى ${COMMUNITY_LABELS_AR[k]}. كيف يمكنني التسجيل والمشاركة؟`
          : `I'd like to join the ${COMMUNITY_LABELS_EN[k]}. How can I sign up and get involved?`;
      window.dispatchEvent(new CustomEvent("assistant:open", { detail: { prefill } }));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [k]);

  return <CinematicPage html={html} scripts={SCRIPTS} />;
}
