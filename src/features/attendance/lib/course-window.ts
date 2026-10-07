/* Which courses an instructor sees in the attendance system: the ones still
   running, plus those that ended in the last GRACE_DAYS so a late register can
   still be completed. Online courses never end (same rule as the course cards).
   A course with no end date is current. */

export const GRACE_DAYS = 14;

export function isInAttendanceWindow(
  course: { end_date?: string | null; delivery_mode?: string | null },
  now = new Date(),
  graceDays = GRACE_DAYS,
): boolean {
  if ((course.delivery_mode ?? "").toLowerCase() === "online") return true;
  const end = course.end_date ? String(course.end_date).slice(0, 10) : null;
  if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return true;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - graceDays);
  const cutoffDay = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return end >= cutoffDay;
}
