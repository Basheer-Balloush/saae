/* Routes using the cinematic LMS shell. Their stylesheets load through each
   route's head; other LMS pages keep the standard navbar and footer. */

export const LMS_SKIN_LINKS = [
  { rel: "stylesheet", href: "/lms/css/navigation.css" },
  { rel: "stylesheet", href: "/lms/css/lms.css" },
  { rel: "stylesheet", href: "/lms/css/lms-db.css" },
];

/* Pages move here one at a time as they are redesigned. */
const SKINNED_PATHS = [
  /^\/learning-management-system\/instructor(\/.*)?$/,
  /^\/learning-management-system\/student\/quiz\/[^/]+$/,
  /^\/learning-management-system$/,
  /^\/learning-management-system\/(catalog|verify)$/,
  /^\/learning-management-system\/courses\/[^/]+$/,
  /^\/learning-management-system\/(login|signup|forgot-password|reset-password)$/,
  /^\/learning-management-system\/internships(\/[^/]+(\/apply)?)?$/,
  /^\/learning-management-system\/student(\/requests)?$/,
  /^\/learning-management-system\/(profile|trainer-apply)$/,
  /^\/learning-management-system\/(certificate|instructors)\/[^/]+$/,
  /^\/learning-management-system\/admin(\/.*)?$/,
];

export const isSkinnedLmsPath = (pathname: string) => {
  const path = pathname.replace(/\/+$/, "");
  return SKINNED_PATHS.some((pattern) => pattern.test(path));
};

/* The instructor workspace (dashboard, course editor, assignments, quiz
   results, profile) closes with the public site's footer. */
export const isInstructorLmsPath = (pathname: string) =>
  /^\/learning-management-system\/instructor(\/|$)/.test(pathname);

/* The eight category gradients in lms.css (cat-* classes). Our category
   slugs are free text, so each category takes one by its display order. */
const TONES = [
  "ai",
  "programming",
  "business",
  "design",
  "health",
  "education",
  "engineering",
  "research",
];

/* A category's tone (its colour and icon) comes from its name, English or
   Arabic. A name with no match falls back to its place in the list. Order
   matters: "Programming And Development" is programming, while
   "Development" (التنمية) on its own is community development. */
const TONE_BY_NAME: [RegExp, string][] = [
  [/program|software|coding|\bcode\b|\bweb\b|برمج/i, "programming"],
  [/\bai\b|artificial|machine learning|\bdata\b|ذكاء|بيانات/i, "ai"],
  [/health|medic|\bcare\b|nurs|صح|طب/i, "health"],
  [/teat?ch|educat|train|تعليم|تدريب/i, "education"],
  [/architect|engineer|urban|عمار|هندس/i, "engineering"],
  [/design|تصميم/i, "design"],
  [/business|market|entrepren|manage|أعمال|تسويق|ريادة|إدارة/i, "business"],
  [/develop|تنمية/i, "research"],
];

export const categoryTone = (index: number, name = "") =>
  TONE_BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ??
  (index < 0 ? "ai" : TONES[index % TONES.length]);
