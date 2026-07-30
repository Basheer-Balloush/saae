import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * One-time, admin-only remediation for LMS accounts that were created while
 * signup used `generateLink` and therefore remain unconfirmed.
 *
 * Safety model:
 *  - LMS admin / admin role required (verified server-side, per request).
 *  - Preview first (counts + identifiers), then confirm an explicit allowlist.
 *  - Uses the Auth Admin API only; never touches auth.users with SQL.
 *  - Idempotent: already-confirmed accounts are skipped.
 *  - Only `email_confirm` is set — no password, role, metadata or session change.
 */

async function assertLmsAdmin(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['lms_admin', 'admin'])
  if (error) throw new Error('Forbidden')
  if (!data || data.length === 0) throw new Error('Forbidden: admin role required')
}

const previewSchema = z.object({
  createdAfter: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).default(100),
})

export const previewUnconfirmedLmsAccounts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => previewSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const after = data.createdAfter ? Date.parse(data.createdAfter) : null
    const { data: page, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: data.limit })
    if (error) {
      console.error('listUsers failed during remediation preview', { message: error.message })
      throw new Error('REMEDIATION_PREVIEW_FAILED')
    }

    const candidates = (page?.users ?? [])
      .filter((u) => !u.email_confirmed_at)
      .filter((u) => (after ? Date.parse(u.created_at) >= after : true))
      .map((u) => ({ id: u.id, email: u.email ?? null, createdAt: u.created_at }))

    console.info('remediation preview', { candidateCount: candidates.length })
    return { count: candidates.length, candidates }
  })

const confirmSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email().max(255)).min(1).max(50),
})

export const confirmLmsAccounts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => confirmSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const allowlist = new Set(data.emails)
    const { data: page, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) {
      console.error('listUsers failed during remediation', { message: error.message })
      throw new Error('REMEDIATION_FAILED')
    }

    let confirmed = 0
    let alreadyConfirmed = 0
    let notFound = 0
    let failed = 0
    const seen = new Set<string>()

    for (const user of page?.users ?? []) {
      const email = user.email?.toLowerCase()
      if (!email || !allowlist.has(email)) continue
      seen.add(email)
      if (user.email_confirmed_at) {
        alreadyConfirmed += 1
        continue
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true })
      if (updateError) {
        failed += 1
        console.error('remediation update failed', { userId: user.id, message: updateError.message })
      } else {
        confirmed += 1
        console.info('remediation confirmed account', { userId: user.id })
      }
    }
    notFound = [...allowlist].filter((e) => !seen.has(e)).length

    return { requested: allowlist.size, confirmed, alreadyConfirmed, notFound, failed }
  })
