import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicCourse = Database["public"]["Functions"]["lms_list_catalog_public"]["Returns"][number];

// The public RPC returns at most 60 courses per call, whatever limit a caller sends.
const BATCH_SIZE = 60;

export async function loadAllPublicCourses(): Promise<PublicCourse[]> {
  const courses: PublicCourse[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let total = 0;
  do {
    const { data, error } = await supabase.rpc("lms_list_catalog_public", {
      _limit: BATCH_SIZE,
      _offset: offset,
    });
    if (error) throw new Error("catalog_load_failed");
    const rows = data ?? [];
    if (!rows.length) {
      if (offset < total) throw new Error("catalog_changed_during_load");
      break;
    }
    total = Number(rows[0].total_count);
    if (!Number.isFinite(total) || total < 0) throw new Error("catalog_invalid_count");
    const sizeBeforePage = seen.size;
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        courses.push(row);
      }
    }
    // Fail honestly rather than displaying a partial list if the catalog changes mid-read.
    if (seen.size - sizeBeforePage !== rows.length) throw new Error("catalog_changed_during_load");
    offset += rows.length;
  } while (offset < total);
  return courses;
}

export async function loadPublicInstructorCourses(
  slug: string,
  isCancelled: () => boolean = () => false,
): Promise<PublicCourse[]> {
  const courses = await loadAllPublicCourses();
  const matches: PublicCourse[] = [];
  // Keep the existing public RPCs and avoid exposing private instructor IDs.
  for (let offset = 0; offset < courses.length; offset += 6) {
    if (isCancelled()) return [];
    const batch = await Promise.all(
      courses.slice(offset, offset + 6).map(async (course) => {
        const { data, error } = await supabase.rpc("get_public_instructors_for_course", {
          _course_id: course.id,
        });
        if (error) throw new Error("instructor_courses_load_failed");
        return data?.some((instructor) => instructor.slug === slug) ? course : null;
      }),
    );
    matches.push(...batch.filter((course): course is PublicCourse => course !== null));
  }
  return matches;
}
