import { createFileRoute } from "@tanstack/react-router";
import homeHtml from "@/components/cinematic/html/home.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/home-inline.js" },
  { src: "/cinematic/js/hero-instrument.js", module: true },
  { src: "/cinematic/js/sections.js" },
  { src: "/cinematic/js/gsap.min.js" },
  { src: "/cinematic/js/ScrollTrigger.min.js" },
  { src: "/cinematic/js/lenis.min.js" },
  { src: "/cinematic/js/scroll-engine.js" },
  { src: "/cinematic/js/motion.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

export const Route = createFileRoute("/")({
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
      {
        rel: "preload",
        as: "image",
        href: "/cinematic/images/hero-static.jpg",
        fetchPriority: "high",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return <CinematicPage html={homeHtml} scripts={SCRIPTS} htmlClass="site-loading" />;
}
