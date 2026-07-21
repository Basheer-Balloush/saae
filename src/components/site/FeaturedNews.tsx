import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { communityLabel } from "@/lib/communityCategories";
import { LogoParticles } from "./LogoParticles";

const SCROLL_KEY = "saae-news-marquee-offset";

const IMG = {
  featured: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
  a: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80",
  b: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  c: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=900&q=80",
  d: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=900&q=80",
  e: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80",
  f: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80",
  g: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80",
};

type Slide = { key: string; img: string; cat: string; title: string; date: string; id?: string };
export type HomeNewsRow = {
  id: string;
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
};

function mapNewsRows(rows: HomeNewsRow[], lang: "ar" | "en"): Slide[] {
  return rows.map((r) => ({
    key: r.id,
    id: r.id,
    img: r.image_url || IMG.featured,
    cat: communityLabel(r.category, lang),
    title: (lang === "ar" ? (r.title_ar ?? r.title_en) : (r.title_en ?? r.title_ar)) ?? r.title ?? "",
    date: r.published_at,
  }));
}

type Translations = ReturnType<typeof useLang>["t"];

type NewsMarqueeProps = {
  slides: Slide[];
  dir: "ltr" | "rtl";
  t: Translations;
};

function NewsMarquee({ slides, dir, t }: NewsMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    initialOffset: 0,
    pointerId: null as number | null,
  });
  const didDragRef = useRef(false);
  const DRAG_THRESHOLD = 5;
  const animationDuration = 30;
  const animationClass = dir === "rtl" ? "animate-[news-marquee_30s_linear_infinite]" : "animate-[news-marquee-rtl_30s_linear_infinite]";

  // Restore marquee position when returning from a news detail page.
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;
    const savedPx = parseFloat(raw);
    if (!Number.isFinite(savedPx)) return;
    const row = rowRef.current;
    if (!row) return;
    const apply = () => {
      const half = row.scrollWidth / 2;
      if (!half) return;
      const isRtl = dir === "rtl";
      const actualOffset = -savedPx;
      const wrapped = wrapOffset(actualOffset, half);
      const from = isRtl ? 0 : -half;
      const to = isRtl ? -half : 0;
      const pct = (wrapped - from) / (to - from);
      row.style.animationDelay = `-${(pct * animationDuration).toFixed(3)}s`;
      sessionStorage.removeItem(SCROLL_KEY);
    };
    const id = window.setTimeout(apply, 50);
    return () => window.clearTimeout(id);
  }, [slides, dir]);

  // Reset inline state when language changes at runtime.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    row.style.animationDelay = "";
    row.style.transform = "";
    try { sessionStorage.removeItem(SCROLL_KEY); } catch {}
  }, [dir]);

  const saveOffset = () => {
    const row = rowRef.current;
    if (!row) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    const offset = Math.abs(m.m41);
    try { sessionStorage.setItem(SCROLL_KEY, String(offset)); } catch {}
  };

  const wrapOffset = (offset: number, half: number) => {
    while (offset < -half) offset += half;
    while (offset > 0) offset -= half;
    return offset;
  };

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const row = rowRef.current;
    if (!row) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    dragRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: e.clientX,
      initialOffset: m.m41,
      pointerId: e.pointerId,
    };
    didDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.isPointerDown) return;
    const row = rowRef.current;
    if (!row) return;
    const delta = e.clientX - state.startX;

    if (!state.isDragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
      state.initialOffset = m.m41;
      state.startX = e.clientX;
      state.isDragging = true;
      didDragRef.current = true;
      row.classList.remove(animationClass);
      row.style.transform = `translateX(${m.m41}px)`;
      try { row.setPointerCapture(e.pointerId); } catch {}
      row.style.cursor = "grabbing";
      return;
    }

    e.preventDefault();
    const offset = state.initialOffset + delta;
    row.style.transform = `translateX(${offset}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const row = rowRef.current;
    if (!row) return;
    const state = dragRef.current;
    const wasDragging = state.isDragging;
    dragRef.current = {
      isPointerDown: false,
      isDragging: false,
      startX: 0,
      initialOffset: 0,
      pointerId: null,
    };
    if (!wasDragging) return;

    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    const half = row.scrollWidth / 2;
    const offset = wrapOffset(m.m41, half);
    const isRtl = dir === "rtl";
    const from = isRtl ? 0 : -half;
    const to = isRtl ? -half : 0;
    const pct = (offset - from) / (to - from);

    row.style.animationDelay = `-${(pct * animationDuration).toFixed(3)}s`;
    row.classList.add(animationClass);
    requestAnimationFrame(() => {
      row.style.transform = "";
    });
    try { row.releasePointerCapture(e.pointerId); } catch {}
    row.style.cursor = "grab";
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      return;
    }
    saveOffset();
  };

  const row = [...slides, ...slides];

  return (
    <div dir="ltr" className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div
        ref={rowRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`flex w-max cursor-grab gap-6 touch-pan-y will-change-transform ${animationClass}`}
        style={{ animationPlayState: isPaused ? "paused" : "running" }}
      >
        {row.map((c, i) => {
          const cardClass = "group flex w-[78vw] max-w-[320px] flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift sm:w-[340px] sm:max-w-none lg:w-[360px]";
          return (
            <Link key={`${c.key}-${i}`} to="/news/$id" params={{ id: c.id! }} onClick={handleLinkClick} aria-label={`${t.news.readMore}: ${c.title}`} className={cardClass}>
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={c.img}
                  alt={c.title}
                  width={800}
                  height={600}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                    {c.cat}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">{c.date}</span>
                </div>
                <h3 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                  {c.title}
                </h3>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {t.news.readMore}
                  <ArrowUpRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        @keyframes news-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes news-marquee-rtl {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export function FeaturedNews({ initialNews }: { initialNews?: HomeNewsRow[] }) {
  const { t, dir, lang } = useLang();

  const [slides, setSlides] = useState<Slide[] | null>(() => initialNews ? mapNewsRows(initialNews, lang) : null);
  const [isPaused, setIsPaused] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    initialOffset: 0,
    pointerId: null as number | null,
  });
  const didDragRef = useRef(false);
  const DRAG_THRESHOLD = 5;

  const animationDuration = 30; // seconds per loop (faster than before)
  // Direction is derived from the active locale:
  // - English (ltr): keyframe translates -50% → 0, so items visually flow left → right.
  // - Arabic  (rtl): keyframe translates 0 → -50%, so items visually flow right → left.
  const animationClass = dir === "rtl" ? "animate-[news-marquee_30s_linear_infinite]" : "animate-[news-marquee-rtl_30s_linear_infinite]";


  useEffect(() => {
    if (initialNews) {
      setSlides(mapNewsRows(initialNews, lang));
      return;
    }
    supabase
      .from("news")
      .select("id,title,title_ar,title_en,image_url,category,published_at")
      .eq("show_on_home", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setSlides(mapNewsRows((data ?? []) as HomeNewsRow[], lang));
      });
  }, [initialNews, lang]);

  // Restore marquee position when returning from a news detail page.
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;
    const savedPx = parseFloat(raw);
    if (!Number.isFinite(savedPx)) return;
    const row = rowRef.current;
    if (!row) return;
    const apply = () => {
      const half = row.scrollWidth / 2;
      if (!half) return;
      const isRtl = dir === "rtl";
      // Both keyframes translate between -half and 0, so m41 is always ≤ 0.
      const actualOffset = -savedPx;
      const wrapped = wrapOffset(actualOffset, half);
      // ltr (news-marquee-rtl): -half → 0.  rtl (news-marquee): 0 → -half.
      const from = isRtl ? 0 : -half;
      const to = isRtl ? -half : 0;
      const pct = (wrapped - from) / (to - from);
      row.style.animationDelay = `-${(pct * animationDuration).toFixed(3)}s`;
      sessionStorage.removeItem(SCROLL_KEY);
    };
    const id = window.setTimeout(apply, 50);
    return () => window.clearTimeout(id);
  }, [slides, dir, animationDuration]);

  // When the language changes at runtime, reset any inline animationDelay /
  // transform left over from a previous drag or restore so the marquee starts
  // cleanly in the new direction without a jump or double animation.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    row.style.animationDelay = "";
    row.style.transform = "";
    try { sessionStorage.removeItem(SCROLL_KEY); } catch {}
  }, [dir]);


  const saveOffset = () => {
    const row = rowRef.current;
    if (!row) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    const offset = Math.abs(m.m41);
    try { sessionStorage.setItem(SCROLL_KEY, String(offset)); } catch {}
  };

  const wrapOffset = (offset: number, half: number) => {
    while (offset < -half) offset += half;
    while (offset > 0) offset -= half;
    return offset;
  };

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const row = rowRef.current;
    if (!row) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    dragRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: e.clientX,
      initialOffset: m.m41,
      pointerId: e.pointerId,
    };
    didDragRef.current = false;
    // Do not capture pointer, freeze animation, or change cursor yet — a
    // stationary press should still allow the underlying <Link> click.
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.isPointerDown) return;
    const row = rowRef.current;
    if (!row) return;
    const delta = e.clientX - state.startX;

    if (!state.isDragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      // Promote to drag: freeze animation at current position and take capture.
      const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
      state.initialOffset = m.m41;
      state.startX = e.clientX;
      state.isDragging = true;
      didDragRef.current = true;
      row.classList.remove(animationClass);
      row.style.transform = `translateX(${m.m41}px)`;
      try { row.setPointerCapture(e.pointerId); } catch {}
      row.style.cursor = "grabbing";
      return;
    }

    e.preventDefault();
    const offset = state.initialOffset + delta;
    row.style.transform = `translateX(${offset}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const row = rowRef.current;
    if (!row) return;
    const state = dragRef.current;
    const wasDragging = state.isDragging;
    dragRef.current = {
      isPointerDown: false,
      isDragging: false,
      startX: 0,
      initialOffset: 0,
      pointerId: null,
    };

    if (!wasDragging) {
      // Simple click — let the <Link> handle navigation.
      return;
    }

    const m = new DOMMatrixReadOnly(getComputedStyle(row).transform);
    const half = row.scrollWidth / 2;
    const offset = wrapOffset(m.m41, half);
    const isRtl = dir === "rtl";
    const from = isRtl ? 0 : -half;
    const to = isRtl ? -half : 0;
    const pct = (offset - from) / (to - from);

    row.style.animationDelay = `-${(pct * animationDuration).toFixed(3)}s`;
    row.classList.add(animationClass);
    requestAnimationFrame(() => {
      row.style.transform = "";
    });
    try { row.releasePointerCapture(e.pointerId); } catch {}
    row.style.cursor = "grab";
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      return;
    }
    saveOffset();
  };

  // Hide section entirely until we have published news to show
  if (!slides || slides.length === 0) return null;

  const row = [...slides, ...slides];

  return (
    <section id="news" aria-labelledby="news-heading" className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
      <h1 className="sr-only">
        {lang === "ar"
          ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — نبني مستقبل سوريا الرقمي"
          : "Syrian Association for AI & Entrepreneurship — Building Syria's Digital Future"}
      </h1>

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 grid gap-8 lg:mb-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12"
        >
        <div className="order-2 max-w-2xl lg:order-1">
            <h2 id="news-heading" className="mt-4 text-display-2 leading-[1.5] text-foreground">{t.news.title}</h2>
            <p className="mt-5 max-w-xl text-body text-muted-foreground">{t.news.subtitle}</p>
          </div>
          <div className={`order-1 flex justify-center lg:order-2 ${dir === "rtl" ? "lg:justify-start lg:-ml-8 lg:pl-0" : "lg:justify-end lg:-mr-8 lg:pr-0"}`}>
            <LogoParticles size={200} className="hidden sm:block" />
            <LogoParticles size={150} className="sm:hidden" />
          </div>
        </motion.div>
      </div>

      <div dir="ltr" className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div
          ref={rowRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`flex w-max cursor-grab gap-6 touch-pan-y will-change-transform ${animationClass}`}
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        >
          {row.map((c, i) => {
            const cardClass = "group flex w-[78vw] max-w-[320px] flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift sm:w-[340px] sm:max-w-none lg:w-[360px]";
            const inner = (
              <>
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    width={800}
                    height={600}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                      {c.cat}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">{c.date}</span>
                  </div>
                  <h3 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                    {c.title}
                  </h3>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {t.news.readMore}
                    <ArrowUpRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                  </span>
                </div>
              </>
            );
            return (
              <Link key={`${c.key}-${i}`} to="/news/$id" params={{ id: c.id! }} onClick={handleLinkClick} aria-label={`${t.news.readMore}: ${c.title}`} className={cardClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl justify-center px-6 lg:px-10">
        <Link
          to="/news"
          className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {t.news.viewAll}
          <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
        </Link>
      </div>

      <style>{`
        @keyframes news-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes news-marquee-rtl {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
