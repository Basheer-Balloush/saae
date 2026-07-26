import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function assertLmsAdmin(supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown }> }, userId: string) {
  const [{ data: isAdmin }, { data: isLmsAdmin }] = await Promise.all([
    supabase.rpc('has_role' as never, { _user_id: userId, _role: 'admin' } as never),
    supabase.rpc('has_role' as never, { _user_id: userId, _role: 'lms_admin' } as never),
  ])
  if (!isAdmin && !isLmsAdmin) throw new Error('Forbidden')
}

/** Phase 2 — activate an approved trainer, then drain the outbox. */
export const activateTrainer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ application_id: z.string().uuid(), note: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('trainer_app_activate', {
      _application_id: data.application_id,
      _note: data.note ?? undefined,
    } as never)
    if (error) throw new Error(error.message)

    const { logAuditEvent } = await import('@/lib/audit-log.server')
    await logAuditEvent({
      event_type: 'instructor.activated',
      schema_version: 1,
      actor_id: context.userId,
      actor_role: 'lms_admin',
      target_type: 'trainer_application',
      target_id: data.application_id,
      next_state: 'approved',
      correlation_id: data.application_id,
      metadata: {},
    })

    const { processOutbox } = await import('@/lib/lms-outbox.server')
    const outbox = await processOutbox(10).catch(() => ({ picked: 0, done: 0, failed: 0 }))

    return { result: (result ?? null) as Record<string, unknown> | null, outbox }
  })

/** Phase 2 — manual outbox drain (also used for retrying failed notifications). */
export const runOutbox = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertLmsAdmin(context.supabase as never, context.userId)
    const { processOutbox } = await import('@/lib/lms-outbox.server')
    return processOutbox(50)
  })
