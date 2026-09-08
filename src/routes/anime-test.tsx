import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { animate, stagger, createTimeline } from "animejs";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { AnimeSvgHero } from "@/components/site/AnimeSvgHero";

export const Route = createFileRoute("/anime-test")({
  head: () => ({
    meta: [
      { title: "Anime Test — SAAE Motion Lab" },
      {
        name: "description",
        content:
          "A motion playground for SAAE: staggered grids, counters and timelines built with anime.js before rolling them into the home page.",
      },
      { property: "og:title", content: "Anime Test — SAAE Motion Lab" },
      {
        property: "og:description",
        content: "Preview of the animation ideas planned for the SAAE home page.",
      },
    ],
  }),
  component: AnimeTest,
});

function AnimeTest() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";
  const gridRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [svgMode, setSvgMode] = useState<"lines" | "circles">("lines");

  // Headline letters + grid intro
  useEffect(() => {
    const tl = createTimeline();
    if (headlineRef.current) {
      tl.add(headlineRef.current.querySelectorAll("span"), {
        opacity: [0, 1],
        y: [40, 0],
        rotate: [8, 0],
        duration: 900,
        delay: stagger(45),
        ease: "outExpo",
      });
    }
    if (gridRef.current) {
      tl.add(
        gridRef.current.querySelectorAll(".tile"),
        {
          opacity: [0, 1],
          scale: [0.6, 1],
          duration: 700,
          delay: stagger(60, { grid: [4, 3], from: "center" }),
          ease: "outBack",
        },
        "-=400",
      );
    }
    return () => { tl.pause(); };
  }, []);

  // Floating orb loop
  useEffect(() => {
    if (!orbRef.current) return;
    const a = animate(orbRef.current, {
      y: [0, -24, 0],
      scale: [1, 1.08, 1],
      duration: 3200,
      loop: true,
      ease: "inOutSine",
    });
    return () => { a.pause(); };
  }, []);

  // Animated counter
  useEffect(() => {
    const obj = { v: 0 };
    const a = animate(obj, {
      v: 1000000,
      duration: 2600,
      ease: "outQuart",
      onUpdate: () => setCount(Math.round(obj.v)),
    });
    return () => { a.pause(); };
  }, []);

  const replayGrid = () => {
    if (!gridRef.current) return;
    animate(gridRef.current.querySelectorAll(".tile"), {
      scale: [1, 0.4, 1],
      rotate: [0, 180, 360],
      duration: 1200,
      delay: stagger(50, { grid: [4, 3], from: "first" }),
      ease: "inOutQuad",
    });
  };

  const title = isRtl ? "مختبر الحركة" : "Motion Lab";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className={`mx-auto max-w-7xl px-6 py-24 lg:px-10 ${isRtl ? "text-right" : "text-left"}`}>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">anime test</p>

        <h1 ref={headlineRef} className="mt-4 text-display-1 font-black leading-tight">
          {title.split("").map((ch, i) => (
            <span key={i} className="inline-block">
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>

        <div className="mt-10 flex flex-wrap items-center gap-8">
          <div ref={orbRef} className="h-24 w-24 rounded-full bg-secondary" />
          <div>
            <div className="text-display-2 font-black tabular-nums">{count.toLocaleString()}</div>
            <p className="text-body text-muted-foreground">
              {isRtl ? "مستخدم ذكاء اصطناعي سوري" : "Syrian AI users"}
            </p>
          </div>
        </div>

        <section className="mt-20 border-t border-border pt-16">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <h2 className="text-display-2 font-black">
              {isRtl ? "رسم SVG المتحرك" : "SVG line drawing"}
            </h2>
            <div className="flex gap-2">
              {(["lines", "circles"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSvgMode(m)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    svgMode === m
                      ? "bg-secondary text-secondary-foreground"
                      : "border border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m === "lines" ? (isRtl ? "خطوط" : "Lines") : isRtl ? "دوائر" : "Circles"}
                </button>
              ))}
            </div>
          </div>
          <AnimeSvgHero mode={svgMode} />
        </section>


        <div ref={gridRef} className="mt-16 grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="tile aspect-square rounded-xl border border-border bg-muted/50"
            />
          ))}
        </div>

        <button
          onClick={replayGrid}
          className="mt-8 rounded-full bg-primary px-7 py-3 text-base font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          {isRtl ? "أعد التشغيل" : "Replay animation"}
        </button>
      </main>
      <Footer />
    </div>
  );
}
