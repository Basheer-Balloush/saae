/**
 * Phase 2 (CF-02) — durable outbox worker.
 *
 * External side effects (email) never run inside a business transaction. The
 * command writes a job row; this worker retries it with backoff and records a
 * terminal failure after MAX_ATTEMPTS.
 */

const MAX_ATTEMPTS = 5

type Job = {
  id: string
  job_type: string
  payload: Record<string, unknown>
  attempts: number
  correlation_id: string | null
}

function backoffMinutes(attempts: number) {
  return Math.min(60, 2 ** attempts)
}

async function runJob(job: Job) {
  const payload = job.payload ?? {}
  switch (job.job_type) {
    case 'trainer_approved_email': {
      const { sendTrainerApprovedEmail } = await import('./trainer-approved-email.server')
      const to = String(payload.email ?? '')
      if (!to) throw new Error('missing_email')
      await sendTrainerApprovedEmail({ to, fullName: (payload.full_name as string) ?? null })
      return
    }
    case 'trainer_reapply_email': {
      const { sendReinstructorEmail } = await import('./reinstructor-email.server')
      const to = String(payload.email ?? '')
      if (!to) throw new Error('missing_email')
      await sendReinstructorEmail({ to, fullName: (payload.full_name as string) ?? '' })
      return
    }
    default:
      throw new Error(`unknown_job_type:${job.job_type}`)
  }
}

export async function processOutbox(limit = 25) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { logAuditEvent } = await import('./audit-log.server')

  const { data, error } = await supabaseAdmin
    .from('lms_outbox_jobs')
    .select('id, job_type, payload, attempts, correlation_id')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error

  const jobs = (data ?? []) as unknown as Job[]
  let done = 0
  let failed = 0

  for (const job of jobs) {
    try {
      await runJob(job)
      await supabaseAdmin
        .from('lms_outbox_jobs')
        .update({ status: 'done', attempts: job.attempts + 1, last_error: null })
        .eq('id', job.id)
      done++
    } catch (err) {
      const attempts = job.attempts + 1
      const terminal = attempts >= MAX_ATTEMPTS
      await supabaseAdmin
        .from('lms_outbox_jobs')
        .update({
          status: terminal ? 'failed' : 'pending',
          attempts,
          last_error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString(),
        })
        .eq('id', job.id)
      if (terminal) {
        failed++
        await logAuditEvent({
          event_type: 'instructor.provisioning_failed',
          schema_version: 1,
          actor_role: 'service',
          target_type: 'lms_outbox_job',
          target_id: job.id,
          reason: 'outbox_job_terminal_failure',
          correlation_id: job.correlation_id ?? undefined,
          metadata: { job_type: job.job_type },
        })
      }
    }
  }

  return { picked: jobs.length, done, failed }
}
