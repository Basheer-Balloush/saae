import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Phase 3 (A-08) — recoverable instructor cleanup.
 *
 * The old destructive "delete every unapproved instructor" action is gone.
 * Admins preview candidates, archive an explicitly selected list (90-day
 * retention, no cascade), can restore a batch, and may purge only after the
 * retention window expires. Re-apply emails go through the durable outbox.
 */

async function assertLmsAdmin(context: {
  supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown }> }
  userId: string
}) {
  const [{ data: isAdmin }, { data: isLmsAdmin }] = await Promise.all([
    context.supabase.rpc('has_role' as never, { _user_id: context.userId, _role: 'admin' } as never),
    context.supabase.rpc('has_role' as never, { _user_id: context.userId, _role: 'lms_admin' } as never),
  ])
  if (!isAdmin && !isLmsAdmin) throw new Error('Forbidden')
}

export type CleanupCandidate = {
  user_id: string
  full_name: string
  created_at: string
  course_count: number
  enrollment_count: number
  has_application: boolean
}

export const previewInstructorCleanup = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ candidates: CleanupCandidate[] }> => {
    const { data, error } = await context.supabase.rpc('lms_cleanup_preview' as never, {} as never)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as CleanupCandidate[]
    return {
      candidates: rows.map((r) => ({
        user_id: r.user_id,
        full_name: r.full_name ?? '',
        created_at: r.created_at,
        course_count: Number(r.course_count ?? 0),
        enrollment_count: Number(r.enrollment_count ?? 0),
        has_application: !!r.has_application,
      })),
    }
  })

export const archiveInstructors = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_ids: z.array(z.string().uuid()).min(1).max(500),
        note: z.string().max(2000).optional(),
        retention_days: z.number().int().min(1).max(365).default(90),
        notify: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('lms_cleanup_archive' as never, {
      _user_ids: data.user_ids,
      _note: data.note ?? undefined,
      _retention_days: data.retention_days,
    } as never)
    if (error) throw new Error(error.message)

    const parsed = (result ?? {}) as { batch_id?: string; archived?: number; purge_after?: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    let queued = 0
    if (data.notify) {
      // resolve emails and enqueue re-apply notifications (idempotent per batch+user)
      const emailByUser = new Map<string, string>()
      for (let page = 1; page <= 20; page++) {
        const { data: users, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
        if (uErr) break
        const list = users?.users ?? []
        for (const u of list) if (u.email) emailByUser.set(u.id, u.email)
        if (list.length < 1000) break
      }
      const jobs = data.user_ids
        .filter((uid) => emailByUser.has(uid))
        .map((uid) => ({
          job_type: 'trainer_reapply_email',
          payload: { user_id: uid, email: emailByUser.get(uid)! },
          dedupe_key: `trainer_reapply_email:${parsed.batch_id ?? 'batch'}:${uid}`,
          correlation_id: parsed.batch_id ?? null,
        }))
      if (jobs.length) {
        const { error: jErr } = await supabaseAdmin.from('lms_outbox_jobs').insert(jobs)
        if (!jErr) queued = jobs.length
      }
    }

    const { logAuditEvent } = await import('@/lib/audit-log.server')
    await logAuditEvent({
      event_type: 'cleanup.archived',
      schema_version: 1,
      actor_id: context.userId,
      actor_role: 'lms_admin',
      target_type: 'lms_cleanup_batch',
      target_id: parsed.batch_id ?? null,
      correlation_id: parsed.batch_id ?? undefined,
      reason: data.note ?? null,
      metadata: { archived: parsed.archived ?? 0, retention_days: data.retention_days },
    })

    let sent = 0
    if (queued > 0) {
      const { processOutbox } = await import('@/lib/lms-outbox.server')
      const res = await processOutbox(100).catch(() => ({ done: 0 }))
      sent = res.done ?? 0
    }

    return {
      batch_id: parsed.batch_id ?? null,
      archived: parsed.archived ?? 0,
      purge_after: parsed.purge_after ?? null,
      queued,
      sent,
    }
  })

export const restoreCleanupBatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ batch_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('lms_cleanup_restore' as never, {
      _batch_id: data.batch_id,
    } as never)
    if (error) throw new Error(error.message)
    const parsed = (result ?? {}) as { restored?: number }

    const { logAuditEvent } = await import('@/lib/audit-log.server')
    await logAuditEvent({
      event_type: 'cleanup.restored',
      schema_version: 1,
      actor_id: context.userId,
      actor_role: 'lms_admin',
      target_type: 'lms_cleanup_batch',
      target_id: data.batch_id,
      correlation_id: data.batch_id,
      metadata: { restored: parsed.restored ?? 0 },
    })
    return { restored: parsed.restored ?? 0 }
  })

export const purgeCleanupBatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ batch_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('lms_cleanup_purge' as never, {
      _batch_id: data.batch_id,
    } as never)
    if (error) throw new Error(error.message)
    const parsed = (result ?? {}) as { purged?: number }

    const { logAuditEvent } = await import('@/lib/audit-log.server')
    await logAuditEvent({
      event_type: 'cleanup.purged',
      schema_version: 1,
      actor_id: context.userId,
      actor_role: 'lms_admin',
      target_type: 'lms_cleanup_batch',
      target_id: data.batch_id,
      correlation_id: data.batch_id,
      metadata: { purged: parsed.purged ?? 0 },
    })
    return { purged: parsed.purged ?? 0 }
  })

export type CleanupBatch = {
  id: string
  created_at: string
  note: string | null
  retention_days: number
  archived_count: number
  restored_count: number
  purged_count: number
  purged_at: string | null
}

export const listCleanupBatches = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ batches: CleanupBatch[] }> => {
    await assertLmsAdmin(context as never)
    const { data, error } = await context.supabase
      .from('lms_cleanup_batches')
      .select('id, created_at, note, retention_days, archived_count, restored_count, purged_count, purged_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return { batches: (data ?? []) as CleanupBatch[] }
  })
