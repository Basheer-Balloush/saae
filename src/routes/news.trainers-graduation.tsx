import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/news-trainers-graduation.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/news-trainers-graduation-inline.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
];

export const Route = createFileRoute("/news/trainers-graduation")({
  head: () => ({
    meta: [{ title: "News | SAAE" }, { name: "theme-color", content: "#144248" }],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/news-trainers-graduation-inline.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/motion-button.css" },
    ],
  }),
  component: Page,
});

function Page() {
  return <CinematicPage html={pageHtml} scripts={SCRIPTS} />;
}
