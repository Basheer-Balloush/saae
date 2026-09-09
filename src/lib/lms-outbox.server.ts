import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAuditEvent } from "./audit-log.server";
import { assertEmailRecipientAllowed } from "./email-delivery.server";
import { isBackgroundRecipientAllowed } from "./queued-email.server";
/**
 * Phase 2 (CF-02) — durable outbox worker.
 *
 * External side effects (email) never run inside a business transaction. The
 * command writes a job row; this worker retries it with backoff and records a
 * terminal failure after MAX_ATTEMPTS.
 */

const MAX_ATTEMPTS = 5;

type Job = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  correlation_id: string | null;
  next_attempt_at: string;
};

function backoffMinutes(attempts: number) {
  return Math.min(60, 2 ** attempts);
}

async function runJob(job: Job) {
  const payload = job.payload ?? {};
  switch (job.job_type) {
    case "trainer_approved_email": {
      const { sendTrainerApprovedEmail } = await import("./trainer-approved-email.server");
      const to = String(payload.email ?? "");
      if (!to) throw new Error("missing_email");
      await sendTrainerApprovedEmail({
        idempotencyKey: `outbox-${job.id}`,
        to,
        fullName: (payload.full_name as string) ?? null,
      });
      return;
    }
    case "trainer_reapply_email": {
      const { sendReinstructorEmail } = await import("./reinstructor-email.server");
      const to = String(payload.email ?? "");
      if (!to) throw new Error("missing_email");
      await sendReinstructorEmail({
        idempotencyKey: `outbox-${job.id}`,
        to,
        fullName: (payload.full_name as string) ?? "",
      });
      return;
    }
    default:
      throw new Error(`unknown_job_type:${job.job_type}`);
  }
}

export async function processOutbox(limit = 10) {
  if (process.env.ENABLE_TRAINER_OUTBOX !== "true")
    return { picked: 0, done: 0, failed: 0, retried: 0 };
  if (
    !["test", "live"].includes(process.env.EMAIL_DELIVERY_MODE ?? "") ||
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM
  )
    throw new Error("Background email configuration is incomplete");
  limit = Math.max(1, Math.min(10, limit));

  const { data, error } = await supabaseAdmin
    .from("lms_outbox_jobs")
    .select("id, job_type, payload, attempts, correlation_id, next_attempt_at")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const jobs = (data ?? []) as unknown as Job[];
  let done = 0;
  let failed = 0;
  let retried = 0;

  for (const job of jobs) {
    if (!isBackgroundRecipientAllowed(job.payload?.email)) continue;
    try {
      assertEmailRecipientAllowed(String(job.payload?.email ?? ""));
    } catch {
      continue;
    }
    const leaseUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("lms_outbox_jobs")
      .update({ next_attempt_at: leaseUntil })
      .eq("id", job.id)
      .eq("status", "pending")
      .eq("attempts", job.attempts)
      .eq("next_attempt_at", job.next_attempt_at)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    try {
      await runJob(job);
      const { data: completed, error: completionError } = await supabaseAdmin
        .from("lms_outbox_jobs")
        .update({ status: "done", attempts: job.attempts + 1, last_error: null })
        .eq("id", job.id)
        .eq("next_attempt_at", leaseUntil)
        .select("id")
        .maybeSingle();
      if (completionError) throw completionError;
      if (!completed) continue;
      done++;
    } catch (err) {
      const attempts = job.attempts + 1;
      const terminal = attempts >= MAX_ATTEMPTS;
      const { data: updatedJob, error: retryError } = await supabaseAdmin
        .from("lms_outbox_jobs")
        .update({
          status: terminal ? "failed" : "pending",
          attempts,
          last_error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString(),
        })
        .eq("id", job.id)
        .eq("next_attempt_at", leaseUntil)
        .select("id")
        .maybeSingle();
      if (retryError) throw retryError;
      if (!updatedJob) continue;
      // Count retries separately from terminal failures for cron monitoring.
      if (terminal) {
        failed++;
        await logAuditEvent({
          event_type: "instructor.provisioning_failed",
          schema_version: 1,
          actor_role: "service",
          target_type: "lms_outbox_job",
          target_id: job.id,
          reason: "outbox_job_terminal_failure",
          correlation_id: job.correlation_id ?? undefined,
          metadata: { job_type: job.job_type },
        });
      }
      if (!terminal) retried++;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return { picked: jobs.length, done, failed, retried };
}
