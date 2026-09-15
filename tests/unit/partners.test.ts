import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileHomeView } from "@/components/home/MobileHome";
import homeHtml from "@/components/cinematic/html/home.html?raw";
import directoryHtml from "@/components/cinematic/html/partners.html?raw";
import {
  loadPartners,
  normalisePartner,
  resolvePartnerLogo,
  type PartnerRow,
} from "@/features/website/partners/data";
import { applyHomePartners, applyPartnerDirectory } from "@/features/website/partners/render";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
const row: PartnerRow = {
  id: "new-partner",
  name: "New database partner",
  logo_url: "https://example.org/logo.png",
  logo_light_url: null,
  size_class: "h-24",
};
const partner = normalisePartner(row);

function mockQuery(response: { data: PartnerRow[] | null; error: unknown }) {
  const promise = Promise.resolve(response);
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), then: promise.then.bind(promise) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}

beforeEach(() => vi.clearAllMocks());

describe("public partner loading", () => {
  it("uses the admin homepage toggle and deterministic display order", async () => {
    const query = mockQuery({ data: [row], error: null });
    expect(await loadPartners(true)).toEqual({ partners: [partner], failed: false });
    expect(mocks.from).toHaveBeenCalledWith("partners");
    expect(query.eq).toHaveBeenCalledWith("show_on_home", true);
    expect(query.order.mock.calls).toEqual([
      ["display_order", { ascending: true }],
      ["id", { ascending: true }],
    ]);
  });
  it("loads the complete directory without a homepage filter", async () => {
    const query = mockQuery({ data: [row], error: null });
    await loadPartners();
    expect(query.eq).not.toHaveBeenCalled();
  });
  it("distinguishes empty tables from query and network failures", async () => {
    mockQuery({ data: [], error: null });
    expect(await loadPartners()).toEqual({ partners: [], failed: false });
    mockQuery({ data: [row], error: { message: "denied" } });
    expect(await loadPartners()).toEqual({ partners: [], failed: true });
    mocks.from.mockImplementationOnce(() => {
      throw new Error("offline");
    });
    expect(await loadPartners()).toEqual({ partners: [], failed: true });
  });
  it("resolves legacy bundled assets and validates logo URLs and sizes", () => {
    expect(resolvePartnerLogo("/src/assets/partner-sdo.png")).toBeTruthy();
    expect(resolvePartnerLogo("/src/assets/partner-missing.png")).toBeNull();
    for (const url of [
      "javascript:alert(1)",
      "//evil.test/logo",
      "/\\evil.test",
      "https://user:pass@example.org/logo",
      "data:image/svg+xml,test",
    ])
      expect(resolvePartnerLogo(url)).toBeNull();
    expect(normalisePartner({ ...row, size_class: "h-40" }).height).toBe(160);
    expect(normalisePartner({ ...row, size_class: "bad;css" }).height).toBe(96);
  });
});

describe("desktop partner displays", () => {
  it("replaces sample partners with database values, order and safe text", () => {
    const result = {
      partners: [
        partner,
        {
          ...partner,
          id: "second",
          name: '<img src=x onerror="bad()">',
          lightLogo: "https://example.org/light.png",
        },
      ],
      failed: false,
    };
    const directory = applyPartnerDirectory(directoryHtml, result);
    expect(directory).toContain(row.name);
    expect(directory).toContain("https://example.org/light.png");
    expect(directory).toContain("&lt;img");
    expect(directory).not.toContain("<img src=x");
    expect(directory.indexOf(row.name)).toBeLessThan(directory.indexOf("&lt;img"));
    for (const html of [directory, applyHomePartners(homeHtml, result)]) {
      expect(html).not.toContain("partner-damascus.webp");
      expect(html).not.toContain("See all 23 partners");
      expect(html).toContain(row.name);
    }
  });
  it.each([false, true])("renders honest empty/error states (failed=%s)", (failed) => {
    for (const html of [
      applyPartnerDirectory(directoryHtml, { partners: [], failed }),
      applyHomePartners(homeHtml, { partners: [], failed }),
    ]) {
      expect(html).toContain(
        failed ? "Partners could not be loaded" : "No partners to display yet",
      );
      expect(html).not.toContain("partner-damascus.webp");
      expect(html).toContain('role="status"');
    }
  });
  it("leaves the desktop logos to the carousel mount", () => {
    const html = applyHomePartners(homeHtml, { partners: [partner], failed: false });
    expect(html).toContain('id="partner-carousel-root"');
    expect(html).not.toContain('class="partner-mark');
  });
});

describe("desktop partner flow timing", () => {
  it("uses browser-safe, script-provided animation delays", () => {
    const root = process.cwd();
    const css = readFileSync(path.join(root, "public/cinematic/css/home.css"), "utf8");
    const script = readFileSync(path.join(root, "public/cinematic/js/sections.js"), "utf8");

    expect(css).toContain("animation-delay: var(--partner-delay, 0s)");
    expect(css).not.toContain("calc(var(--i) * var(--step)");
    expect(script).toContain('mark.style.setProperty("--partner-delay"');
    expect(script).toContain("paintPartnerMarks(.5)");
  });
});

describe("mobile database partners", () => {
  const render = (partners = [partner], partnersFailed = false, lang: "ar" | "en" = "en") =>
    renderToStaticMarkup(
      createElement(MobileHomeView, {
        lang,
        onToggleLang: () => {},
        news: [],
        partners,
        partnersFailed,
      }),
    );
  it("shows only provided rows and a generic directory link", () => {
    const html = render();
    expect(html).toContain(row.name);
    expect(html).toContain(row.logo_url);
    expect(html).toContain("See all partners");
    expect(html).not.toContain("partner-damascus.webp");
    expect(html).not.toContain("See all 23 partners");
    expect(html).not.toContain("mh-row-reverse");
  });
  it("does not restore prototype rows when empty or unavailable", () => {
    expect(render([])).toContain("No partners to display yet");
    expect(render([])).not.toContain("mh-marquee-toggle");
    expect(render([partner], true)).not.toContain(row.name);
    expect(render([], true)).toContain("Partners could not be loaded");
    expect(render([], true, "ar")).toContain("تعذّر تحميل الشركاء");
  });
  it("keeps the name visible when the logo is absent", () => {
    expect(render([{ ...partner, logo: null }])).toContain(`<span>${row.name}</span>`);
  });
});
