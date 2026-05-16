import { useEffect } from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { FeaturedNews } from "@/components/site/FeaturedNews";
import { Communities } from "@/components/site/Communities";
import { Achievements } from "@/components/site/Achievements";
import { Partners } from "@/components/site/Partners";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAAE — Syrian Association for AI & Entrepreneurship" },
      {
        name: "description",
        content:
          "The first official Syrian organization dedicated to artificial intelligence, innovation, and entrepreneurship — empowering Syrian youth and rebuilding technological capacity.",
      },
      { property: "og:title", content: "SAAE — Syrian Association for AI & Entrepreneurship" },
      {
        property: "og:description",
        content: "Education, research, and entrepreneurship building Syria's AI future, line by line.",
      },
      {
        property: "og:image",
        content:
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const location = useLocation();
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
        <FeaturedNews />
        <Partners />
        <Achievements />
        <Communities />
      </main>
      <Footer />
    </div>
  );
}
