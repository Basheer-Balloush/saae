import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyMomentum, momentumFrom } from "../../src/features/website/initiative/momentum";

const page = readFileSync(
  path.join(__dirname, "../../src/features/website/cinematic/html/initiative.html"),
  "utf8",
);
const script = readFileSync(
  path.join(__dirname, "../../public/cinematic/js/initiative.js"),
  "utf8",
);

const block = (html: string) =>
  html.slice(
    html.indexOf('<section class="progress-preview"'),
    html.indexOf("</section>", html.indexOf('<section class="progress-preview"')),
  );

const live = { target: 1_000_000, waiting: 38, totalFunded: 1200 };

describe("the momentum figures", () => {
  it("makes the big number the two cards under it added together", () => {
    const m = momentumFrom(live);
    expect(m).toMatchObject({ waitlist: 38, sponsored: 1200, total: 1238, remaining: 998_762 });
  });

  it("gives each card its share: of the total, or of the goal for what is left", () => {
    expect(momentumFrom(live).shares).toEqual({
      waitlist: "3.1%",
      sponsored: "96.9%",
      remaining: "99.9%",
    });
  });

  it("never divides by zero or goes negative", () => {
    const empty = momentumFrom({ target: 0, waiting: 0, totalFunded: 0 });
    expect(empty).toMatchObject({ total: 0, remaining: 1_000_000 });
    expect(empty.shares).toEqual({ waitlist: "0.0%", sponsored: "0.0%", remaining: "100.0%" });
    const bad = momentumFrom({ target: 10, waiting: -4, totalFunded: Number.NaN });
    expect(bad).toMatchObject({ waitlist: 0, sponsored: 0, total: 0, remaining: 10 });
    expect(momentumFrom({ target: 10, waiting: 5, totalFunded: 20 }).remaining).toBe(0);
  });
});

describe("the momentum block on /initiative", () => {
  it("is written from the live figures before it renders", () => {
    const html = block(
      applyMomentum(page, momentumFrom({ ...live, waiting: 5, totalFunded: 2400 })),
    );
    expect(html).toContain('<strong data-momentum="total">2,405</strong>');
    expect(html).toContain('<strong data-momentum="waitlist">5</strong>');
    expect(html).toContain('<strong data-momentum="sponsored">2,400</strong>');
    expect(html).toContain('<strong data-momentum="remaining">997,595</strong>');
    expect(html).toContain('<b data-momentum-share="waitlist">0.2%</b>');
    expect(html).toContain('<b data-momentum-share="sponsored">99.8%</b>');
    expect(html).toContain('<b data-momentum-share="remaining">99.8%</b>');
    expect(html).toContain('aria-label="2,405 seats currently in motion');
  });

  it("carries a hook for every figure, so none is left as a snapshot", () => {
    const html = block(page);
    expect(html.match(/data-momentum="/g)).toHaveLength(4);
    expect(html.match(/data-momentum-share="/g)).toHaveLength(3);
  });

  it("does not count up: neither page script animates these figures", () => {
    /* initiative.js and motion-anime.js both animate every [data-count], at
       different speeds, which made the numbers jump on the live page. */
    expect(block(page)).not.toContain("data-count");
    expect(script).not.toContain("data-count");
  });

  it("reads the hovered figure from its card instead of a typed list", () => {
    expect(script).not.toMatch(/"1,224"|"998,776"/);
    expect(script).toContain('figureOf("sponsored") + figureOf("waitlist")');
  });
});
