import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/initiative.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/initiative.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

const HTML_ATTRS = {
  "data-title-en": "SAAE | One Million Syrian AI Users",
  "data-title-ar": "الجمعية | مبادرة مليون مستخدم ذكاء اصطناعي سوري",
};

export const Route = createFileRoute("/initiative/")({
  head: () => ({
    meta: [
      { title: "SAAE | One Million Syrian AI Users" },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/initiative.css" },
    ],
  }),
  component: Page,
});

function Page() {
  return <CinematicPage html={pageHtml} scripts={SCRIPTS} htmlAttrs={HTML_ATTRS} />;
}
