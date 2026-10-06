/**
 * The /initiative "momentum toward one million" block, from the live seat
 * records.
 *
 * The prototype typed its four figures into initiative.html and counted them
 * up from zero, twice over (initiative.js and motion-anime.js both animated
 * the same elements), so the visitor watched numbers jump and then settle on
 * a snapshot. These come from initiative_public_stats instead:
 *
 *   sponsored  every seat a sponsor has paid for
 *   waitlist   people waiting for a seat
 *   total      the big number: the two figures under it added together
 *   remaining  what is left of the goal after that total
 *
 * The server splices them into the markup, so the first paint is already
 * real and nothing animates; the page repaints them each time it re-reads.
 */

export type MomentumStats = {
  target: number;
  waiting: number;
  totalFunded: number;
};

export type MomentumFigure = "total" | "waitlist" | "sponsored" | "remaining";
type MomentumShare = Exclude<MomentumFigure, "total">;

export type Momentum = Record<MomentumFigure, number> & {
  /** "3.1%": a figure's part of the total, or for "remaining" of the goal. */
  shares: Record<MomentumShare, string>;
};

const DEFAULT_TARGET = 1_000_000;
const whole = new Intl.NumberFormat("en-US");

const seats = (value: unknown): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const percent = (part: number, of: number): string =>
  `${(of > 0 ? (part / of) * 100 : 0).toFixed(1)}%`;

export function momentumFrom(stats: MomentumStats): Momentum {
  const waitlist = seats(stats.waiting);
  const sponsored = seats(stats.totalFunded);
  const target = seats(stats.target) || DEFAULT_TARGET;
  const total = waitlist + sponsored;
  const remaining = Math.max(0, target - total);
  return {
    total,
    waitlist,
    sponsored,
    remaining,
    shares: {
      waitlist: percent(waitlist, total),
      sponsored: percent(sponsored, total),
      remaining: percent(remaining, target),
    },
  };
}

const isFigure = (key: string | undefined): key is MomentumFigure =>
  key === "total" || key === "waitlist" || key === "sponsored" || key === "remaining";

const isShare = (key: string | undefined): key is MomentumShare =>
  key === "waitlist" || key === "sponsored" || key === "remaining";

const FIGURE = /(<strong data-momentum="(\w+)">)[^<]*(<\/strong>)/g;
const SHARE = /(<b data-momentum-share="(\w+)">)[^<]*(<\/b>)/g;
const DIAL_LABEL = /(aria-label=")[\d,]+(?= seats currently in motion)/;

/** Writes the figures into the page markup before it is rendered. */
export function applyMomentum(html: string, momentum: Momentum): string {
  return html
    .replace(FIGURE, (match, open: string, key: string, close: string) =>
      isFigure(key) ? `${open}${whole.format(momentum[key])}${close}` : match,
    )
    .replace(SHARE, (match, open: string, key: string, close: string) =>
      isShare(key) ? `${open}${momentum.shares[key]}${close}` : match,
    )
    .replace(DIAL_LABEL, (_, open: string) => `${open}${whole.format(momentum.total)}`);
}

const setText = (el: Element, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

/**
 * Repaints the figures on a page that is already showing. A card that is
 * hovered or pinned keeps its own figure in the big slot (initiative.js puts
 * it there), so only that slot follows the focus; it returns to the total
 * when the focus is released.
 */
export function paintMomentum(root: ParentNode, momentum: Momentum): void {
  root.querySelectorAll<HTMLElement>("[data-momentum]").forEach((el) => {
    const key = el.dataset.momentum;
    if (isFigure(key)) setText(el, whole.format(momentum[key]));
  });
  root.querySelectorAll<HTMLElement>("[data-momentum-share]").forEach((el) => {
    const key = el.dataset.momentumShare;
    if (isShare(key)) setText(el, momentum.shares[key]);
  });
  const dial = root.querySelector<HTMLElement>(".progress-dial");
  if (!dial) return;
  const focus = dial.dataset.focus;
  const big = dial.querySelector('[data-momentum="total"]');
  if (big && isFigure(focus)) setText(big, whole.format(momentum[focus]));
  const label = dial.getAttribute("aria-label");
  if (label)
    dial.setAttribute("aria-label", label.replace(/^[\d,]+/, whole.format(momentum.total)));
}
