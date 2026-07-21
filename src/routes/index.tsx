import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { FeaturedNews, type HomeNewsRow } from "@/components/site/FeaturedNews";
import { Communities } from "@/components/site/Communities";
import { LmsCta } from "@/components/site/LmsCta";
import { InitiativeCta } from "@/components/site/InitiativeCta";
import { Achievements } from "@/components/site/Achievements";
import { Partners } from "@/components/site/Partners";
import { Footer } from "@/components/site/Footer";
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
  const location = useLocation();
  const { news } = Route.useLoaderData();

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

  useEffect(() => {
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return;
    let cancelled = false;
    let attempts = 0;
    const doScroll = (el: HTMLElement) => {
      if (cancelled) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(hash);
      if (el) {
        // Override TanStack Router's scrollRestoration (runs after mount) by
        // scheduling a few delayed scrolls.
        doScroll(el);
        window.setTimeout(() => doScroll(el), 60);
        window.setTimeout(() => doScroll(el), 200);
        return;
      }
      if (attempts++ < 40) {
        window.setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
    return () => {
      cancelled = true;
    };
  }, [location.hash]);

  return (
    <div id="home" className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <FeaturedNews initialNews={news} />
        <LmsCta />
        <InitiativeCta />
        <Partners />
        <Achievements />
        <Communities />
      </main>
      <Footer />
    </div>
  );
}
