import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface SaaeLogoAssemblyProps {
  locale: "ar" | "en";
}

// Reuses the canonical asset only — no invented geometry. The grouped
// `<g id="saae-*">` layers are clip slices of public/cinematic/saae-logo-full.svg
// (tree artwork occupies 0–340pt, wordmark/descriptor 340–456.58pt).
const LOGO_SRC = "/cinematic/saae-logo-full.svg";
const VB_W = 301.81;
const VB_H = 456.58;

const EASE = "easeOut" as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function SaaeLogoAssembly({ locale }: SaaeLogoAssemblyProps) {
  const reducedMotion = usePrefersReducedMotion();
  const label =
    locale === "ar"
      ? "شعار الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
      : "Syrian Association for AI & Entrepreneurship logo";

  // Reduced motion (or SSR first paint): final assembled mark, no animation.
  if (reducedMotion) {
    return (
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width={216}
        height={327}
        className="h-auto w-40 sm:w-48"
      >
        <g id="saae-tree" aria-hidden="true">
          <g id="saae-roots" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
          <g id="saae-trunk" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
          <g id="saae-branch-left" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
          <g id="saae-branch-center" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
          <g id="saae-branch-right" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
          <g id="saae-nodes" aria-hidden="true">
            <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
          </g>
        </g>
        <g id="saae-wordmark-en" aria-hidden="true">
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </g>
        <g id="saae-wordmark-ar" aria-hidden="true">
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </g>
        <g id="saae-descriptor" aria-hidden="true">
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </g>
      </svg>
    );
  }

  // Animated assembly: transform/opacity only, whole timeline <= 1200ms,
  // plays once per mount. Any animation failure leaves the final state visible
  // because every layer animates toward opacity 1 / no offset.
  const layer = { transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={216}
      height={327}
      className="h-auto w-40 sm:w-48"
    >
      <g id="saae-tree" aria-hidden="true">
        <motion.g
          id="saae-roots"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.2, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
        <motion.g
          id="saae-trunk"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
        <motion.g
          id="saae-branch-left"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.26, duration: 0.39, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
        <motion.g
          id="saae-branch-center"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.33, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
        <motion.g
          id="saae-branch-right"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.38, duration: 0.27, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
        <motion.g
          id="saae-nodes"
          aria-hidden="true"
          style={layer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.34, ease: EASE }}
        >
          <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
        </motion.g>
      </g>
      <motion.g
        id="saae-wordmark-en"
        aria-hidden="true"
        style={layer}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.28, ease: EASE }}
      >
        <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
      </motion.g>
      <motion.g
        id="saae-wordmark-ar"
        aria-hidden="true"
        style={layer}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.74, duration: 0.24, ease: EASE }}
      >
        <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
      </motion.g>
      <motion.g
        id="saae-descriptor"
        aria-hidden="true"
        style={layer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.82, duration: 0.16, ease: EASE }}
      >
        <image href={LOGO_SRC} x={0} y={0} width={VB_W} height={VB_H} />
      </motion.g>
    </svg>
  );
}

export default SaaeLogoAssembly;
