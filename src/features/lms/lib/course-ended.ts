/**
 * Shared "course ended" rule used by every course card surface.
 *
 * A course is ended when its end date is strictly in the past (a course that
 * ends today stays active for the whole day) AND it is not an online course.
 * Online courses are self-paced, so they never show the ended treatment.
 */
export type CourseEndedInput = {
  end_date?: string | null;
  delivery_mode?: string | null;
};

export function isCourseEnded(course: CourseEndedInput): boolean {
  // Explicit early exit: online courses are excluded from the ended state.
  if ((course.delivery_mode ?? "").toLowerCase() === "online") return false;

  const raw = course.end_date;
  if (!raw) return false; // No end date → never-ending.

  // Date-only comparison (YYYY-MM-DD), matching how the LMS stores schedules.
  const end = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

  return end < today;
}

/**
 * Open courses first, ended ones after, keeping the catalog order inside each
 * group, so visitors see what they can still join before the archive.
 */
export function sortOpenFirst<T extends CourseEndedInput>(courses: readonly T[]): T[] {
  return courses
    .map((course, index) => ({ course, index, ended: isCourseEnded(course) }))
    .sort((a, b) => Number(a.ended) - Number(b.ended) || a.index - b.index)
    .map((entry) => entry.course);
}
