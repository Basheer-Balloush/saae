import { courseUrl, type CatalogRow, type CourseOption } from "./chat-intake";

export type ChatLanguage = "ar" | "en";

export type PublicCourse = {
  title_ar?: string | null;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  schedule_days?: string[] | null;
  schedule_time_from?: string | null;
  schedule_time_to?: string | null;
  location_ar?: string | null;
  location_en?: string | null;
  duration_hours?: number | null;
  delivery_mode?: string | null;
  enrollment_open?: boolean | null;
  enrollment_deadline?: string | null;
  max_students?: number | null;
  students_count?: number | null;
};

export type PublicCoursePayload = {
  course?: PublicCourse | null;
  sections?: { title?: string | null }[] | null;
};

const STOP_WORDS = new Set([
  "شو",
  "ما",
  "هي",
  "هو",
  "عن",
  "من",
  "في",
  "عندكم",
  "عندكن",
  "بدي",
  "قصدي",
  "خبرني",
  "احكيلي",
  "تفاصيل",
  "تفصيل",
  "دوره",
  "دورات",
  "برنامج",
  "متي",
  "متى",
  "كانت",
  "موعدها",
  "سعرها",
  "محتواها",
  "بها",
  "فيها",
  "التسجيل",
  "سجل",
  "سجلت",
  "هل",
  "كيف",
  "وين",
  "فييني",
  "فيني",
  "the",
  "a",
  "an",
  "of",
  "in",
  "about",
  "course",
  "details",
  "what",
  "when",
  "price",
  "can",
  "i",
  "register",
  "for",
  "please",
  "tell",
  "me",
]);

function normalizeToken(token: string): string {
  let value = token
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
  if (value.startsWith("ال") && value.length > 4) value = value.slice(2);
  return value;
}

function tokens(text: string): string[] {
  const repaired = text.replace(/البر\s+مجيات/gu, "البرمجيات");
  return [...new Set(repaired.split(/[^\p{L}\p{N}]+/u).map(normalizeToken))].filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  );
}

/** A course named in natural Arabic or English can differ from the catalogue word order. */
export function matchNamedCourse(rows: CatalogRow[], question: string): CatalogRow | null {
  const query = tokens(question);
  if (query.length === 0) return null;
  const ranked = rows
    .map((row) => {
      const title = new Set(tokens(`${row.title_ar ?? ""} ${row.title_en ?? ""}`));
      const hits = query.filter((word) => title.has(word)).length;
      return { row, hits, coverage: hits / query.length };
    })
    .sort((a, b) => b.coverage - a.coverage || b.hits - a.hits);
  const best = ranked[0];
  if (!best || best.hits < Math.min(2, query.length) || best.coverage < 0.65) return null;
  // If two titles fit equally well, avoid picking one without asking the visitor.
  const second = ranked[1];
  if (second && second.coverage === best.coverage && second.hits === best.hits) return null;
  return best.row;
}

export function messageLanguage(text: string, fallback: ChatLanguage): ChatLanguage {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[a-zA-Z]/.test(text)) return "en";
  return fallback;
}

export function asksForNamedCourse(text: string): boolean {
  return (
    /(?:^|\s)(?:دورة|دوره|course)(?:\s|$)/i.test(text) &&
    !/(?:الدورات|دورات|المتاحة|بتنصحني|مناسبة|recommend|available courses)/i.test(text) &&
    tokens(text).length > 0
  );
}

function ended(endDate: string | null | undefined, now: Date): boolean {
  const date = endDate?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return date < today;
}

export function courseRegistrationStatus(
  course: PublicCourse,
  now = new Date(),
): "ended" | "full" | "closed" | "open" | "unknown" {
  if (ended(course.end_date, now)) return "ended";
  if (
    course.max_students != null &&
    course.students_count != null &&
    course.students_count >= course.max_students
  )
    return "full";
  if (course.enrollment_deadline && new Date(course.enrollment_deadline) < now) return "closed";
  if (course.enrollment_open === false) return "closed";
  if (course.enrollment_open === true) return "open";
  return "unknown";
}

export function enrichCourseOption(
  option: CourseOption,
  row: CatalogRow,
  payload: PublicCoursePayload | null,
  lang: ChatLanguage,
): CourseOption {
  const detail = payload?.course;
  return {
    ...option,
    start_date: detail?.start_date ?? null,
    end_date: detail?.end_date ?? row.end_date ?? null,
    schedule_time_from: detail?.schedule_time_from ?? null,
    schedule_time_to: detail?.schedule_time_to ?? null,
    location:
      lang === "ar"
        ? (detail?.location_ar ?? detail?.location_en ?? null)
        : (detail?.location_en ?? detail?.location_ar ?? null),
    description:
      lang === "ar"
        ? (detail?.description_ar ?? detail?.description_en ?? null)
        : (detail?.description_en ?? detail?.description_ar ?? null),
    topics:
      payload?.sections
        ?.map((section) => section.title)
        .filter((title): title is string => !!title)
        .slice(0, 4) ?? [],
    registration_status: courseRegistrationStatus({
      ...detail,
      end_date: detail?.end_date ?? row.end_date ?? null,
    }),
    // A registration button does not establish that a seat has been confirmed.
    seats_confirmed: false,
  };
}

function displayDate(raw: string, lang: ChatLanguage): string {
  const value = new Date(`${raw.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) return raw;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function courseAnswer(row: CatalogRow, option: CourseOption, lang: ChatLanguage): string {
  const ar = lang === "ar";
  const lines: string[] = [ar ? `دورة «${option.title}»:` : `${option.title}:`];
  lines.push(
    ar
      ? `${option.price}، المستوى ${option.level ?? "غير محدد"}، ${option.delivery_mode === "onsite" ? "حضورية" : option.delivery_mode === "online" ? "أونلاين" : "نمطها غير محدد"}.`
      : `${option.price}; level: ${option.level ?? "not set"}; ${option.delivery_mode === "onsite" ? "in person" : option.delivery_mode === "online" ? "online" : "delivery mode not set"}.`,
  );
  if (option.start_date || option.end_date) {
    const from = option.start_date ? displayDate(option.start_date, lang) : "";
    const to = option.end_date ? displayDate(option.end_date, lang) : "";
    lines.push(
      `${ar ? "التاريخ" : "Dates"}: ${[from, to].filter(Boolean).join(ar ? " إلى " : " to ")}.`,
    );
  }
  if (option.schedule_time_from || option.schedule_time_to)
    lines.push(
      `${ar ? "الوقت" : "Time"}: ${[option.schedule_time_from, option.schedule_time_to].filter(Boolean).join("–")}.`,
    );
  if (option.location) lines.push(`${ar ? "المكان" : "Location"}: ${option.location}.`);
  if (option.topics.length)
    lines.push(`${ar ? "المحتوى" : "Topics"}: ${option.topics.join(ar ? "، " : ", ")}.`);
  else if (option.description)
    lines.push(
      `${ar ? "المحتوى" : "Content"}: ${option.description.slice(0, 320)}${option.description.length > 320 ? "…" : ""}`,
    );
  const status = option.registration_status;
  lines.push(
    ar
      ? status === "ended"
        ? "انتهت الدورة؛ التسجيل فيها غير متاح حالياً."
        : status === "full"
          ? "اكتمل العدد حسب بيانات الدورة."
          : status === "closed"
            ? "التسجيل مغلق حالياً."
            : status === "open"
              ? "يمكن تقديم طلب تسجيل؛ تأكيد المقعد يتم من الجمعية."
              : "حالة التسجيل غير متوفرة لدي؛ تحقّق من صفحة الدورة."
      : status === "ended"
        ? "The course has ended; registration is no longer available."
        : status === "full"
          ? "The course is full according to its current data."
          : status === "closed"
            ? "Registration is currently closed."
            : status === "open"
              ? "You can apply to register; the association confirms the place."
              : "Registration status is unavailable; check the course page.",
  );
  lines.push(`[${ar ? "تفاصيل الدورة" : "Course details"}](${courseUrl(row)})`);
  return lines.join("\n");
}
