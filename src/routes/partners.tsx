import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { loadPartners } from "@/features/website/partners/data";
import { applyPartnerDirectory } from "@/features/website/partners/render";
import pageHtml from "@/components/cinematic/html/partners.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { DesktopMotionFooter } from "@/components/home/DesktopMotionFooter";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

export const Route = createFileRoute("/partners")({
  loader: () => loadPartners(),
  head: () => ({
    meta: [{ title: "Partners | SAAE" }, { name: "theme-color", content: "#144248" }],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/partners-inline.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
    ],
  }),
  component: Page,
});

function Page() {
  const partners = Route.useLoaderData();
  const html = useMemo(() => applyPartnerDirectory(pageHtml, partners), [partners]);
  return (
    <>
      <CinematicPage html={html} scripts={SCRIPTS} />
      <DesktopMotionFooter targetSelector="#partners-motion-footer-root" />
    </>
  );
}
