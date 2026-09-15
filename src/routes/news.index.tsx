import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/news.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { supabase } from "@/integrations/supabase/client";
import {
  NEWS_CARD_COLUMNS,
  applyNewsList,
  renderNewsListHtml,
  type NewsCardRow,
} from "@/lib/cinematic-db-content";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/news-inline.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

export const Route = createFileRoute("/news/")({
  loader: async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(NEWS_CARD_COLUMNS)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });
      return { list: renderNewsListHtml((data ?? []) as NewsCardRow[], Boolean(error)) };
    } catch {
      return { list: renderNewsListHtml([], true) };
    }
  },
  head: () => ({
    meta: [{ title: "News | SAAE" }, { name: "theme-color", content: "#144248" }],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/news-inline.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/motion-button.css" },
      { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
    ],
  }),
  component: Page,
});

function Page() {
  const { list } = Route.useLoaderData();
  const html = useMemo(() => applyNewsList(pageHtml, list), [list]);
  return <CinematicPage html={html} scripts={SCRIPTS} />;
}
