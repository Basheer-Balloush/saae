/**
 * Paints the /initiative sponsor band from the live donation records.
 *
 * The page is the cinematic prototype's static markup, so the five sponsors in
 * initiative.html are a hand-written snapshot. This replaces them with whatever
 * initiative_top_donors returns, keeping the prototype's row shape so the CSS,
 * the reveal animation and the bar transition all still apply.
 *
 * Donor names come from a public form, so every value from the database is
 * written with textContent or a property assignment. Nothing from a row ever
 * reaches innerHTML; the only markup built from a string here is this file's
 * own rank-mark SVGs.
 */

export type Donor = {
  donor_name: string;
  donor_display_name: string | null;
  logo_url: string | null;
  total_chairs: number;
};

/* Copied from initiative.html so a live row is indistinguishable from the
   snapshot it replaces: a star for first, a medal for second and third, a
   plain dot for the rest. */
const RANK_STAR =
  '<svg viewBox="0 0 24 24"><path d="m12 3 2.2 5.4L20 9.5l-4.2 3.9 1.1 5.8-4.9-2.9-4.9 2.9 1.1-5.8L4 9.5l5.8-1.1L12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const RANK_MEDAL =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 13-2 8 5.5-3 5.5 3-2-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const RANK_DOT =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

export const rankMark = (index: number): string =>
  index === 0 ? RANK_STAR : index <= 2 ? RANK_MEDAL : RANK_DOT;

const numberFormat = new Intl.NumberFormat("en-US");

export const displayName = (donor: Donor): string =>
  (donor.donor_display_name || donor.donor_name || "").trim();

/**
 * Two words give two initials, one word gives its first three characters. The
 * badge is a 46px disc at .66rem, which fits three Latin characters.
 */
export function initialsFor(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length > 1)
    return words
      .slice(0, 2)
      .map((w) => [...w][0])
      .join("")
      .toUpperCase();
  return [...words[0]].slice(0, 3).join("").toUpperCase();
}

/* A leading "scheme:", per RFC 3986. "//host/x" has none and is protocol-relative. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Logos are set by an admin, but this markup is public and a row is still
 * data. Only an absolute http(s) URL or a rooted same-origin path becomes an
 * image source, so `javascript:`, `data:` and a protocol-relative host are
 * ignored rather than rendered.
 */
export function safeLogoUrl(raw: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!HAS_SCHEME.test(value)) {
    return value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
  const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
  return scheme === "http" || scheme === "https" ? value : null;
}

/** The 46px disc: the sponsor's logo when we have one, their initials when we don't. */
function buildBadge(donor: Donor, name: string): HTMLElement {
  const badge = document.createElement("i");
  const initials = initialsFor(name);
  badge.dataset.initials = initials;
  const logo = safeLogoUrl(donor.logo_url);
  if (!logo) {
    badge.textContent = initials;
    return badge;
  }
  const img = document.createElement("img");
  img.src = logo;
  img.alt = "";
  img.width = 46;
  img.height = 46;
  img.loading = "lazy";
  img.decoding = "async";
  /* A logo that 404s or fails to decode falls back to the initials rather than
     leaving a broken-image icon in the row. */
  img.addEventListener("error", () => {
    badge.textContent = initials;
  });
  badge.appendChild(img);
  return badge;
}

function buildRow(donor: Donor, index: number, topChairs: number): HTMLLIElement {
  const name = displayName(donor);
  const chairs = Number(donor.total_chairs) || 0;
  const row = document.createElement("li");
  /* The bar is read as a share of the leader's total, which is how the
     snapshot's --impact values were written. */
  const share = topChairs > 0 ? Math.max(2, Math.round((chairs / topChairs) * 100)) : 0;
  row.style.setProperty("--impact", `${share}%`);

  const mark = document.createElement("span");
  mark.className = "rank-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.innerHTML = rankMark(index);

  const sponsor = document.createElement("span");
  sponsor.className = "sponsor-name";
  sponsor.appendChild(buildBadge(donor, name));
  const label = document.createElement("strong");
  label.textContent = name;
  sponsor.appendChild(label);

  const impact = document.createElement("span");
  impact.className = "impact";
  impact.appendChild(document.createElement("b"));
  const count = document.createElement("strong");
  count.textContent = numberFormat.format(chairs);
  impact.appendChild(count);

  row.append(mark, sponsor, impact);
  return row;
}

export const EMPTY_NOTE = {
  ar: "لا يوجد داعمون بعد. كن أول من يفتح مقعداً.",
  en: "No sponsors yet. Be the first to open a seat.",
} as const;

export const LIVE_NOTE = {
  ar: "مباشرة من سجلّ تبرعات المبادرة.",
  en: "Live from the initiative's donation records.",
} as const;

/**
 * Swaps the snapshot rows for live ones. An empty result paints the empty
 * state rather than leaving five sponsors on screen that the records do not
 * contain. Returns false when there is no leaderboard to paint.
 */
export function renderDonors(root: ParentNode, donors: Donor[], lang: "ar" | "en"): boolean {
  const list = root.querySelector<HTMLOListElement>(".leaderboard ol");
  if (!list) return false;

  if (donors.length === 0) {
    list.replaceChildren();
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = EMPTY_NOTE[lang];
    list.appendChild(empty);
    return true;
  }

  const topChairs = Math.max(...donors.map((d) => Number(d.total_chairs) || 0), 0);
  list.replaceChildren(...donors.map((donor, i) => buildRow(donor, i, topChairs)));
  return true;
}

/** The running total above the board, so it cannot disagree with the rows. */
export function renderSeatsCovered(root: ParentNode, total: number): void {
  const el = root.querySelector<HTMLElement>(".sponsor-summary strong");
  if (el) el.textContent = numberFormat.format(Math.max(0, Math.round(total)));
}

/**
 * The note under the board reads "Snapshot from the official initiative page"
 * by default, which stops being true once live rows are in. Taking over the
 * element means dropping its data-i18n key: initiative.js caches each
 * translatable element's English text in a map built at script load, and it
 * would otherwise overwrite this text with a cached value on a language
 * switch. The caller re-applies it on saae:languagechange instead.
 */
export function renderNote(root: ParentNode, lang: "ar" | "en"): void {
  const note = root.querySelector<HTMLElement>(
    '.leaderboard-note [data-i18n="snapshotNote"], .leaderboard-note [data-live-note]',
  );
  if (!note) return;
  note.removeAttribute("data-i18n");
  note.setAttribute("data-live-note", "");
  note.textContent = LIVE_NOTE[lang];
}
