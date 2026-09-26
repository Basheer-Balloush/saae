import type { User } from "@supabase/supabase-js";
import type { CourseFieldErrors, RequiredCourseField } from "@/lib/lms-course-fields";

export type Course = {
  id: string;
  slug: string | null;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  level: string;
  price: number;
  sale_price: number | null;
  is_free: boolean;
  status: string;
  rejection_reason: string | null;
  category_id: string | null;
  instructor_id: string;
  enrollment_open: boolean;
  enrollment_deadline: string | null;
  max_students: number | null;
  students_count: number;
  start_date: string | null;
  end_date: string | null;
  schedule_days: string[] | null;
  schedule_time_from: string | null;
  schedule_time_to: string | null;
  location_ar: string | null;
  location_en: string | null;
  duration_hours: number | null;
  delivery_mode: "onsite" | "online";
  certificate_pdf_enabled: boolean;
};

export type Section = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  display_order: number;
};
export type LessonAttachment = { name: string; url: string; path?: string };
export type Lesson = {
  id: string;
  section_id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  video_url: string | null;
  video_provider: string;
  video_uid: string | null;
  video_ready: boolean;
  video_status: string;
  content_md: string | null;
  content_md_ar: string | null;
  content_md_en: string | null;
  is_preview: boolean;
  duration_seconds: number;
  display_order: number;
  attachments: LessonAttachment[] | null;
};
export type Category = { id: string; name_ar: string; name_en: string | null };

// Everything typed in the editor that a refresh could lose: the course fields
// sent by saveCourse, plus section and lesson texts (those save on blur).
export const COURSE_DRAFT_FIELDS = [
  "slug",
  "title_ar",
  "title_en",
  "description_ar",
  "description_en",
  "cover_url",
  "level",
  "price",
  "sale_price",
  "is_free",
  "enrollment_open",
  "enrollment_deadline",
  "max_students",
  "certificate_pdf_enabled",
  "start_date",
  "end_date",
  "schedule_days",
  "schedule_time_from",
  "schedule_time_to",
  "location_ar",
  "location_en",
  "duration_hours",
] as const satisfies readonly (keyof Course)[];

export type CourseEdits = {
  course: Partial<Course>;
  categoryIds: string[];
  sections: Record<string, Pick<Section, "title_ar" | "title_en">>;
  lessons: Record<
    string,
    Pick<Lesson, "title_ar" | "title_en" | "content_md_ar" | "content_md_en">
  >;
};

export function courseEdits(
  c: Course,
  categoryIds: string[],
  sections: Section[],
  lessons: Lesson[],
): CourseEdits {
  return {
    course: Object.fromEntries(COURSE_DRAFT_FIELDS.map((k) => [k, c[k]])) as Partial<Course>,
    categoryIds: [...categoryIds].sort(),
    sections: Object.fromEntries(
      sections.map((x) => [x.id, { title_ar: x.title_ar, title_en: x.title_en }]),
    ),
    lessons: Object.fromEntries(
      lessons.map((l) => [
        l.id,
        {
          title_ar: l.title_ar,
          title_en: l.title_en,
          content_md_ar: l.content_md_ar,
          content_md_en: l.content_md_en,
        },
      ]),
    ),
  };
}

export type EditorTab =
  "details" | "schedule" | "content" | "students" | "attendance" | "grading" | "completion";
export const EDITOR_TABS: EditorTab[] = [
  "details",
  "schedule",
  "content",
  "students",
  "attendance",
  "grading",
  "completion",
];

/** What every tab receives from the editor. */
export type EditorCtx = {
  course: Course;
  update: (patch: Partial<Course>) => void;
  /** For fields already written to the database: update without marking the form unsaved. */
  commit: (patch: Partial<Course>) => void;
  setCourse: (c: Course) => void;
  user: User | null;
  isAdmin: boolean;
  /** Owner or admin: may manage co-instructors, attendance links, the danger zone. */
  canManage: boolean;
  lang: "ar" | "en";
  ar: boolean;
  t: (ar: string, en: string) => string;
  reload: () => Promise<void>;
  fieldErrors: CourseFieldErrors;
  fieldRefs: React.MutableRefObject<
    Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>
  >;
};
