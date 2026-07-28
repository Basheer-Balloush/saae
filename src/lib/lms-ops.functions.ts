import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 11 — Admin-only reconciliation & ops health.
 * All RPCs enforce `is_lms_admin(auth.uid())` server-side.
 */

const limitSchema = z.object({ limit: z.number().int().min(1).max(500).optional() });

export type OrphanUploadsReport = {
  orphan_profile_files: number;
  sample: Array<{ id: string; bucket: string; path: string; kind: string; created_at: string }>;
  checked_at: string;
};

export const reconcileOrphanUploads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => limitSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "lms_reconcile_orphan_uploads" as never,
      { _limit: data.limit ?? 200 } as never,
    );
    if (error) throw new Error(error.message);
    return res as unknown as OrphanUploadsReport;
  });

export type PartialProvisioningReport = {
  missing_enrollments: number;
  sample: Array<{
    registrant_id: string;
    email: string | null;
    full_name: string;
    course_id: string;
    lms_course_id: string;
    created_at: string;
  }>;
  checked_at: string;
};

export const reconcilePartialProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => limitSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "lms_reconcile_partial_provisioning" as never,
      { _limit: data.limit ?? 200 } as never,
    );
    if (error) throw new Error(error.message);
    return res as unknown as PartialProvisioningReport;
  });

export type OpsHealthSummary = {
  outbox: {
    pending: number;
    stuck: number;
    failed: number;
    by_type: Record<string, number>;
    recent_failed: Array<{
      id: string;
      job_type: string;
      attempts: number;
      last_error: string | null;
      updated_at: string;
    }>;
  };
  auth_rate_flags_24h: Record<string, number>;
  checked_at: string;
};

export const getOpsHealthSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "lms_ops_health_summary" as never,
    );
    if (error) throw new Error(error.message);
    return res as unknown as OpsHealthSummary;
  });
