import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  AGE_RANGES,
  CONTACT_METHODS,
  DEVICES,
  FREQUENCIES,
  GOVERNORATES,
  QUESTION_BY_KEY,
  SECTIONS,
  SERVICES,
  SURVEY_VERSION,
  USER_TYPES,
  isSectionVisible,
} from "./feedback-survey";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 20;

const vals = (l: { value: string }[]) => l.map((x) => x.value) as [string, ...string[]];
const clean = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((s) =>
      s
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, max),
    )
    .optional()
    .nullable();
const opt = (l: { value: string }[]) => z.enum(vals(l)).optional().nullable();

async function rateLimit(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const headers = getRequest()?.headers ?? new Headers();
  const ip =
    headers.get("cf-connecting-ip") ||
    (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`feedback:${ip}`));
  const ipHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();
  const { data } = await supabaseAdmin
    .from("feedback_survey_rate_limits")
    .select("hits")
    .eq("ip_hash", ipHash)
    .eq("window_start", windowStart)
    .maybeSingle();
  const hits = (data?.hits ?? 0) + 1;
  await supabaseAdmin
    .from("feedback_survey_rate_limits")
    .upsert({ ip_hash: ipHash, window_start: windowStart, hits });
  return hits <= MAX_HITS;
}

/** Create an unfinished response when a visitor starts, so completed vs abandoned can be measured. */
export const startFeedbackSurvey = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ lang: z.enum(["ar", "en"]), website: z.string().max(200).optional() }).parse(i),
  )
  .handler(async ({ data }) => {
    if (data.website) return { id: null as string | null };
    if (!(await rateLimit())) return { id: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("feedback_survey_submissions")
      .insert({ lang: data.lang, survey_version: SURVEY_VERSION, completed: false })
      .select("id")
      .single();
    if (error) return { id: null as string | null };
    return { id: row.id as string | null };
  });

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const getFeedbackUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        submissionId: z.string().uuid(),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        size: z
          .number()
          .int()
          .positive()
          .max(5 * 1024 * 1024),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("feedback_survey_submissions")
      .select("id, completed")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub || sub.completed) throw new Error("invalid_submission");
    const path = `${data.submissionId}/${crypto.randomUUID()}.${EXT[data.contentType]}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("feedback-screenshots")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error("upload_unavailable");
    return { path, token: signed.token };
  });

const SubmitSchema = z.object({
  submissionId: z.string().uuid().nullable(),
  website: z.string().max(200).optional(), // honeypot
  lang: z.enum(["ar", "en"]),
  user_type: opt(USER_TYPES),
  age_range: opt(AGE_RANGES),
  governorate: opt(GOVERNORATES),
  usage_frequency: opt(FREQUENCIES),
  device_type: opt(DEVICES),
  services_used: z.array(z.enum(vals(SERVICES))).max(SERVICES.length),
  answers: z.record(z.string().max(40), z.union([z.number().int().min(1).max(5), z.literal("na")])),
  consent: z.literal(true),
  wants_contact: z.boolean(),
  contact_name: clean(120),
  contact_email: clean(200),
  contact_phone: clean(40),
  preferred_contact_method: opt(CONTACT_METHODS),
  positive_notes: clean(3000),
  improvement_notes: clean(3000),
  problem_notes: clean(3000),
  requested_feature: clean(3000),
  general_notes: clean(3000),
  screenshot_path: z
    .string()
    .max(200)
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/)
    .nullable()
    .optional(),
});

export const submitFeedbackSurvey = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SubmitSchema.parse(i))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // silently drop bots
    if (!(await rateLimit())) return { ok: false, error: "rate_limited" as const };

    // Required: every visible non-N/A section must be fully answered.
    const services = data.services_used;
    const rows: {
      section_key: string;
      question_key: string;
      rating: number | null;
      not_applicable: boolean;
    }[] = [];
    for (const section of SECTIONS) {
      if (!isSectionVisible(section, services)) continue;
      for (const qq of section.questions) {
        const v = data.answers[qq.key];
        if (v === undefined) {
          if (!section.allowNA) return { ok: false, error: "missing_required" as const };
          continue;
        }
        if (v === "na" && !section.allowNA)
          return { ok: false, error: "missing_required" as const };
        rows.push({
          section_key: section.key,
          question_key: qq.key,
          rating: v === "na" ? null : v,
          not_applicable: v === "na",
        });
      }
    }
    for (const key of Object.keys(data.answers)) {
      if (!QUESTION_BY_KEY.has(key)) return { ok: false, error: "invalid" as const };
    }
    if (data.wants_contact && !data.contact_email && !data.contact_phone) {
      return { ok: false, error: "contact_required" as const };
    }
    if (data.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.contact_email)) {
      return { ok: false, error: "invalid_email" as const };
    }

    const num = (k: string) => {
      const v = data.answers[k];
      return typeof v === "number" ? v : null;
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const record = {
      survey_version: SURVEY_VERSION,
      lang: data.lang,
      completed: true,
      submitted_at: new Date().toISOString(),
      user_type: data.user_type ?? null,
      age_range: data.age_range ?? null,
      governorate: data.governorate ?? null,
      usage_frequency: data.usage_frequency ?? null,
      device_type: data.device_type ?? null,
      services_used: services,
      overall_rating: num("o_satisfaction"),
      recommendation_rating: num("o_recommend"),
      consent: true,
      wants_contact: data.wants_contact,
      contact_name: data.wants_contact ? data.contact_name || null : null,
      contact_email: data.wants_contact ? data.contact_email || null : null,
      contact_phone: data.wants_contact ? data.contact_phone || null : null,
      preferred_contact_method: data.wants_contact ? (data.preferred_contact_method ?? null) : null,
      positive_notes: data.positive_notes || null,
      improvement_notes: data.improvement_notes || null,
      problem_notes: data.problem_notes || null,
      requested_feature: data.requested_feature || null,
      general_notes: data.general_notes || null,
      screenshot_path:
        data.screenshot_path &&
        data.submissionId &&
        data.screenshot_path.startsWith(data.submissionId)
          ? data.screenshot_path
          : null,
      updated_at: new Date().toISOString(),
    };

    let id = data.submissionId;
    if (id) {
      const { data: existing } = await supabaseAdmin
        .from("feedback_survey_submissions")
        .select("id, completed")
        .eq("id", id)
        .maybeSingle();
      if (!existing || existing.completed) id = null;
    }
    if (id) {
      const { error } = await supabaseAdmin
        .from("feedback_survey_submissions")
        .update(record)
        .eq("id", id);
      if (error) return { ok: false, error: "save_failed" as const };
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("feedback_survey_submissions")
        .insert({ ...record, screenshot_path: null })
        .select("id")
        .single();
      if (error) return { ok: false, error: "save_failed" as const };
      id = ins.id;
    }
    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("feedback_survey_answers")
        .insert(rows.map((r) => ({ ...r, submission_id: id! })));
      if (error) {
        await supabaseAdmin
          .from("feedback_survey_submissions")
          .update({ completed: false })
          .eq("id", id!);
        return { ok: false, error: "save_failed" as const };
      }
    }
    return { ok: true };
  });
