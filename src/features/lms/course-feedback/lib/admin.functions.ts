import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  formDefinitionSchema,
  formProblems,
  type FormDefinition,
} from "@/features/lms/course-feedback/lib/survey";
import { versionKey, type ReportResponse, type VersionMap } from "@/features/lms/course-feedback/lib/report";
import type { Db } from "@/features/lms/course-feedback/lib/feedback.server";

/*
 * Course feedback for LMS admins: the default form, a course's settings and
 * own form, and the responses. Every function checks the admin role first;
 * instructors get nothing from here. Answers are never logged.
 */

const server = () => import("@/features/lms/course-feedback/lib/feedback.server");

async function adminDb(userId: string): Promise<Db> {
  const { serviceClient, assertLmsAdmin } = await server();
  const db = await serviceClient();
  await assertLmsAdmin(db, userId);
  return db;
}

export type AdminForm = {
  formId: string;
  version: number;
  definition: FormDefinition;
  updatedAt: string;
};

/** The default form every online course asks unless it has its own. */
export const getDefaultFeedbackForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminForm> => {
    const { defaultForm, loadVersion } = await server();
    const db = await adminDb(context.userId);
    const row = await defaultForm(db);
    const v = await loadVersion(db, row.id, row.current_version);
    return { ...v, updatedAt: row.updated_at };
  });

const saveInput = z.object({
  /** null: the default form. */
  courseId: z.string().uuid().nullable(),
  /** The version the editor started from; a newer one means someone else saved. */
  baseVersion: z.number().int().positive(),
  definition: formDefinitionSchema,
});

/** Saves an edited form as its next version. Answers already sent keep the
    version they answered. */
export const saveFeedbackForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { defaultForm, courseFormRow, saveVersion } = await server();
    const db = await adminDb(context.userId);
    if (formProblems(data.definition).length) throw new Error("invalid_form");
    const row = data.courseId ? await courseFormRow(db, data.courseId) : await defaultForm(db);
    if (!row || (data.courseId && !row.custom)) throw new Error("not_custom");
    if (row.current_version !== data.baseVersion) throw new Error("form_changed");
    const version = await saveVersion(db, row, data.definition, context.userId);
    return { version };
  });

export type CourseFeedbackAdmin = {
  /** Whether the course asks for feedback before its certificate. */
  enabled: boolean;
  /** Whether it asks its own questions instead of the default form's. */
  custom: boolean;
  /** The form learners get now. */
  form: AdminForm;
  responses: ReportResponse[];
  versions: VersionMap;
  /** Learners who started the form but have not sent it. */
  drafts: number;
  names: Record<string, string | null>;
};

type ResponseRow = {
  id: string;
  student_id: string;
  form_id: string;
  form_version: number;
  lang: "ar" | "en";
  submitted_at: string;
  answers: Record<string, string>;
  notes: Record<string, string>;
};

async function learnerNames(db: Db, ids: string[]) {
  const names: Record<string, string | null> = {};
  if (!ids.length) return names;
  const { data } = await db
    .from("lms_user_profiles")
    .select("user_id, full_name")
    .in("user_id", ids);
  for (const p of (data ?? []) as { user_id: string; full_name: string | null }[])
    names[p.user_id] = p.full_name?.trim() || null;
  // No profile name: fall back to the name given at sign-up.
  const missing = ids.filter((id) => !names[id]).slice(0, 100);
  await Promise.all(
    missing.map(async (id) => {
      const { data: u } = await db.auth.admin.getUserById(id);
      const meta = (u?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      names[id] = meta.full_name?.trim() || meta.name?.trim() || null;
    }),
  );
  return names;
}

/** A course's feedback settings, its current form and every response sent. */
export const getCourseFeedbackAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CourseFeedbackAdmin> => {
    const { courseFormRow, defaultForm, effectiveForm, loadVersion } = await server();
    const db = await adminDb(context.userId);
    const row = await courseFormRow(db, data.courseId);
    const current = await effectiveForm(db, data.courseId);
    const updatedAt = current.custom ? (row?.updated_at ?? "") : (await defaultForm(db)).updated_at;

    const { data: rows, error } = await db
      .from("lms_course_feedback")
      .select("id, student_id, form_id, form_version, lang, submitted_at, answers, notes")
      .eq("course_id", data.courseId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error("Could not load the responses");
    const { count: drafts } = await db
      .from("lms_course_feedback")
      .select("id", { count: "exact", head: true })
      .eq("course_id", data.courseId)
      .eq("status", "draft");

    const responses: ReportResponse[] = ((rows ?? []) as ResponseRow[]).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      formId: r.form_id,
      formVersion: r.form_version,
      lang: r.lang,
      submittedAt: r.submitted_at,
      answers: r.answers ?? {},
      notes: r.notes ?? {},
    }));
    const versions: VersionMap = {
      [versionKey(current.formId, current.version)]: current.definition,
    };
    for (const r of responses) {
      const key = versionKey(r.formId, r.formVersion);
      if (!versions[key])
        versions[key] = (await loadVersion(db, r.formId, r.formVersion)).definition;
    }

    return {
      enabled: current.enabled,
      custom: current.custom,
      form: {
        formId: current.formId,
        version: current.version,
        definition: current.definition,
        updatedAt,
      },
      responses,
      versions,
      drafts: drafts ?? 0,
      names: await learnerNames(db, [...new Set(responses.map((r) => r.studentId))]),
    };
  });

const settingsInput = z
  .object({
    courseId: z.string().uuid(),
    enabled: z.boolean().optional(),
    custom: z.boolean().optional(),
  })
  .refine((d) => d.enabled !== undefined || d.custom !== undefined);

/** Switches a course's feedback on or off, or between the default form and
    its own. Its own form starts as a copy of the default; switching back to
    the default keeps it, and it returns if the course switches again. */
export const setCourseFeedbackSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { defaultForm, ensureCourseFormRow, loadVersion, saveVersion } = await server();
    const db = await adminDb(context.userId);
    const { data: course } = await db
      .from("lms_courses")
      .select("id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) throw new Error("Course not found");
    const row = await ensureCourseFormRow(db, data.courseId);
    if (data.custom && row.current_version === null) {
      const def = await defaultForm(db);
      const copy = await loadVersion(db, def.id, def.current_version);
      try {
        await saveVersion(db, row, copy.definition, context.userId);
      } catch (e) {
        // Another admin made the copy a moment ago.
        if (!(e instanceof Error && e.message === "form_changed")) throw e;
      }
    }
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.custom !== undefined) patch.custom = data.custom;
    const { error } = await db.from("lms_feedback_forms").update(patch).eq("id", row.id);
    if (error) throw new Error("Could not save the feedback settings");
    return { ok: true as const };
  });
