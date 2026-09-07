import { createFileRoute } from "@tanstack/react-router";
import { PublicSiteLayout } from "@/components/public/PublicSiteLayout";
import { CinematicHero } from "@/components/public/home/CinematicHero";
import { HomeNewsReel, type PublicNewsRow } from "@/components/public/home/HomeNewsReel";
import { PartnersStream } from "@/components/public/home/PartnersStream";
import { MissionSection } from "@/components/public/home/MissionSection";
import { FaqSection } from "@/components/public/home/FaqSection";
import { initHeroCinema } from "@/lib/public-site/hero-cinema";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { data } = await supabase
      .from("news")
      .select(
        "id,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,image_url,category,published_at",
      )
      .eq("show_on_home", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    return { news: (data ?? []) as PublicNewsRow[] };
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
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://aisyria.org/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://aisyria.org/" }],
  }),
  component: Index,
});

function Index() {
  const { news } = Route.useLoaderData();

  return (
    <PublicSiteLayout enhancers={[initHeroCinema]}>
      <CinematicHero />
      <main id="main-content">
        <div className="journey-content">
          <div className="ambient" aria-hidden="true">
            <span className="orb-petrol" />
            <span className="orb-olive" />
            <span className="orb-ember" />
            <span className="ambient-grid" />
          </div>
          <HomeNewsReel news={news} />
          <PartnersStream />
          <MissionSection />
          <FaqSection />
        </div>
      </main>
    </PublicSiteLayout>
  );
}
