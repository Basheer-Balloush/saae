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
  // Desktop logos are drawn by the React logo carousel mounted into
  // #partner-carousel-root (DesktopPartnerCarousel); this only fills the
  // screen-reader names, the status line and the directory link.
  let output = html;
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
