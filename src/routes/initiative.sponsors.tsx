import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/initiative-sponsors.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { InitiativeActionDialogs } from "@/components/initiative/InitiativeActionDialogs";
import {
  applySponsorDirectory,
  type SponsorDirectory,
  type SponsorRow,
} from "@/components/initiative/sponsor-directory";
import { getAllDonors } from "@/lib/initiative.functions";

/* The initiative page's own scripts: initiative.js carries this page's
   translations and the section reveals, and skips everything it cannot find. */
const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/initiative.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

const HTML_ATTRS = {
  "data-title-en": "SAAE | Initiative sponsors",
  "data-title-ar": "الجمعية | داعمو مبادرة المليون",
};

async function loadSponsors(): Promise<SponsorDirectory> {
  try {
    return { sponsors: (await getAllDonors()) as SponsorRow[], failed: false };
  } catch {
    return { sponsors: [], failed: true };
  }
}

export const Route = createFileRoute("/initiative/sponsors")({
  loader: () => loadSponsors(),
  head: () => ({
    meta: [
      { title: "SAAE | Initiative sponsors" },
      {
        name: "description",
        content:
          "Every organisation and person sponsoring seats in the One Million Syrian AI Users initiative.",
      },
      { name: "theme-color", content: "#144248" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/initiative/sponsors" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/initiative.css" },
      { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
    ],
  }),
  component: Page,
});

function Page() {
  const directory = Route.useLoaderData();
  const html = useMemo(() => applySponsorDirectory(pageHtml, directory), [directory]);
  return (
    <>
      <CinematicPage html={html} scripts={SCRIPTS} htmlAttrs={HTML_ATTRS} />
      <InitiativeActionDialogs />
    </>
  );
}
