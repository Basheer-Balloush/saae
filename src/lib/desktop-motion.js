/* Every desktop sees the site's full motion, even when the system asks for
   reduced motion. Windows reports "reduce" whenever its animations are switched
   off, which many laptops do for speed ("Adjust for best performance"), and
   those desktops lost the 3D tree, the scroll journeys and the section
   animations. Phones and tablets keep honouring the setting.

   Inlined at the top of <head> by __root.tsx, before any other script, and
   only acts on a desktop that reports "reduce":
   - window.matchMedia answers any query naming prefers-reduced-motion as if the
     preference were "no-preference". framer-motion, GSAP, Lenis and the
     cinematic scripts all ask through it.
   - CSS @media rules naming it are rewritten the same way as each stylesheet
     arrives. */
(function () {
  try {
    var ask = window.matchMedia && window.matchMedia.bind(window);
    if (!ask || !ask("(min-width: 768px) and (pointer: fine)").matches) return;
    if (!ask("(prefers-reduced-motion: reduce)").matches) return;

    var NAMED = /prefers-reduced-motion/i;
    var rewrite = function (query) {
      return String(query)
        .replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/gi, "(max-width: 0px)")
        .replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/gi, "(min-width: 0px)")
        .replace(/\(\s*prefers-reduced-motion\s*\)/gi, "(max-width: 0px)");
    };

    window.matchMedia = function (query) {
      return ask(NAMED.test(query) ? rewrite(query) : query);
    };

    var fixRules = function (rules) {
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (rule.media && NAMED.test(rule.media.mediaText)) {
          rule.media.mediaText = rewrite(rule.media.mediaText);
        }
        if (rule.styleSheet) fixSheet(rule.styleSheet);
        if (rule.cssRules) fixRules(rule.cssRules);
      }
    };
    var fixSheet = function (sheet) {
      try {
        if (sheet && sheet.cssRules) fixRules(sheet.cssRules);
      } catch (error) {
        /* A cross-origin sheet (Google Fonts) can't be read; it has no motion rules. */
      }
    };
    var fixAll = function () {
      for (var i = 0; i < document.styleSheets.length; i++) fixSheet(document.styleSheets[i]);
    };

    /* React hoists the stylesheets above this script, and a script waits for
       the stylesheets before it, so those are already here. */
    fixAll();
    document.addEventListener(
      "load",
      function (event) {
        if (event.target && event.target.nodeName === "LINK") fixSheet(event.target.sheet);
      },
      true,
    );
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (record.target.nodeName === "STYLE") fixSheet(record.target.sheet);
        for (var j = 0; j < record.addedNodes.length; j++) {
          var node = record.addedNodes[j];
          if (node.nodeName === "STYLE" || node.nodeName === "LINK") fixSheet(node.sheet);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", fixAll);
    window.addEventListener("load", fixAll);
  } catch (error) {
    /* Never let this stop the page: at worst the site keeps the reduced motion. */
  }
})();
