/* What the assistant's live-data tools hand the model. Each shaper turns a raw
   row into the few fields a visitor asks about, in the visitor's language, with
   the same rules the public pages use (a course "ended", an internship "open").
   Kept free of network calls so every rule can be tested. */

import { isCourseEnded } from "@/features/lms/lib/course-ended";
import { courseUrl, priceLabel, type CatalogRow } from "@/features/chat/lib/chat-intake";

export type Lang = "ar" | "en";

const SITE = "https://www.aisyria.org";
const pick = (lang: Lang, ar: string | null | undefined, en: string | null | undefined) =>
  (lang === "ar" ? ar || en : en || ar) || null;
const day = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10) : null);
const clip = (text: string | null, max: number) =>
  text && text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

// ---------- Courses ----------

export type CourseListItem = {
  ref: string;
  title: string;
  url: string;
  level: string | null;
  price: string;
  delivery_mode: string | null;
  ended: boolean;
};

export function toCourseListItem(row: CatalogRow, lang: Lang): CourseListItem | null {
  const title = pick(lang, row.title_ar, row.title_en);
  if (!title) return null;
  return {
    ref: row.slug || row.id,
    title,
    url: courseUrl(row),
    level: row.level,
    price: priceLabel(row, lang),
    delivery_mode: row.delivery_mode,
    ended: isCourseEnded(row as { end_date?: string | null; delivery_mode?: string | null }),
  };
}

/** Courses a visitor can still join come first; ended ones only when asked for. */
export function courseList(
  rows: CatalogRow[],
  lang: Lang,
  includeEnded: boolean,
): CourseListItem[] {
  const items = rows
    .map((row) => toCourseListItem(row, lang))
    .filter((c): c is CourseListItem => !!c);
  const open = items.filter((c) => !c.ended);
  return includeEnded ? [...open, ...items.filter((c) => c.ended)] : open;
}

export type PublicCoursePayload = {
  course: {
    id: string;
    slug: string | null;
    title_ar: string | null;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    level: string | null;
    price: number | null;
    sale_price: number | null;
    is_free: boolean | null;
    students_count: number | null;
    enrollment_open: boolean | null;
    enrollment_deadline: string | null;
    max_students: number | null;
    start_date: string | null;
    end_date: string | null;
    schedule_days: string[] | null;
    schedule_time_from: string | null;
    schedule_time_to: string | null;
    location_ar: string | null;
    location_en: string | null;
    duration_hours: number | null;
    delivery_mode: string | null;
  };
  instructors?: Array<{
    slug: string | null;
    full_name: string | null;
    full_name_ar: string | null;
    full_name_en: string | null;
    specialty: string | null;
    specialty_ar: string | null;
    specialty_en: string | null;
  }> | null;
  sections?: Array<{
    title: string | null;
    title_ar?: string | null;
    title_en?: string | null;
  }> | null;
};

export type Registration = "open" | "closed" | "deadline_passed" | "full" | "ended";

/** The course page's own order: ended, closed, deadline passed, full, open. */
export function registrationStatus(
  c: PublicCoursePayload["course"],
  now = new Date(),
): Registration {
  if (isCourseEnded(c)) return "ended";
  if (!c.enrollment_open) return "closed";
  if (c.enrollment_deadline && new Date(c.enrollment_deadline) < now) return "deadline_passed";
  if (c.max_students != null && (c.students_count ?? 0) >= c.max_students) return "full";
  return "open";
}

const DAYS: Record<string, { ar: string; en: string }> = {
  sat: { ar: "السبت", en: "Saturday" },
  sun: { ar: "الأحد", en: "Sunday" },
  mon: { ar: "الإثنين", en: "Monday" },
  tue: { ar: "الثلاثاء", en: "Tuesday" },
  wed: { ar: "الأربعاء", en: "Wednesday" },
  thu: { ar: "الخميس", en: "Thursday" },
  fri: { ar: "الجمعة", en: "Friday" },
};

export function toCourseDetails(payload: PublicCoursePayload, lang: Lang, now = new Date()) {
  const c = payload.course;
  return {
    title: pick(lang, c.title_ar, c.title_en),
    url: courseUrl(c),
    description: clip(pick(lang, c.description_ar, c.description_en), 700),
    level: c.level,
    price: priceLabel(c, lang),
    delivery_mode: c.delivery_mode,
    start_date: day(c.start_date),
    end_date: day(c.end_date),
    days: (c.schedule_days ?? []).map((d) => DAYS[d]?.[lang]).filter(Boolean),
    time_from: c.schedule_time_from,
    time_to: c.schedule_time_to,
    location: pick(lang, c.location_ar, c.location_en)?.trim() ?? null,
    duration_hours: c.duration_hours != null ? Number(c.duration_hours) : null,
    registration: registrationStatus(c, now),
    enrollment_deadline: day(c.enrollment_deadline),
    instructors: (payload.instructors ?? []).map((i) => ({
      name: pick(lang, i.full_name_ar || i.full_name, i.full_name_en || i.full_name),
      specialty: pick(lang, i.specialty_ar ?? i.specialty, i.specialty_en ?? i.specialty),
      profile_url: i.slug ? `${SITE}/learning-management-system/instructors/${i.slug}` : null,
    })),
    sections: (payload.sections ?? [])
      .map((s) => pick(lang, s.title_ar ?? s.title, s.title_en ?? s.title))
      .filter((t): t is string => !!t)
      .slice(0, 15),
  };
}

// ---------- Internships ----------

export type InternshipRow = {
  slug: string;
  title_ar: string | null;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
  location_ar: string | null;
  location_en: string | null;
  duration_ar: string | null;
  duration_en: string | null;
  stipend_ar: string | null;
  stipend_en: string | null;
  opens_at: string | null;
  deadline_at: string | null;
  starts_at: string | null;
  capacity: number | null;
  require_cv: boolean | null;
};

export type InternshipStatus = "open" | "not_open_yet" | "deadline_passed";

export function internshipStatus(
  row: Pick<InternshipRow, "opens_at" | "deadline_at">,
  now = new Date(),
): InternshipStatus {
  if (row.deadline_at && new Date(row.deadline_at) < now) return "deadline_passed";
  if (row.opens_at && new Date(row.opens_at) > now) return "not_open_yet";
  return "open";
}

export function toInternship(row: InternshipRow, lang: Lang, now = new Date()) {
  return {
    title: pick(lang, row.title_ar, row.title_en)?.replace(/^["«]+/, "") ?? null,
    url: `${SITE}/learning-management-system/internships/${row.slug}`,
    summary: clip(pick(lang, row.summary_ar, row.summary_en), 600),
    requirements: clip(pick(lang, row.requirements_ar, row.requirements_en), 500),
    location: pick(lang, row.location_ar, row.location_en),
    duration: pick(lang, row.duration_ar, row.duration_en),
    stipend: pick(lang, row.stipend_ar, row.stipend_en),
    capacity: row.capacity,
    requires_cv: !!row.require_cv,
    opens_at: day(row.opens_at),
    deadline: day(row.deadline_at),
    starts_at: day(row.starts_at),
    status: internshipStatus(row, now),
  };
}

// ---------- News ----------

export type NewsRow = {
  id: string;
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  published_at: string | null;
};

/** The news table holds the same story twice when it was posted twice; keep the first. */
export function toNewsList(rows: NewsRow[], lang: Lang) {
  const seen = new Set<string>();
  const out = [];
  for (const row of rows) {
    const title = pick(lang, row.title_ar, row.title_en) ?? row.title;
    if (!title || seen.has(title.trim())) continue;
    seen.add(title.trim());
    out.push({
      title: title.trim(),
      date: day(row.published_at),
      summary: clip(pick(lang, row.excerpt_ar, row.excerpt_en) ?? row.excerpt, 300),
      url: `${SITE}/news/${row.id}`,
    });
  }
  return out;
}

// ---------- The Million initiative ----------

export type InitiativeStatsRow = {
  target?: number | null;
  done?: number | null;
  waiting?: number | null;
  covered_unassigned?: number | null;
  total_chairs_funded?: number | null;
};

export function toInitiativeStatus(
  stats: InitiativeStatsRow | null,
  donors: Array<{ donor_name: string; donor_display_name: string | null; total_chairs: number }>,
) {
  const n = (v: number | null | undefined) => Number(v ?? 0);
  return {
    target: n(stats?.target) || 1_000_000,
    learners_done: n(stats?.done),
    waiting_list: n(stats?.waiting),
    sponsored_seats: n(stats?.total_chairs_funded),
    top_sponsors: donors.slice(0, 8).map((d) => ({
      name: d.donor_display_name || d.donor_name,
      seats: Number(d.total_chairs),
    })),
    page: `${SITE}/initiative`,
    sponsors_page: `${SITE}/initiative/sponsors`,
  };
}

// ---------- Visitor contact details ----------

/** A phone a person could actually be called on: 7–15 digits, not one digit repeated. */
export function isPlausiblePhone(raw: string | null | undefined): boolean {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  return !/^(\d)\1+$/.test(digits);
}
