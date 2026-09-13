import { bilingualHtml, escapeHtml, replaceRegion } from "@/lib/cinematic-db-content";
import type { PartnerResult } from "./data";

function statusHtml(failed: boolean): string {
  const message = failed
    ? bilingualHtml(
        "Partners could not be loaded. Please try again.",
        "تعذّر تحميل الشركاء. يرجى المحاولة مرة أخرى.",
      )
    : bilingualHtml("No partners to display yet.", "لا يوجد شركاء لعرضهم حالياً.");
  const retry = failed
    ? `<a href="/partners">${bilingualHtml("Try again", "حاول مرة أخرى")}</a>`
    : "";
  return `<p role="status" class="db-partners-status">${message} ${retry}</p>`;
}

export function applyPartnerDirectory(html: string, result: PartnerResult): string {
  const rows = result.failed ? [] : result.partners;
  const content = rows.length
    ? `<ul class="partner-grid">${rows
        .map((p) => {
          const logo = p.lightLogo ?? p.logo;
          return `<li class="partner-plate"><span class="plate-face db-partner-face">${logo ? `<img src="${escapeHtml(logo)}" alt="" width="320" height="320" style="max-height:${p.height}px;object-fit:contain" loading="lazy" decoding="async">` : ""}</span><span class="plate-name">${escapeHtml(p.name)}</span></li>`;
        })
        .join("\n")}</ul>`
    : statusHtml(result.failed);
  return replaceRegion(html, "partner-directory", content);
}

export function applyHomePartners(html: string, result: PartnerResult): string {
  const rows = result.failed ? [] : result.partners;
  const logoRows = rows.filter((p) => p.logo || p.lightLogo);
  const marks = logoRows
    .map((p, i) => {
      // CSS strings require escaping in addition to HTML attribute escaping.
      const url = (p.logo ?? p.lightLogo)!.replace(
        /["'\\()<>\s]/g,
        (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`,
      );
      // Fit every row into the existing 0..1 scroll clock, regardless of count.
      const step = logoRows.length > 1 ? 0.52 / (logoRows.length - 1) : 0.26;
      const style = `--gain: ${p.height / 96}; --i: ${logoRows.length === 1 ? 1 : i}; --step: ${step}s; --mark: url("${url}")`;
      return `<span class="partner-mark${i % 2 ? " is-left" : ""}${i % 4 < 2 ? " is-high" : " is-low"}" style="${escapeHtml(style)}"></span>`;
    })
    .join("\n");
  let output = replaceRegion(html, "home-partner-marks", marks);
  output = replaceRegion(
    output,
    "home-partner-names",
    rows.map((p) => `<li>${escapeHtml(p.name)}</li>`).join("\n"),
  );
  output = replaceRegion(
    output,
    "home-partner-status",
    rows.length ? "" : statusHtml(result.failed),
  );
  return output.replace(
    "See all 23 partners",
    bilingualHtml("See all partners", "شاهد جميع الشركاء"),
  );
}
