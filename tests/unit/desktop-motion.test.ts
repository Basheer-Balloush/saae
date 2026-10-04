import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const script = readFileSync("src/lib/desktop-motion.js", "utf8");

type Rule = { media?: { mediaText: string }; cssRules?: Rule[] };

/* A browser stand-in: a device that matches the given features, and one
   stylesheet with a reduce rule, a no-preference rule and a nested one. */
function run({ desktop, reduce }: { desktop: boolean; reduce: boolean }) {
  const asked: string[] = [];
  const matches = (query: string) => {
    asked.push(query);
    if (query === "(min-width: 768px) and (pointer: fine)") return desktop;
    if (query === "(prefers-reduced-motion: reduce)") return reduce;
    return query.includes("(min-width: 0px)") && !query.includes("(max-width: 0px)");
  };
  const rules: Rule[] = [
    { media: { mediaText: "(prefers-reduced-motion: reduce)" } },
    { media: { mediaText: "(min-width: 821px) and (prefers-reduced-motion: no-preference)" } },
    { cssRules: [{ media: { mediaText: "(prefers-reduced-motion)" } }] },
    { media: { mediaText: "(max-width: 767px)" } },
  ];
  const window = {
    matchMedia: (query: string) => ({ media: query, matches: matches(query) }),
    addEventListener: () => {},
  };
  const document = {
    styleSheets: [{ cssRules: rules }],
    documentElement: {},
    addEventListener: () => {},
  };
  class MutationObserver {
    observe() {}
  }
  runInNewContext(script, { window, document, MutationObserver });
  return { window, rules, asked };
}

describe("desktop motion", () => {
  it("answers reduced-motion queries as no-preference on a desktop that asks for reduce", () => {
    const { window } = run({ desktop: true, reduce: true });
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
    expect(window.matchMedia("(prefers-reduced-motion)").matches).toBe(false);
    expect(window.matchMedia("(prefers-reduced-motion: no-preference)").matches).toBe(true);
  });

  it("rewrites the stylesheet rules that name reduced motion, nested ones too", () => {
    const { rules } = run({ desktop: true, reduce: true });
    expect(rules.map((rule) => rule.media?.mediaText)).toEqual([
      "(max-width: 0px)",
      "(min-width: 821px) and (min-width: 0px)",
      undefined,
      "(max-width: 767px)",
    ]);
    expect(rules[2].cssRules?.[0].media?.mediaText).toBe("(max-width: 0px)");
  });

  it("leaves phones and desktops without the preference alone", () => {
    for (const device of [
      { desktop: false, reduce: true },
      { desktop: true, reduce: false },
    ]) {
      const { window, rules } = run(device);
      expect(window.matchMedia("(prefers-reduced-motion: reduce)").media).toBe(
        "(prefers-reduced-motion: reduce)",
      );
      expect(rules[0].media?.mediaText).toBe("(prefers-reduced-motion: reduce)");
    }
  });
});
