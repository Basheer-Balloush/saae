import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import pageHtml from "@/components/cinematic/html/about.html?raw";
import { CinematicPage, type CinematicScript } from "@/components/cinematic/CinematicPage";
import { supabase } from "@/integrations/supabase/client";
import {
  MEMBER_COLUMNS,
  applyMembers,
  renderMembersHtml,
  type MemberRow,
} from "@/lib/cinematic-db-content";

const SCRIPTS: CinematicScript[] = [
  { src: "/cinematic/js/about-inline.js" },
  { src: "/cinematic/js/language.js" },
  { src: "/cinematic/js/navigation.js" },
  { src: "/cinematic/js/text-effect.js" },
  { src: "/cinematic/js/anime.umd.min.js" },
  { src: "/cinematic/js/motion-anime.js" },
];

export const Route = createFileRoute("/about")({
  loader: async () => {
    const { data } = await supabase
      .from("members")
      .select(MEMBER_COLUMNS)
      .order("display_order", { ascending: true });
    return { members: renderMembersHtml((data ?? []) as MemberRow[]) };
  },
  head: () => ({
    meta: [{ title: "About | SAAE" }, { name: "theme-color", content: "#144248" }],
    links: [
      { rel: "stylesheet", href: "/cinematic/css/about-inline.css" },
      { rel: "stylesheet", href: "/cinematic/css/navigation.css" },
      { rel: "stylesheet", href: "/cinematic/css/db-content.css" },
    ],
  }),
  component: Page,
});

function Page() {
  const { members } = Route.useLoaderData();
  const html = useMemo(() => applyMembers(pageHtml, members), [members]);
  return <CinematicPage html={html} scripts={SCRIPTS} />;
}
