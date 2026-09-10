import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/contact.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/contact.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SAAE | Start a conversation that goes somewhere" },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/contact.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
    ],
  }),
  component: Page,
});

function Page() {
  return <CinematicPage html={pageHtml} scripts={SCRIPTS} bodyClass="page-contact" />;
}
