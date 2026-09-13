import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRoute = (name: string) =>
  readFileSync(new URL("../../src/routes/" + name, import.meta.url), "utf8");

describe("LMS home access", () => {
  it("keeps Home unconditional and Profile available in both navigation designs", () => {
    for (const file of ["lms-skin/LmsSkinShell.tsx", "lms/LmsNavbar.tsx"]) {
      const source = readFileSync(new URL("../../src/components/" + file, import.meta.url), "utf8");
      const links = source.slice(source.indexOf("const links:"));
      const home = links.indexOf('to: "/learning-management-system"');
      expect(home).toBeGreaterThan(-1);
      expect(home).toBeLessThan(links.indexOf("isAuthed"));
      expect(links).toContain('to: "/learning-management-system/profile"');
      expect(links).toContain("tr.navHome");
    }
  });
  it("does not redirect members away when their session loads", () => {
    const source = readRoute("learning-management-system.index.tsx");
    expect(source).not.toContain("useLmsAuth");
    expect(source).not.toMatch(/\b(?:navigate|redirect)\s*\(/);
    expect(source).toContain('createFileRoute("/learning-management-system/")');
    expect(source).toContain("Route.useLoaderData()");
  });

  it("retains course discovery and the full catalog link", () => {
    const source = readRoute("learning-management-system.index.tsx");
    expect(source).toContain("setQuery");
    expect(source).toContain("setFilter");
    expect(source).toContain('to="/learning-management-system/catalog"');
  });

  it("keeps the student area's sign-in requirement", () => {
    const source = readRoute("learning-management-system.student.tsx");
    expect(source).toContain("!loading && !user");
    expect(source).toContain('to: "/learning-management-system/login"');
  });
});
