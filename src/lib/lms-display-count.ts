/**
 * Display-only student count for public course surfaces.
 *
 * Real enrollment data in the database is never modified — this only affects
 * what visitors see on course cards and course detail pages. Each course gets
 * a stable number in the 50–60 range (derived from its id, so it never
 * flickers between renders) and the real count is used whenever it is higher.
 *
 * Capacity checks (max_students / "course full") must keep using the real
 * `students_count`, not this value.
 */
const MIN_DISPLAY = 50;
const MAX_DISPLAY = 60;

function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function displayStudentsCount(courseId: string, realCount: number | null | undefined): number {
  const real = Number(realCount ?? 0);
  const span = MAX_DISPLAY - MIN_DISPLAY + 1;
  const floor = MIN_DISPLAY + (stableHash(courseId || "") % span);
  return Math.max(real, floor);
}
