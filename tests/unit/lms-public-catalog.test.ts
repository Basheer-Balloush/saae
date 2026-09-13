import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAllPublicCourses, loadPublicInstructorCourses } from "@/lib/lms-public-catalog";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

function catalog(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `course-${i}`,
    category_id: i < 24 ? "first" : "later",
    total_count: count,
  }));
}

beforeEach(() => {
  rpc.mockReset();
});

describe("complete public catalog", () => {
  it("includes courses and categories beyond both previous limits", async () => {
    const rows = catalog(145);
    rpc.mockImplementation(async (_name, args) => ({
      data: rows.slice(args._offset, args._offset + Math.min(args._limit, 60)),
      error: null,
    }));
    expect(await loadAllPublicCourses()).toEqual(rows);
    expect(rpc.mock.calls.map((call) => call[1])).toEqual([
      { _limit: 60, _offset: 0 },
      { _limit: 60, _offset: 60 },
      { _limit: 60, _offset: 120 },
    ]);
  });

  it("does not silently retain a partial list after a failed or invalid later page", async () => {
    rpc
      .mockResolvedValueOnce({ data: catalog(80).slice(0, 60), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    await expect(loadAllPublicCourses()).rejects.toThrow("catalog_load_failed");

    rpc
      .mockReset()
      .mockResolvedValueOnce({ data: catalog(80).slice(0, 60), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    await expect(loadAllPublicCourses()).rejects.toThrow("catalog_changed_during_load");
  });
});

describe("public instructor courses", () => {
  it("finds courses after the former 60-course limit and limits concurrent checks", async () => {
    const rows = catalog(125);
    let active = 0;
    let peak = 0;
    rpc.mockImplementation(async (name, args) => {
      if (name === "lms_list_catalog_public") {
        return { data: rows.slice(args._offset, args._offset + args._limit), error: null };
      }
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active--;
      return {
        data: [
          { slug: ["course-62", "course-124"].includes(args._course_id) ? "teacher" : "other" },
        ],
        error: null,
      };
    });
    expect((await loadPublicInstructorCourses("teacher")).map((course) => course.id)).toEqual([
      "course-62",
      "course-124",
    ]);
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("stops before assignment checks after navigation away", async () => {
    rpc.mockResolvedValue({ data: catalog(3), error: null });
    expect(await loadPublicInstructorCourses("teacher", () => true)).toEqual([]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
