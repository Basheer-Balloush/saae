import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 5C — admin-only reconciliation of missing certificates.
 * The SQL RPC checks `is_lms_admin(auth.uid())` before running.
 */
export const reconcileCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(2000).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "lms_reconcile_certificates" as never,
      { _limit: data.limit ?? 500 } as never,
    );
    if (error) throw new Error(error.message);
    return (res ?? { scanned: 0, issued: 0 }) as { scanned: number; issued: number };
  });
