import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applySponsorDirectory,
  sponsorRowsHtml,
  sponsorTotals,
  type SponsorRow,
} from "../../src/components/initiative/sponsor-directory";

const page = readFileSync(
  path.join(__dirname, "../../src/components/cinematic/html/initiative-sponsors.html"),
  "utf8",
);

const row = (over: Partial<SponsorRow> = {}): SponsorRow => ({
  donor_name: "elm",
  donor_display_name: "",
  logo_url:
    "https://zkpuyhrmyslmstzwojvw.supabase.co/storage/v1/object/public/news-images/initiative-logos/a.jpg",
  total_chairs: 500,
  total_amount: "500.00",
  last_donation_at: "2026-06-25T00:17:01.649714+00:00",
  ...over,
});

describe("the all-sponsors list", () => {
  it("shows each sponsor's logo, seats, amount and last contribution", () => {
    const html = sponsorRowsHtml({ sponsors: [row()], failed: false });
    expect(html).toContain('<img src="https://zkpuyhrmyslmstzwojvw.supabase.co/');
    expect(html).toContain('data-initials="ELM"');
    expect(html).toContain("<strong>elm</strong>");
    expect(html).toContain("<strong>500</strong>");
    expect(html).toContain("$500");
    expect(html).toContain("25 June 2026");
  });

  it("falls back to initials when a sponsor has no logo", () => {
    const html = sponsorRowsHtml({
      sponsors: [row({ donor_name: "mdc", logo_url: "" })],
      failed: false,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("<i>MDC</i>");
  });

  it("never lets a submitted name or logo reach the page as markup", () => {
    const html = sponsorRowsHtml({
      sponsors: [
        row({ donor_name: '<img src=x onerror="alert(1)">', logo_url: "javascript:alert(1)" }),
      ],
      failed: false,
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("prefers the display name when one is set", () => {
    const html = sponsorRowsHtml({
      sponsors: [row({ donor_display_name: "Elm Company" })],
      failed: false,
    });
    expect(html).toContain("<strong>Elm Company</strong>");
  });

  it("scales each bar against the top sponsor", () => {
    const html = sponsorRowsHtml({
      sponsors: [row(), row({ donor_name: "nsave", total_chairs: 100 })],
      failed: false,
    });
    expect(html).toContain("--impact: 100%");
    expect(html).toContain("--impact: 20%");
  });

  it("says so when there are no sponsors, and says something different when the read failed", () => {
    expect(sponsorRowsHtml({ sponsors: [], failed: false })).toContain("No sponsors yet");
    expect(sponsorRowsHtml({ sponsors: [], failed: true })).toContain("could not be loaded");
  });

  it("adds up the totals shown above the list", () => {
    expect(sponsorTotals([row(), row({ total_chairs: 250, total_amount: 250 })])).toEqual({
      count: 2,
      seats: 750,
      amount: 750,
    });
  });
});

describe("the all-sponsors page", () => {
  it("splices the rows and totals into the page markup", () => {
    const html = applySponsorDirectory(page, {
      sponsors: [row(), row({ donor_name: "Devista", total_chairs: 250, total_amount: 250 })],
      failed: false,
    });
    expect(html).toContain("<strong>Devista</strong>");
    expect(html).toMatch(/db:sponsor-count:start -->\s*2\s*<!--/);
    expect(html).toMatch(/db:sponsor-seats:start -->\s*750\s*<!--/);
    expect(html).toMatch(/db:sponsor-amount:start -->\s*\$750\s*<!--/);
  });

  it("shows dashes, not zeros, when the records could not be read", () => {
    const html = applySponsorDirectory(page, { sponsors: [], failed: true });
    expect(html).toMatch(/db:sponsor-seats:start -->\s*—\s*<!--/);
  });

  it("links only to pages in the current design", () => {
    expect(page).not.toContain("/one-million-initiative");
    expect(page).toContain('href="/initiative"');
    expect(page).toContain('data-initiative-action="donate"');
  });
});
