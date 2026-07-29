/**
 * Single reusable rule for "where does an enrolled student go for this course?".
 *
 * `lms_courses.delivery_mode` is the source of truth:
 *   - "online" → the online lesson player
 *   - "onsite" → the onsite-aware course page (schedule, location, sessions,
 *     attendance and attendance-based progress)
 */
export type DeliveryMode = "online" | "onsite";

export type CourseDestination =
  | { to: "/learning-management-system/student/player/$courseId"; params: { courseId: string } }
  | { to: "/learning-management-system/courses/$id"; params: { id: string } };

export function normalizeDeliveryMode(mode: string | null | undefined): DeliveryMode {
  return mode === "online" ? "online" : "onsite";
}

export function isOnsite(mode: string | null | undefined): boolean {
  return normalizeDeliveryMode(mode) === "onsite";
}

export function courseDestination(
  courseId: string,
  mode: string | null | undefined,
): CourseDestination {
  if (normalizeDeliveryMode(mode) === "online") {
    return {
      to: "/learning-management-system/student/player/$courseId",
      params: { courseId },
    };
  }
  return { to: "/learning-management-system/courses/$id", params: { id: courseId } };
}
