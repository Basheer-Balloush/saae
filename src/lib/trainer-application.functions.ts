import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 1 (A-06) — protected commands for the trainer application lifecycle.
 *
 * Applicants no longer write `trainer_applications` / `trainer_application_files`
 * directly. Every mutation goes through a narrow SECURITY DEFINER RPC that
 * validates ownership, lifecycle state, and an explicit field allowlist.
 */

const SubmitSchema = z.object({
  full_name_ar: z.string().trim().min(2).max(200),
  full_name_en: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(5).max(40),
  date_of_birth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().trim().min(2).max(120),
  experience_level: z.enum(["lt_1", "1_2", "3_5", "5_plus"]),
  specializations: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  bio: z.string().trim().min(10).max(20000),
  linkedin_url: z.string().trim().url().max(500),
  github_url: z.string().trim().max(500).optional().nullable(),
  has_prev_training: z.boolean(),
  prev_training_details: z.string().trim().max(5000).optional().nullable(),
  consent_ethics: z.literal(true),
  consent_data: z.literal(true),
  consent_process: z.literal(true),
});

const AttachSchema = z.object({
  application_id: z.string().uuid(),
  kind: z.enum(["cv", "work_sample", "avatar"]),
  storage_path: z.string().trim().min(3).max(500),
  original_name: z.string().trim().min(1).max(200),
  content_type: z.string().trim().max(200).nullable().optional(),
  size_bytes: z.number().int().positive().max(52_428_800),
});

export const submitTrainerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: applicationId, error } = await context.supabase.rpc(
      "submit_trainer_application",
      { payload: data as unknown as Record<string, never> },
    );
    if (error) throw new Error(error.message);

    const { logAuditEvent } = await import("@/lib/audit-log.server");
    await logAuditEvent({
      event_type: "trainer_application.submitted",
      schema_version: 1,
      actor_id: context.userId,
      actor_role: "applicant",
      target_type: "trainer_application",
      target_id: applicationId as string,
      next_state: "pending_review",
      metadata: {},
    });

    return { application_id: applicationId as string };
  });

export const attachTrainerApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AttachSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: fileId, error } = await context.supabase.rpc(
      "attach_trainer_application_file",
      {
        p_application_id: data.application_id,
        p_kind: data.kind,
        p_storage_path: data.storage_path,
        p_original_name: data.original_name,
        p_content_type: data.content_type ?? null,
        p_size_bytes: data.size_bytes,
      },
    );
    if (error) throw new Error(error.message);

    const { logAuditEvent } = await import("@/lib/audit-log.server");
    await logAuditEvent({
      event_type: "trainer_application.evidence_attached",
      schema_version: 1,
      actor_id: context.userId,
      actor_role: "applicant",
      target_type: "trainer_application_file",
      target_id: fileId as string,
      metadata: { application_id: data.application_id, kind: data.kind },
    });

    return { file_id: fileId as string };
  });

export const removeTrainerApplicationFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ file_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: storagePath, error } = await context.supabase.rpc(
      "remove_trainer_application_file",
      { p_file_id: data.file_id },
    );
    if (error) throw new Error(error.message);

    const { logAuditEvent } = await import("@/lib/audit-log.server");
    await logAuditEvent({
      event_type: "trainer_application.evidence_removed",
      schema_version: 1,
      actor_id: context.userId,
      actor_role: "applicant",
      target_type: "trainer_application_file",
      target_id: data.file_id,
      metadata: { storage_path: storagePath ?? null },
    });

    return { ok: true };
  });
