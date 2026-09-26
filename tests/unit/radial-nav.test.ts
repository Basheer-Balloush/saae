import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { radialNavHtml, withSiteChrome } from "@/components/cinematic/radial-nav";

const HTML_DIR = path.resolve(import.meta.dirname, "../../src/components/cinematic/html");
const PUBLIC_JS_DIR = path.resolve(import.meta.dirname, "../../public/cinematic/js");
const pages = readdirSync(HTML_DIR).filter((f) => f.endsWith(".html"));
const page = (name: string) => readFileSync(path.join(HTML_DIR, name), "utf8");
const publicScript = (name: string) => readFileSync(path.join(PUBLIC_JS_DIR, name), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const current = (html: string) =>
  [...html.matchAll(/href="([^"]*)" aria-current="page"/g)].map((m) => m[1]);

describe("shared radial menu", () => {
  it.each([
    ["/", "#hero-sec"],
    ["/news", "/news"],
    ["/news/3d1ad0d0-55da-4343-9d71-046dfc27a027", "/news"],
    ["/about", "/about"],
    ["/partners", "/partners"],
    ["/initiative", "/initiative"],
    ["/contact", "/contact"],
    ["/learning-management-system", "/learning-management-system"],
  ])("marks exactly one item current on %s", (pathname, href) => {
    expect(current(radialNavHtml(pathname))).toEqual([href]);
  });

  it("links Home back to the homepage hero from other pages", () => {
    expect(radialNavHtml("/about")).toContain('href="/#hero-sec"');
    expect(current(radialNavHtml("/registration"))).toEqual([]);
  });

  it("keeps the hooks navigation.js and language.js look for", () => {
    const html = withSiteChrome("<!-- cinematic:language --><!-- cinematic:nav -->", "/");
    for (const hook of [
      'id="language-switch"',
      "data-radial-nav",
      "data-radial-items",
      "data-radial-toggle",
      "data-radial-close",
    ]) {
      expect(count(html, hook)).toBe(1);
    }
    expect(count(html, 'class="radial-nav-item"')).toBe(7);
  });

  it("renders the Arabic language state before client scripts load", () => {
    const html = withSiteChrome("<!-- cinematic:language --><!-- cinematic:nav -->", "/");
    expect(html).toContain('aria-label="Switch to English"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('<span class="language-switch-label">English</span>');
  });

  it("defaults new cinematic visitors to Arabic while preserving saved English", () => {
    const sharedLanguage = publicScript("language.js");
    const contactLanguage = publicScript("contact.js");
    expect(sharedLanguage).toContain('let initial = "ar";');
    expect(sharedLanguage).toContain('localStorage.getItem("saae-lang") || "ar"');
    expect(contactLanguage).toContain('saved === "en" ? "en" : "ar"');
  });
});

describe("every cinematic page", () => {
  it.each(pages)("%s uses the shared menu instead of its own copy", (file) => {
    const html = page(file);
    expect(count(html, "<!-- cinematic:nav -->")).toBe(1);
    expect(html).not.toContain("data-radial-nav");
    expect(html).not.toContain('class="site-nav"');
    /* The contact page keeps its own language button, which contact.js drives. */
    expect(count(html, "<!-- cinematic:language -->")).toBe(file === "contact.html" ? 0 : 1);
    expect(html).not.toContain('id="language-switch"');
  });

  it.each(pages)("%s links to this site rather than aisyria.org", (file) => {
    expect(page(file)).not.toMatch(/href="https?:\/\/(www\.)?aisyria\.org/);
  });
});

describe("page actions", () => {
  it("sends the homepage learning buttons to the learning platform", () => {
    const home = page("home.html");
    expect(home).not.toContain('href="/contact#write"');
    expect(count(home, 'href="/learning-management-system"')).toBeGreaterThanOrEqual(2);
  });

  it("wires the initiative buttons to the real forms, not the placeholder pay dialog or the old initiative pages", () => {
    const html = page("initiative.html");
    expect(count(html, 'data-initiative-action="pay"')).toBe(1);
    expect(count(html, 'data-initiative-action="waitlist"')).toBe(1);
    expect(count(html, 'data-initiative-action="donate"')).toBe(1);
    expect(html).not.toContain("data-pay-open");
    expect(html).not.toContain('id="pay-modal"');
    expect(html).toContain('href="/initiative/sponsors"');
    expect(html).not.toContain("/one-million-initiative");
  });
});
