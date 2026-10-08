import { z } from "zod";

export const EVENT_TIMEZONE = "Asia/Damascus";
export const TEXPO_EVENT_ID = "d27946d7-08c5-4abd-92d1-57372d6ed26a";
export const EVENT_TOOLS = ["registration", "survey", "attendance", "game"] as const;
export type EventTool = (typeof EVENT_TOOLS)[number];
export const TOOL_NAMES = {
  registration: { ar: "التسجيل والاستقطاب", en: "Registration & leads" },
  survey: { ar: "الاستبيانات", en: "Surveys" },
  attendance: { ar: "الحضور", en: "Attendance" },
  game: { ar: "اللعبة", en: "Game" },
};
export const BADGE_RULES = {
  manual: { ar: "أعضاء يختارهم المسؤول", en: "Members chosen by an admin" },
  registration: { ar: "المسجلون في الفعالية", en: "Event registrants" },
  attendance: { ar: "من تم تأكيد حضورهم", en: "Confirmed attendees" },
  activity: {
    ar: "من أكملوا اللعبة واستلموا المكافأة",
    en: "Players who completed and claimed a reward",
  },
};

export const eventDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid date");
const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  .or(z.literal(""));
const assetSchema = z
  .string()
  .regex(/^(?:[a-f0-9-]{36}\.(?:png|jpg|webp)|\/badges\/texpo-2026\.webp)$/)
  .or(z.literal(""));
const sessionSchema = z.object({
  title_ar: z.string().trim().min(2).max(160),
  title_en: z.string().trim().min(2).max(160),
  start: timeSchema,
  end: timeSchema,
  speaker: z.string().trim().max(160),
  location: z.string().trim().max(200),
  description_ar: z.string().trim().max(2000),
  description_en: z.string().trim().max(2000),
});
const daySchema = z.object({
  date: eventDateSchema,
  start: timeSchema,
  end: timeSchema,
  sessions: z.array(sessionSchema).max(50),
});
export const eventInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title_ar: z.string().trim().min(2).max(160),
    title_en: z.string().trim().min(2).max(160),
    description_ar: z.string().trim().max(10000),
    description_en: z.string().trim().max(10000),
    location: z.string().trim().max(300),
    image: assetSchema,
    status: z.enum(["draft", "published", "archived"]),
    tools: z.array(z.enum(EVENT_TOOLS)).max(4),
    schedule: z.array(daySchema).min(1).max(60),
    badge: z
      .object({
        image: assetSchema.refine(Boolean, "Upload a badge image"),
        name_ar: z.string().trim().min(2).max(160),
        name_en: z.string().trim().min(2).max(160),
        description_ar: z.string().trim().max(1000),
        description_en: z.string().trim().max(1000),
        rule: z.enum(["manual", "registration", "attendance", "activity"]),
      })
      .nullable(),
  })
  .superRefine((event, ctx) => {
    if (new Set(event.tools).size !== event.tools.length)
      ctx.addIssue({ code: "custom", path: ["tools"], message: "Duplicate tool" });
    const dates = new Set<string>();
    event.schedule.forEach((day, index) => {
      const issue = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["schedule", index], message });
      if (dates.has(day.date)) issue("Each date must appear once");
      dates.add(day.date);
      if (!!day.start !== !!day.end || (day.start && day.end <= day.start))
        issue("Closing time must follow opening time");
      for (const session of day.sessions) {
        if (!session.start || !session.end || session.end <= session.start)
          issue("Each activity needs valid start and end times");
        if (day.start && (session.start < day.start || session.end > day.end))
          issue("Activities must fit inside the day's hours");
      }
    });
    const ruleTool = {
      registration: "registration",
      attendance: "attendance",
      activity: "game",
      manual: null,
    } as const;
    if (
      event.badge &&
      ruleTool[event.badge.rule] &&
      !event.tools.includes(ruleTool[event.badge.rule]!)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["badge", "rule"],
        message: "Enable the tool used to earn this badge",
      });
    }
  });
export type EventInput = z.infer<typeof eventInputSchema>;
export type EventDay = EventInput["schedule"][number];
export const eventSchema = z
  .object({ id: z.string().uuid(), created_at: z.string(), updated_at: z.string() })
  .and(eventInputSchema);
export type EventRecord = z.infer<typeof eventSchema>;
export function orderedDays(schedule: EventDay[]) {
  return [...schedule].sort((a, b) => a.date.localeCompare(b.date));
}
export function damascusDate(iso: string | Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function eventPhase(
  event: Pick<EventRecord, "status" | "schedule">,
  today = damascusDate(),
) {
  if (event.status !== "published") return event.status;
  const days = orderedDays(event.schedule);
  if (today < days[0].date) return "upcoming";
  if (today > days[days.length - 1].date) return "past";
  return "ongoing";
}
export function formatEventDate(date: string, lang: "ar" | "en") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-SY" : "en-GB", {
    timeZone: EVENT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function formatEventTimestamp(
  iso: string | null | undefined,
  lang: "ar" | "en",
  withTime = false,
) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(lang === "ar" ? "ar-SY" : "en-GB", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
export function eventImageUrl(key: string) {
  if (!key) return "";
  if (key.startsWith("/badges/")) return key;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/event-assets/${key}`;
}
export function newEvent(): EventInput {
  return {
    slug: "",
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
    location: "",
    image: "",
    status: "draft",
    tools: [],
    schedule: [{ date: damascusDate(), start: "", end: "", sessions: [] }],
    badge: null,
  };
}
