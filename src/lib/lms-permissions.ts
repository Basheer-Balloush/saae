// Phase 5A — client-side mirror of the co-instructor authorization matrix.
// Authoritative check lives in `public.can_manage_lms_course` and
// `public.has_lms_course_capability`; this module only decides which UI
// controls to render.

export type LmsCourseCapability = "edit" | "grade" | "manage_enrollments";

export type LmsCourseAccess = {
  canView: boolean;      // primary, admin, any co-instructor
  canEdit: boolean;      // structure, lessons, quizzes
  canGrade: boolean;     // submissions, quiz overrides
  canManageEnrollments: boolean;
  isPrimary: boolean;
  isAdmin: boolean;
};

export const NO_ACCESS: LmsCourseAccess = {
  canView: false,
  canEdit: false,
  canGrade: false,
  canManageEnrollments: false,
  isPrimary: false,
  isAdmin: false,
};
