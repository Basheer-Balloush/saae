import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/features/website/cinematic/html/news-buildex-aleppo.html?raw";
import { CinematicPage, type CinematicScript } from "@/features/website/cinematic/CinematicPage";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/news-buildex-aleppo-inline.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
];

export const Route = createFileRoute("/news/buildex-aleppo")({
  head: () => ({
    meta: [{ title: "News | SAAE" }, { name: "theme-color", content: "#144248" }],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/news-buildex-aleppo-inline.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/motion-button.css" },
    ],
  }),
  component: Page,
});

function Page() {
  return <CinematicPage html={pageHtml} scripts={SCRIPTS} />;
}
