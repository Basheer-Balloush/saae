import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared scroll-reveal wrapper for the v2 design layer.
 * Replaces the prototype's `.reveal` class + IntersectionObserver script.
 * Under `prefers-reduced-motion` it renders the final state with no animation.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: _as,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: never;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
