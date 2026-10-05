import { useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ABU_AL_JOUD } from "@/features/chat/lib/mascot";

export type Pose = "welcome" | "explain" | "think" | "celebrate" | "vision";
/** A one-off reaction; `beat` changes to replay the same mood. */
export type Mood = "idle" | "happy" | "sad" | "nervous" | "cheer";

/* Abu Al-Joud hosting the game: he floats, leans toward the player's finger
   or mouse, swaps poses, and reacts to every answer. The speech bubble shows
   his line word by word, which keeps Arabic letters joined while it types. */
export function AbuHost({
  pose,
  mood,
  beat,
  line,
  dir,
}: {
  pose: Pose;
  mood: Mood;
  beat: number;
  line: string;
  dir: "rtl" | "ltr";
}) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const tiltTarget = useMotionValue(0);
  const tilt = useSpring(tiltTarget, { stiffness: 60, damping: 14 });
  const box = useRef<HTMLDivElement>(null);

  // Lean toward the pointer, a few degrees at most.
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(window.innerWidth, 1);
      tiltTarget.set(Math.max(-1, Math.min(1, dx * 2)) * 5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [reduce, tiltTarget]);

  useEffect(() => {
    if (reduce || mood === "idle") return;
    const moves: Record<Exclude<Mood, "idle">, Parameters<typeof controls.start>[0]> = {
      happy: { y: [0, -26, 0, -10, 0], rotate: [0, -4, 3, 0], transition: { duration: 0.8 } },
      cheer: { scale: [1, 1.08, 0.98, 1.03, 1], y: [0, -18, 0], transition: { duration: 0.9 } },
      sad: { x: [0, -8, 8, -5, 5, 0], rotate: [0, -2, 2, 0], transition: { duration: 0.6 } },
      nervous: { x: [0, -2, 2, -2, 2, 0], transition: { duration: 0.4, repeat: 2 } },
    };
    void controls.start(moves[mood]);
  }, [mood, beat, reduce, controls]);

  const words = line.split(/\s+/).filter(Boolean);

  return (
    <div className="tx-host" ref={box} dir={dir}>
      <div className="tx-host-figure">
        <span className="tx-host-glow" aria-hidden="true" />
        <motion.div
          className="tx-host-float"
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div className="tx-host-react" animate={controls} style={{ rotate: tilt }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={pose}
                src={ABU_AL_JOUD[pose]}
                alt=""
                draggable={false}
                className="tx-host-img"
                initial={reduce ? false : { opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              />
            </AnimatePresence>
          </motion.div>
        </motion.div>
        <span className="tx-host-shadow" aria-hidden="true" />
      </div>
      <div className="tx-bubble" role="status" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {reduce ? (
              line
            ) : (
              <>
                <span className="sr-only">{line}</span>
                <span aria-hidden="true">
                  {words.map((w, i) => (
                    <motion.span
                      key={`${i}-${w}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + i * 0.045, duration: 0.12 }}
                    >
                      {w}{" "}
                    </motion.span>
                  ))}
                </span>
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
