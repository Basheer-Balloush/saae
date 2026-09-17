import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

const ScrollAnimationContext = createContext<MotionValue<number> | null>(null);

export function useContainerScrollProgress() {
  return useContext(ScrollAnimationContext);
}

type ContainerScrollProps = {
  titleComponent: ReactNode;
  children: ReactNode;
  className?: string;
  cardClassName?: string;
  layout?: "stacked" | "split";
  introHeight?: number;
};

export function ContainerScroll({
  titleComponent,
  children,
  className = "",
  cardClassName = "",
  layout = "stacked",
  introHeight,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const scrollProgress = useMotionValue(0);
  // The split FAQ has three deliberate beats: title alone, title moving right,
  // then the phone entering after the title has settled.
  const titleX = useTransform(
    scrollProgress,
    [0, 0.38, 0.72, 1],
    layout === "split" ? [-270, -270, 0, 0] : [0, 0, 0, 0],
  );
  const cardY = useTransform(scrollProgress, [0, 0.66, 0.94], [140, 140, 0]);
  const cardRotate = useTransform(scrollProgress, [0, 0.66, 0.94], [4, 4, 0]);
  const cardScale = useTransform(scrollProgress, [0, 0.66, 0.94], [0.96, 0.96, 1]);
  const cardOpacity = useTransform(scrollProgress, [0, 0.66, 0.86], [0, 0, 1]);

  useEffect(() => {
    if (reducedMotion) {
      scrollProgress.set(1);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const element = containerRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const start = window.innerHeight * 0.92;
      const end =
        layout === "split"
          ? Math.min(start - 1, window.innerHeight - element.offsetHeight)
          : -window.innerHeight * 0.15;
      const distance = start - rect.top;
      const totalDistance = start - end;
      // Keep the entrance at its original distance when adding a longer reading phase.
      const introDistance = introHeight ? (introHeight - window.innerHeight * 0.08) * 0.86 : 0;
      const progress = Math.min(
        1,
        Math.max(
          0,
          introDistance > 0 && totalDistance > introDistance
            ? distance <= introDistance
              ? (distance / introDistance) * 0.86
              : 0.86 + ((distance - introDistance) / (totalDistance - introDistance)) * 0.14
            : distance / totalDistance,
        ),
      );
      scrollProgress.set(progress);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [introHeight, layout, reducedMotion, scrollProgress]);

  return (
    <div
      ref={containerRef}
      className={`cs-scroll-container cs-scroll-${layout} ${className}`.trim()}
    >
      <div className="cs-scroll-perspective">
        <motion.div className="cs-scroll-header" style={reducedMotion ? undefined : { x: titleX }}>
          {titleComponent}
        </motion.div>
        <motion.div
          className={`cs-scroll-card ${cardClassName}`.trim()}
          style={{
            boxShadow: "0 12px 26px rgba(0, 0, 0, .24), 0 34px 54px rgba(0, 0, 0, .18)",
            ...(reducedMotion
              ? {}
              : {
                  y: cardY,
                  rotateX: cardRotate,
                  scale: cardScale,
                  opacity: cardOpacity,
                }),
          }}
        >
          <div className="cs-scroll-card-inner">
            <ScrollAnimationContext.Provider value={scrollProgress}>
              {children}
            </ScrollAnimationContext.Provider>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ContainerScrollItem({
  children,
  index,
  className = "",
  sequence = false,
}: {
  children: ReactNode;
  index: number;
  total: number;
  className?: string;
  sequence?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const scrollProgress = useContext(ScrollAnimationContext);
  const fallbackProgress = useMotionValue(1);
  const revealProgress = scrollProgress ?? fallbackProgress;
  const revealStart = index === 0 ? 0.72 : 0.84 + Math.min(index - 1, 3) * 0.04;
  const revealOpacity = useTransform(revealProgress, [revealStart, revealStart + 0.04], [0, 1]);
  const revealY = useTransform(revealProgress, [revealStart, revealStart + 0.04], [18, 0]);

  return (
    <motion.li
      className={className}
      initial={sequence || scrollProgress || reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={sequence || scrollProgress ? undefined : { opacity: 1, y: 0 }}
      viewport={sequence || scrollProgress ? undefined : { once: true, amount: 0.2 }}
      transition={
        sequence || scrollProgress
          ? undefined
          : {
              duration: 0.5,
              delay: reducedMotion ? 0 : index * 0.22,
              ease: [0.18, 0.78, 0.22, 1],
            }
      }
      style={
        sequence
          ? undefined
          : scrollProgress && !reducedMotion
            ? { opacity: revealOpacity, y: revealY }
            : undefined
      }
    >
      {children}
    </motion.li>
  );
}
