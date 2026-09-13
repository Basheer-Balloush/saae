/* The student-facing LMS pages drawn in Moaz's "LMS React 2" design. Their
   stylesheets load only on these routes (through each route's head), so the
   admin and instructor dashboards keep their own look. */

export const LMS_SKIN_LINKS = [
  { rel: "stylesheet", href: "/lms/css/navigation.css" },
  { rel: "stylesheet", href: "/lms/css/lms.css" },
  { rel: "stylesheet", href: "/lms/css/lms-db.css" },
];

/* Pages move here one at a time as they are redesigned. */
const SKINNED_PATHS = [
  /^\/learning-management-system\/catalog$/,
  /^\/learning-management-system\/courses\/[^/]+$/,
];

export const isSkinnedLmsPath = (pathname: string) => {
  const path = pathname.replace(/\/+$/, "");
  return SKINNED_PATHS.some((pattern) => pattern.test(path));
};

/* The eight category gradients in lms.css (cat-* classes). Our category
   slugs are free text, so each category takes one by its display order. */
const TONES = ["ai", "programming", "business", "design", "health", "education", "engineering", "research"];

export const categoryTone = (index: number) => (index < 0 ? "ai" : TONES[index % TONES.length]);
