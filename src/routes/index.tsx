import { useEffect } from "react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { FeaturedNews } from "@/components/site/FeaturedNews";
import { Communities } from "@/components/site/Communities";
import { Achievements } from "@/components/site/Achievements";
import { Partners } from "@/components/site/Partners";
import { Assistant } from "@/components/site/Assistant";
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
    const raf = window.requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [location.hash]);

  return (
    <div id="home" className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <FeaturedNews />
        <Communities />
        <Achievements />
        <Partners />
        <Assistant />
      </main>
      <Footer />
    </div>
  );
}
