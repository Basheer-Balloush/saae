/**
 * URL search-param contract for the public LMS catalogue.
 * Values are validated so that shared links, refreshes, and back/forward
 * navigation always resolve to a safe, bounded query.
 */
export const PAGE_SIZE = 24;

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const PRICES = ["free", "paid"] as const;

export type CatalogSearch = {
  q: string;
  category: string;
  level: string;
  price: string;
  page: number;
};

export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  // Search params arrive JSON-parsed, so a numeric slug like "1" comes back as a number.
  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  const level = str(raw?.level);
  const price = str(raw?.price);
  const pageRaw = Number(raw?.page);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.min(1000, Math.floor(pageRaw))) : 1;
  return {
    q: str(raw?.q).slice(0, 100),
    // Unknown category slugs are kept and resolved server-side to an empty
    // result set (never "all courses").
    category: str(raw?.category).slice(0, 120),
    level: (LEVELS as readonly string[]).includes(level) ? level : "",
    price: (PRICES as readonly string[]).includes(price) ? price : "",
    page,
  };
}

/** Router-facing shape: every param is optional so links need no `search` prop. */
export type CatalogSearchInput = Partial<CatalogSearch>;

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearchInput {
  return parseCatalogSearch(raw);
}
