import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageV2 } from "@/components/site-v2/PageV2";
import { HeroStage } from "@/components/site-v2/HeroStage";
import { HomeNewsReel } from "@/components/site-v2/HomeNewsReel";
import { HomePartners } from "@/components/site-v2/HomePartners";
import { MissionReel } from "@/components/site-v2/MissionReel";
import { HomeFaq } from "@/components/site-v2/HomeFaq";
import type { HomeNewsRow } from "@/components/site/FeaturedNews";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { data } = await supabase
      .from("news")
      .select("id,title,title_ar,title_en,image_url,category,published_at")
      .eq("show_on_home", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    return { news: (data ?? []) as HomeNewsRow[] };
  },
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
        content: "Education, research, and entrepreneurship building Syria's AI future, line by line.",
      },
      { property: "og:url", content: "https://aisyria.org/" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/" },
    ],
  }),
  component: Index,
});

function Index() {
  const { news } = Route.useLoaderData();
  const { t } = useLang();
  const h = t.v2.home;

  // Prevent the browser's scroll restoration from flashing a previous
  // position (e.g. Partners section) before TanStack Router scrolls to top.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  return (
    <PageV2
      ribbonSections={[
        { id: "news", label: h.newsEyebrow },
        { id: "partners", label: h.partnersEyebrow },
        { id: "mission", label: h.missionEyebrow },
        { id: "faq", label: h.faqEyebrow },
      ]}
    >
      <HeroStage />
      <HomeNewsReel news={news} />
      <HomePartners />
      <MissionReel />
      <HomeFaq />
    </PageV2>
  );
}
