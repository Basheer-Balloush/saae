import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assistantPlacement } from "@/features/chat/lib/assistant-placement";

const SRC = path.resolve(import.meta.dirname, "../../src");
const sourceFiles = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(dir, f));

/** src/routes/learning-management-system/route.tsx -> /learning-management-system/x */
const routeUrl = (file: string) =>
  "/" +
  path
    .relative(path.join(SRC, "routes"), file)
    .replace(/\\/g, "/")
    .replace(/\.tsx$/, "")
    .replace(/(^|\/)(route|index)$/, "")
    .replace(/\./g, "/")
    .replace(/\$[^/]+/g, "x") +
  "/x";

describe("Abu Al-Joud chat placement", () => {
  it("mounts the chat on LMS pages without the floating launcher", () => {
    for (const p of [
      "/learning-management-system",
      "/learning-management-system/catalog",
      "/learning-management-system/courses/ai-workshop-for-architects",
      "/learning-management-system/student/player/x",
    ]) {
      expect(assistantPlacement(p)).toEqual({ mounted: true, launcher: false });
    }
  });

  it("keeps the homepage's own guide and the launcher on other public pages", () => {
    expect(assistantPlacement("/")).toEqual({ mounted: true, launcher: false });
    expect(assistantPlacement("/about")).toEqual({ mounted: true, launcher: true });
  });

  it("leaves the chat out of the consoles and standalone pages", () => {
    for (const p of [
      "/attendance-management-system",
      "/admin",
      "/super-admin",
      "/learning-management-system/admin/courses",
      "/profile/x",
      "/feedback",
    ]) {
      expect(assistantPlacement(p).mounted).toBe(false);
    }
  });

  it("mounts the chat wherever a route renders the site footer", () => {
    // The footer's "Chat with Abu Al-Joud" button only sends "assistant:open";
    // a page without the chat mounted leaves that button dead.
    const footerRoutes = sourceFiles(path.join(SRC, "routes")).filter((f) =>
      /<Footer\s*\/>/.test(readFileSync(f, "utf8")),
    );
    expect(footerRoutes.length).toBeGreaterThan(0);
    const dead = footerRoutes.map(routeUrl).filter((url) => !assistantPlacement(url).mounted);
    expect(dead).toEqual([]);
  });

  it("is the rule the root layout mounts the chat by", () => {
    const root = readFileSync(path.join(SRC, "routes/__root.tsx"), "utf8");
    expect(root).toContain("assistantPlacement(location.pathname)");
    expect(root).toMatch(
      /assistant\.mounted && <AssistantFab hideTrigger=\{!assistant\.launcher\} \/>/,
    );
    expect(root.match(/<AssistantFab\b/g)).toHaveLength(1);
  });
});

describe("touch taps", () => {
  it("uses no plain mouse hover handlers", () => {
    // A tap fires mouseenter right before its click. A hover that opens
    // something and a click that toggles it cancel out on phones (the LMS FAQ
    // did this). Use onPointerEnter and check pointerType === "mouse".
    const offenders = sourceFiles(SRC)
      .filter((f) => /\bonMouse(Enter|Leave|Over)=/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
