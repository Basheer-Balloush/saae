"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/* Adapted from the 21st.dev logo carousel. The original takes SVG components
   and re-renders every column ten times a second from one shared 100ms clock.
   Here each logo is an image URL shown in its own colours; each column runs
   its own 2s timer;
   and the timers stop while the carousel is off-screen, while the tab is
   hidden, and for readers who prefer reduced motion. */

export interface Logo {
  id: string | number;
  name: string;
  /** Logo image URL, shown in its original colours. */
  src: string;
  /** Optical size relative to an average logo (1 = average). */
  scale?: number;
}

const CYCLE_MS = 2000;
const COLUMN_DELAY_MS = 200;

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const distributeLogos = (allLogos: Logo[], columnCount: number): Logo[][] => {
  const shuffled = shuffleArray(allLogos);
  const columns: Logo[][] = Array.from({ length: columnCount }, () => []);
  shuffled.forEach((logo, index) => {
    columns[index % columnCount].push(logo);
  });
  const maxLength = Math.max(...columns.map((col) => col.length));
  columns.forEach((col) => {
    while (col.length < maxLength) {
      col.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
    }
  });
  return columns;
};

function LogoMark({ logo }: { logo: Logo }) {
  const size = `${Math.round(Math.min(1.25, Math.max(0.7, logo.scale ?? 1)) * 86)}%`;
  return (
    <img
      src={logo.src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="block object-contain"
      style={{ width: size, height: size }}
    />
  );
}

interface LogoColumnProps {
  logos: Logo[];
  index: number;
  active: boolean;
}

export const LogoColumn = React.memo(function LogoColumn({
  logos,
  index,
  active,
}: LogoColumnProps) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active || reduceMotion || logos.length < 2) return;
    let interval = 0;
    const advance = () => setCurrent((i) => (i + 1) % logos.length);
    const start = window.setTimeout(
      () => {
        advance();
        interval = window.setInterval(advance, CYCLE_MS);
      },
      CYCLE_MS + index * COLUMN_DELAY_MS,
    );
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [active, reduceMotion, logos.length, index]);

  const logo = logos[current % logos.length];

  return (
    <motion.div
      className="relative h-14 w-24 overflow-hidden md:h-28 md:w-[clamp(6.5rem,13vw,13rem)]"
      initial={reduceMotion ? false : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${logo.id}-${current}`}
          className="absolute inset-0 flex items-center justify-center"
          initial={reduceMotion ? { opacity: 0 } : { y: "10%", opacity: 0, filter: "blur(8px)" }}
          animate={{
            y: "0%",
            opacity: 1,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 20,
              mass: 1,
              bounce: 0.2,
              duration: 0.5,
            },
          }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: { duration: 0.2 } }
              : {
                  y: "-20%",
                  opacity: 0,
                  filter: "blur(6px)",
                  transition: { type: "tween", ease: "easeIn", duration: 0.3 },
                }
          }
        >
          <LogoMark logo={logo} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
});

interface LogoCarouselProps {
  columnCount?: number;
  logos: Logo[];
  className?: string;
}

export function LogoCarousel({ columnCount = 2, logos, className }: LogoCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [logoSets, setLogoSets] = useState<Logo[][]>([]);
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  // Shuffled after mount, so the server and the first client render agree.
  useEffect(() => {
    setLogoSets(logos.length ? distributeLogos(logos, columnCount) : []);
  }, [logos, columnCount]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const active = onScreen && pageVisible;

  return (
    <div ref={rootRef} className={cn("flex gap-4", className)}>
      {logoSets.map((column, index) => (
        <LogoColumn key={index} logos={column} index={index} active={active} />
      ))}
    </div>
  );
}
