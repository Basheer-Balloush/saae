import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_FORM,
  formDefinitionSchema,
  type FormDefinition,
} from "@/features/lms/course-feedback/lib/survey";

/*
 * Course feedback forms on the server: which form a course asks, the default
 * form (written from DEFAULT_FORM the first time it is needed) and new
 * versions. Called with the service-role client, after the caller has been
 * checked. The tables are not in the generated Supabase types yet, hence the
 * untyped client.
 */

export type Db = SupabaseClient;

export async function serviceClient(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as never as Db;
}

export type FormRow = {
  id: string;
  course_id: string | null;
  enabled: boolean;
  custom: boolean;
  current_version: number | null;
  updated_at: string;
};

export type FormVersion = { formId: string; version: number; definition: FormDefinition };

/** The form a course asks right now; `enabled` false means it asks none. */
export type EffectiveForm = FormVersion & { enabled: boolean; custom: boolean };

const FORM_COLUMNS = "id, course_id, enabled, custom, current_version, updated_at";
const isDuplicate = (e: { code?: string } | null) => e?.code === "23505";

/** Only the LMS admin roles may manage forms and read responses. */
export async function assertLmsAdmin(db: Db, userId: string) {
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["lms_admin", "admin"]);
  if (error) throw new Error("Could not check your role");
  if (!data?.length) throw new Error("Forbidden: admin role required");
}

export async function loadVersion(db: Db, formId: string, version: number): Promise<FormVersion> {
  const { data, error } = await db
    .from("lms_feedback_form_versions")
    .select("definition")
    .eq("form_id", formId)
    .eq("version", version)
    .maybeSingle();
  if (error || !data) throw new Error("Could not load the feedback form");
  return { formId, version, definition: formDefinitionSchema.parse(data.definition) };
}

/** Writes `definition` as the form's next version and makes it current. */
export async function saveVersion(
  db: Db,
  form: Pick<FormRow, "id" | "current_version">,
  definition: FormDefinition,
  userId: string | null,
): Promise<number> {
  const version = (form.current_version ?? 0) + 1;
  const { error } = await db
    .from("lms_feedback_form_versions")
    .insert({ form_id: form.id, version, definition, created_by: userId });
  // Someone else saved this form a moment ago: their version stands.
  if (isDuplicate(error)) throw new Error("form_changed");
  if (error) throw new Error("Could not save the feedback form");
  const { error: moveError } = await db
    .from("lms_feedback_forms")
    .update({ current_version: version, updated_at: new Date().toISOString(), updated_by: userId })
    .eq("id", form.id);
  if (moveError) throw new Error("Could not save the feedback form");
  return version;
}

/** The default form, created from DEFAULT_FORM when it does not exist yet. */
export async function defaultForm(db: Db): Promise<FormRow & { current_version: number }> {
  const read = async () => {
    const { data, error } = await db
      .from("lms_feedback_forms")
      .select(FORM_COLUMNS)
      .is("course_id", null)
      .maybeSingle();
    if (error) throw new Error("Could not load the feedback form");
    return data as FormRow | null;
  };
  let row = await read();
  if (!row) {
    const { error } = await db.from("lms_feedback_forms").insert({ course_id: null });
    if (error && !isDuplicate(error)) throw new Error("Could not create the feedback form");
    row = await read();
    if (!row) throw new Error("Could not create the feedback form");
  }
  if (row.current_version === null) {
    try {
      await saveVersion(db, row, DEFAULT_FORM, null);
    } catch (e) {
      // Created at the same moment by another request.
      if (!(e instanceof Error && e.message === "form_changed")) throw e;
    }
    row = await read();
    if (!row || row.current_version === null) throw new Error("Could not create the feedback form");
  }
  return row as FormRow & { current_version: number };
}

export async function courseFormRow(db: Db, courseId: string): Promise<FormRow | null> {
  const { data, error } = await db
    .from("lms_feedback_forms")
    .select(FORM_COLUMNS)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error("Could not load the feedback form");
  return (data as FormRow | null) ?? null;
}

/** The course's row, created (feedback on, default questions) if missing. */
export async function ensureCourseFormRow(db: Db, courseId: string): Promise<FormRow> {
  const existing = await courseFormRow(db, courseId);
  if (existing) return existing;
  const { error } = await db.from("lms_feedback_forms").insert({ course_id: courseId });
  if (error && !isDuplicate(error)) throw new Error("Could not save the feedback settings");
  const row = await courseFormRow(db, courseId);
  if (!row) throw new Error("Could not save the feedback settings");
  return row;
}

export async function effectiveForm(db: Db, courseId: string): Promise<EffectiveForm> {
  const row = await courseFormRow(db, courseId);
  const enabled = row?.enabled ?? true;
  if (row?.custom && row.current_version !== null) {
    return { ...(await loadVersion(db, row.id, row.current_version)), enabled, custom: true };
  }
  const def = await defaultForm(db);
  return { ...(await loadVersion(db, def.id, def.current_version)), enabled, custom: false };
}
