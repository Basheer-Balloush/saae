import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LmsPortalSkin } from "@/components/ui/lms-portal-skin";

const panel = createElement("div", { role: "alertdialog", className: "fixed z-50" }, "x");

describe("LMS skin on portalled dialogs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("wraps LMS dialogs in an invisible skin box, leaving the panel's classes alone", () => {
    vi.stubGlobal("window", { location: { pathname: "/learning-management-system/instructor/courses/x" } });
    expect(renderToStaticMarkup(createElement(LmsPortalSkin, null, panel))).toBe(
      '<div class="lms-dashboard-wrap lms-skin dark" style="display:contents"><div role="alertdialog" class="fixed z-50">x</div></div>',
    );
  });

  it("adds nothing outside the LMS (attendance system, admin, public site)", () => {
    for (const pathname of ["/attendance-management-system", "/admin", "/"]) {
      vi.stubGlobal("window", { location: { pathname } });
      expect(renderToStaticMarkup(createElement(LmsPortalSkin, null, panel))).toBe(
        '<div role="alertdialog" class="fixed z-50">x</div>',
      );
    }
  });

  it("keeps .lms-skin off every shared UI component's own classes", () => {
    // .lms-skin carries page rules (position: relative; min-height: 100vh)
    // that push a fixed panel off screen behind its black backdrop.
    const dir = path.resolve(import.meta.dirname, "../../src/components/ui");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && f !== "lms-portal-skin.tsx")
      .filter((f) => readFileSync(path.join(dir, f), "utf8").includes("lms-skin"));
    expect(offenders).toEqual([]);
  });
});
