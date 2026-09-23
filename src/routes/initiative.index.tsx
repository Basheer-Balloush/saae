import { useCallback, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import pageHtml from "@/components/cinematic/html/initiative.html?raw";
import { getInitiativeStats, getTopDonors } from "@/lib/initiative.functions";
import {
  renderDonors,
  renderNote,
  renderSeatsCovered,
  type Donor,
} from "@/components/initiative/live-leaderboard";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { InitiativeActionDialogs } from "@/components/initiative/InitiativeActionDialogs";

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

/* How often the board re-reads the records while the page is open, matching
   the interval the older initiative home page already polls on. */
const REFRESH_MS = 30000;
const TOP_SPONSORS = 5;

const currentLang = (): "ar" | "en" => (document.documentElement.lang === "en" ? "en" : "ar");

/**
 * Replaces the prototype's hand-written sponsor snapshot with the live
 * donation records.
 *
 * The snapshot stays in the markup and is what renders on the server, so the
 * band is never empty on first paint and never shifts. It is only replaced
 * once real rows arrive; if the read fails the snapshot simply stays, with its
 * own "snapshot" note intact and honest.
 */
function useLiveSponsors() {
  const donorsFn = useServerFn(getTopDonors);
  const statsFn = useServerFn(getInitiativeStats);
  /* Held so a language switch, or whichever of the two reads lands second, can
     repaint from what is already known instead of re-reading the records. */
  const latest = useRef<Donor[] | null>(null);
  const funded = useRef<number | null>(null);

  const paint = useCallback(() => {
    const donors = latest.current;
    /* The total is only painted alongside live rows: on its own it would
       contradict the snapshot still underneath it. */
    if (!donors) return;
    const lang = currentLang();
    if (!renderDonors(document, donors, lang)) return;
    renderNote(document, lang);
    if (funded.current !== null) renderSeatsCovered(document, funded.current);
  }, []);

  useEffect(() => {
    let live = true;

    const read = () => {
      donorsFn({ data: { limit: TOP_SPONSORS } })
        .then((rows) => {
          if (!live) return;
          latest.current = rows as Donor[];
          paint();
        })
        .catch(() => {});
      statsFn()
        .then((stats) => {
          if (!live) return;
          funded.current = stats.totalFunded;
          paint();
        })
        .catch(() => {});
    };

    read();
    const timer = setInterval(read, REFRESH_MS);
    /* initiative.js re-applies its own translations on this event; the rows
       carry no data-i18n keys, but the note and the empty state are ours to
       re-paint. */
    window.addEventListener("saae:languagechange", paint);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("saae:languagechange", paint);
    };
  }, [donorsFn, statsFn, paint]);
}

function Page() {
  useLiveSponsors();
  return (
    <>
      <CinematicPage html={pageHtml} scripts={SCRIPTS} htmlAttrs={HTML_ATTRS} />
      <InitiativeActionDialogs />
    </>
  );
}
