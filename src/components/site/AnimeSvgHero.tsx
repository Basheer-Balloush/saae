import { useEffect, useRef, useState } from "react";
import { svg, createTimeline, stagger, utils } from "animejs";

type Mode = "lines" | "circles";

const SIZE = 1100;
const MARGIN = 60;
const COUNT = 44;

/**
 * Re-creation of the anime.js homepage hero: a dense field of SVG strokes
 * "drawn" in and out with a staggered, looping timeline (svg.createDrawable).
 */
export function AnimeSvgHero({ mode = "lines" }: { mode?: Mode }) {
  const rootRef = useRef<SVGSVGElement>(null);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = svg.createDrawable(
      root.querySelectorAll<SVGGeometryElement>(".drawable"),
    );

    const tl = createTimeline({
      defaults: { ease: "inOut(4)", duration: mode === "lines" ? 6000 : 7000, loop: true },
    });

    if (mode === "lines") {
      tl.add(
        targets,
        {
          draw: ["0.5 0.5", "0 1", "0.5 0.5"],
          stroke: "#048090",
        },
        stagger(90, { from: "center" }),
      );
    } else {
      tl.add(
        targets,
        {
          draw: [
            () => {
              const v = utils.random(-1, -0.5, 2);
              return `${v} ${v}`;
            },
            () => `${utils.random(0, 0.25, 2)} ${utils.random(0.5, 0.85, 2)}`,
            () => {
              const v = utils.random(1, 1.5, 2);
              return `${v} ${v}`;
            },
          ],
          stroke: "#048090",
        },
        stagger(90),
      );
    }

    return () => {
      tl.pause();
    };
  }, [mode, seed]);

  const spacing = (SIZE - MARGIN * 2) / (COUNT - 1);

  return (
    <div className="relative">
      <svg
        ref={rootRef}
        key={`${mode}-${seed}`}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-3xl"
        fill="none"
        aria-hidden="true"
      >
        <g strokeWidth={2} stroke="hsl(var(--muted-foreground))">
          {mode === "lines"
            ? Array.from({ length: COUNT }).map((_, i) => {
                const x = MARGIN + i * spacing;
                return (
                  <line
                    key={i}
                    className="drawable"
                    x1={x}
                    y1={MARGIN}
                    x2={x}
                    y2={SIZE - MARGIN}
                  />
                );
              })
            : Array.from({ length: COUNT }).map((_, i) => (
                <circle
                  key={i}
                  className="drawable"
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={((i + 1) * (SIZE / 2 - MARGIN)) / COUNT}
                />
              ))}
        </g>
      </svg>

      <button
        onClick={() => setSeed((s) => s + 1)}
        className="mx-auto mt-6 block rounded-full border border-border px-6 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        Restart
      </button>
    </div>
  );
}
