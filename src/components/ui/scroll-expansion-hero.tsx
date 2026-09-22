import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type ScrollExpandMediaProps = {
  headline: string;
  description: string;
  mediaSrc: string;
  mediaAlt: string;
  titleLeading: string;
  titleTrailing: string;
};

const phase = (progress: number, start: number, end: number) => Math.min(1, Math.max(0, (progress - start) / (end - start)));

export default function ScrollExpandMedia({
  headline, description, mediaSrc, mediaAlt, titleLeading, titleTrailing,
}: ScrollExpandMediaProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  /* On a phone the cover arrives at the end of a long scroll, and its
     desktop reveal (wait for a quarter of it, then 0.55s, then a 0.8s fade)
     read as an image that had not loaded. It shows at once there. */
  const [quickReveal, setQuickReveal] = useState(false);
  useEffect(() => {
    setQuickReveal(window.matchMedia("(max-width: 767px)").matches);
  }, []);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"], trackContentSize: true });
  // Share measured progress so the cinematic hero's pin spacer cannot desync native view timelines.
  const scale = useTransform(scrollYProgress, value => 0.48 + 0.52 * phase(value, 0, 0.72));
  const leadingX = useTransform(scrollYProgress, value => `${-48 * phase(value, 0, 0.65)}vw`);
  const trailingX = useTransform(scrollYProgress, value => `${48 * phase(value, 0, 0.65)}vw`);
  const titleOpacity = useTransform(scrollYProgress, value => 1 - phase(value, 0.12, 0.5));

  return (
    <>
        <motion.div
          className="hn-intro-copy"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.7, ease: [0.18, 0.78, 0.22, 1] }}
        >
          <div className="hn-intro-content">
          <h2 id="news-title" className="hn-intro-heading">
            {headline.split(" ").map((word, index, words) => (
              <span key={index} className={index === words.length - 1 ? "hn-headline-accent" : undefined}>{word}{index < words.length - 1 ? " " : ""}</span>
            ))}
          </h2>
          <p className="hn-intro-body">{description}</p>
          </div>
        </motion.div>
      <div ref={sectionRef} className="hn-expansion" data-reduced-motion={reducedMotion ? "true" : undefined}>
        <div className="hn-sticky">
        <div className="hn-media-stage">
          <motion.div
            className="hn-media hn-cover-media"
            style={{ scale: reducedMotion ? 1 : scale }}
            initial={reducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: quickReveal ? 0.02 : 0.25 }}
            transition={{ duration: quickReveal ? 0.35 : 0.8, delay: reducedMotion || quickReveal ? 0 : 0.55, ease: [0.18, 0.78, 0.22, 1] }}
          >
            <img src={mediaSrc} alt={mediaAlt} width={1536} height={1024} loading="eager" fetchPriority="low" decoding="async" />
          </motion.div>
          <motion.div
            className="hn-display"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: reducedMotion ? 0 : 0.75 }}
          >
            <motion.span style={{ x: leadingX, opacity: reducedMotion ? 0 : titleOpacity }}>{titleLeading}</motion.span>
            <motion.span style={{ x: trailingX, opacity: reducedMotion ? 0 : titleOpacity }}>{titleTrailing}</motion.span>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
}
