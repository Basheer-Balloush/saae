// Scopes the LMS design stylesheets (public/lms/css) to the .lms-skin wrapper
// that LmsSkinShell renders. A route's stylesheet links stay in the document
// after client-side navigation, so unscoped rules (html, body, headings, the
// menu) would otherwise restyle the admin and instructor dashboards.
// Safe to run again: selectors that already mention .lms-skin are left alone.
//
// Usage: node scripts/scope-lms-css.mjs public/lms/css/*.css
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const SCOPE = ".lms-skin";

function scope(selector) {
  let s = selector.trim();
  if (s.includes(SCOPE)) return s;
  // html[dir="rtl"] stays in front so direction rules keep working.
  let prefix = "";
  const html = s.match(/^html((?:\[[^\]]*\])*)/);
  if (html) {
    prefix = html[1] ? `html${html[1]} ` : "";
    s = s.slice(html[0].length).trim();
  }
  if (s === ":root") s = "";
  // Page-level html/body rules apply to the wrapper itself.
  if (/^body\b/.test(s)) s = s.slice(4).trim();
  return s ? `${prefix}${SCOPE} ${s}` : `${prefix}${SCOPE}`;
}

const scopePlugin = {
  postcssPlugin: "scope-lms",
  Rule(rule) {
    const parent = rule.parent;
    if (parent?.type === "atrule" && /keyframes$/i.test(parent.name)) return;
    rule.selectors = rule.selectors.map(scope);
  },
};

for (const file of process.argv.slice(2)) {
  const css = readFileSync(file, "utf8");
  const result = postcss([scopePlugin]).process(css, { from: file });
  writeFileSync(file, result.css);
  console.log(`scoped ${file}`);
}
