/**
 * The full sponsor list on /initiative/sponsors.
 *
 * The page is cinematic prototype markup, so the list is rendered to an HTML
 * fragment and spliced between the page's db:* markers, the same way the
 * partners directory and the news pages get their database content. That
 * keeps the whole list, logos included, in the server-rendered page.
 *
 * Donor names come from a public form, so every value from a row goes through
 * escapeHtml, and a logo only becomes an image source after safeLogoUrl.
 */
import { formatNewsDate, escapeHtml, replaceRegion } from "@/lib/cinematic-db-content";
import {
  displayName,
  initialsFor,
  rankMark,
  safeLogoUrl,
  type Donor,
} from "@/components/initiative/live-leaderboard";

export type SponsorRow = Donor & {
  total_amount: number | string | null;
  last_donation_at: string | null;
};

export type SponsorDirectory = { sponsors: SponsorRow[]; failed: boolean };

const whole = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const num = (value: number | string | null | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* Both languages side by side; db-content.css shows the one matching <html lang>. */
const bilingual = (en: string, ar: string): string =>
  `<span data-db-lang="en">${escapeHtml(en)}</span><span data-db-lang="ar" dir="rtl">${escapeHtml(ar)}</span>`;

const NOTE = {
  empty: {
    en: "No sponsors yet. Be the first to open a seat.",
    ar: "لا يوجد داعمون بعد. كن أول من يفتح مقعداً.",
  },
  failed: {
    en: "The sponsor list could not be loaded right now. Please try again shortly.",
    ar: "تعذّر تحميل قائمة الداعمين الآن. يرجى المحاولة بعد قليل.",
  },
  lastGift: { en: "Last contribution", ar: "آخر مساهمة" },
} as const;

/** The 46px disc: the sponsor's logo when we have one, their initials when we don't. */
function badgeHtml(logoUrl: string | null, initials: string): string {
  const logo = safeLogoUrl(logoUrl);
  const safeInitials = escapeHtml(initials);
  if (!logo) return `<i>${safeInitials}</i>`;
  /* The inline onerror survives the markup being re-injected by React, which a
     listener bound from a page script would not. */
  return `<i data-initials="${safeInitials}"><img src="${escapeHtml(logo)}" alt="" width="46" height="46" loading="lazy" decoding="async" onerror="this.parentElement.textContent=this.parentElement.dataset.initials"></i>`;
}

/* First place gets the star and second and third the medal, as on the
   /initiative board; from fourth on the position is written out, which reads
   better than a row of identical dots once the list is long. */
function rankHtml(index: number): string {
  if (index <= 2) return `<span class="rank-mark" aria-hidden="true">${rankMark(index)}</span>`;
  return `<span class="rank-mark rank-number" aria-hidden="true">${index + 1}</span>`;
}

function rowHtml(sponsor: SponsorRow, index: number, topChairs: number): string {
  const name = displayName(sponsor) || "—";
  const chairs = num(sponsor.total_chairs);
  const share = topChairs > 0 ? Math.max(2, Math.round((chairs / topChairs) * 100)) : 0;
  const date = sponsor.last_donation_at ?? "";
  const en = formatNewsDate(date, "en");
  const ar = formatNewsDate(date, "ar");
  const when = en
    ? `<small>${bilingual(`${NOTE.lastGift.en} · ${en}`, `${NOTE.lastGift.ar} · ${ar}`)}</small>`
    : "";
  return `<li style="--impact: ${share}%"><span class="sr-only">${index + 1}. </span>${rankHtml(index)}<span class="sponsor-name">${badgeHtml(sponsor.logo_url, initialsFor(name))}<span class="sponsor-id"><strong>${escapeHtml(name)}</strong>${when}</span></span><span class="impact"><b></b><strong>${whole.format(chairs)}</strong></span><span class="sponsor-amount">${money.format(num(sponsor.total_amount))}</span></li>`;
}

/** Every row, or a single message row when there is nothing to list. */
export function sponsorRowsHtml(result: SponsorDirectory): string {
  if (result.sponsors.length === 0) {
    const note = result.failed ? NOTE.failed : NOTE.empty;
    return `<li class="leaderboard-empty">${bilingual(note.en, note.ar)}</li>`;
  }
  const topChairs = Math.max(0, ...result.sponsors.map((s) => num(s.total_chairs)));
  return result.sponsors.map((s, i) => rowHtml(s, i, topChairs)).join("\n");
}

export function sponsorTotals(sponsors: SponsorRow[]) {
  return {
    count: sponsors.length,
    seats: sponsors.reduce((sum, s) => sum + num(s.total_chairs), 0),
    amount: sponsors.reduce((sum, s) => sum + num(s.total_amount), 0),
  };
}

/**
 * Splices the list and its totals into the page. When the read failed the
 * totals show a dash rather than zeros, which would claim there are none.
 */
export function applySponsorDirectory(html: string, result: SponsorDirectory): string {
  const totals = sponsorTotals(result.sponsors);
  const unknown = result.failed && result.sponsors.length === 0;
  let out = replaceRegion(html, "sponsor-rows", sponsorRowsHtml(result));
  out = replaceRegion(out, "sponsor-count", unknown ? "—" : whole.format(totals.count));
  out = replaceRegion(out, "sponsor-seats", unknown ? "—" : whole.format(totals.seats));
  out = replaceRegion(out, "sponsor-amount", unknown ? "—" : money.format(totals.amount));
  return out;
}
