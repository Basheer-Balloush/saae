import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { animate, stagger, createTimeline, spring, onScroll } from "animejs";
import type { Timeline } from "animejs";
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
          "A motion playground for SAAE: staggered grids, counters, timelines, springs, scroll linking and SVG drawing built with anime.js before rolling them into the home page.",
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
  const tlRef = useRef<Timeline | null>(null);
  const springCardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const interactiveGridRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [svgMode, setSvgMode] = useState<"lines" | "circles">("lines");

  // Headline letters + grid intro timeline
  useEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
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
    return () => {
      tl.pause();
      tlRef.current = null;
    };
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
    return () => {
      a.pause();
    };
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
    return () => {
      a.pause();
    };
  }, []);

  // Page scroll progress bar
  useEffect(() => {
    if (!progressRef.current) return;
    const a = animate(progressRef.current, {
      width: ["0%", "100%"],
      ease: "linear",
      autoplay: onScroll({ sync: true }),
    });
    return () => {
      a.pause();
    };
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

  const triggerSpring = () => {
    if (!springCardRef.current) return;
    animate(springCardRef.current, {
      scale: [0.65, 1],
      rotate: [isRtl ? 10 : -10, 0],
      ease: spring({ mass: 1, stiffness: 180, damping: 12 }),
      duration: 1200,
    });
  };

  const staggerInteractive = (entering: boolean) => {
    const grid = interactiveGridRef.current;
    if (!grid) return;
    animate(grid.querySelectorAll(".i-tile"), {
      scale: entering ? [1, 1.15] : [1.15, 1],
      backgroundColor: entering ? ["hsl(var(--muted))", "hsl(var(--primary))"] : ["hsl(var(--primary))", "hsl(var(--muted))"],
      duration: 600,
      delay: stagger(40, { grid: [4, 3], from: "center" }),
      ease: "outExpo",
    });
  };

  const title = isRtl ? "مختبر الحركة" : "Motion Lab";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        ref={progressRef}
        className="fixed left-0 top-0 z-50 h-1 bg-primary"
        style={{ width: "0%" }}
        aria-hidden="true"
      />
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => tlRef.current?.play()}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {isRtl ? "تشغيل" : "Play"}
          </button>
          <button
            onClick={() => tlRef.current?.pause()}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {isRtl ? "إيقاف مؤقت" : "Pause"}
          </button>
          <button
            onClick={() => tlRef.current?.reverse()}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {isRtl ? "عكس" : "Reverse"}
          </button>
        </div>

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

        <section className="mt-20 border-t border-border pt-16">
          <h2 className="text-display-2 font-black">
            {isRtl ? "فيزياء الزنبرك" : "Spring physics"}
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {isRtl
              ? "انقر الزر لرؤية حركة الزنبرك الطبيعية باستخدام ease: spring()."
              : "Click the button to see a natural spring motion using ease: spring()."}
          </p>
          <div className="mt-8 flex items-center gap-8">
            <div
              ref={springCardRef}
              className="flex h-32 w-32 items-center justify-center rounded-2xl bg-secondary text-xl font-black text-secondary-foreground"
            >
              {isRtl ? "زنبرك" : "Spring"}
            </div>
            <button
              onClick={triggerSpring}
              className="rounded-full bg-primary px-7 py-3 text-base font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {isRtl ? "شغّل الزنبرك" : "Trigger spring"}
            </button>
          </div>
        </section>

        <section className="mt-20 border-t border-border pt-16">
          <h2 className="text-display-2 font-black">
            {isRtl ? "تفاعل متدرج" : "Interactive stagger"}
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {isRtl
              ? "مرّر المؤشر فوق الشبكة لتشغيل تأثير متدرج من المركز."
              : "Hover over the grid to fire a staggered effect from the center."}
          </p>
          <div
            ref={interactiveGridRef}
            onMouseEnter={() => staggerInteractive(true)}
            onMouseLeave={() => staggerInteractive(false)}
            className="mt-8 grid grid-cols-4 gap-4"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="i-tile aspect-square rounded-xl bg-muted transition-colors"
              />
            ))}
          </div>
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
