import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Admin action: deletes every lms_instructors row whose approved=false,
 * removes any prior trainer_applications for those users, and emails each
 * of them asking to re-submit the trainer-apply form. Their new
 * submissions appear in the admin trainer-applications dashboard as usual.
 */
export const cleanupUnapprovedInstructors = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context

    // authorize: admin or lms_admin only
    const [{ data: isAdmin }, { data: isLmsAdmin }] = await Promise.all([
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' as never }),
      supabase.rpc('has_role', { _user_id: userId, _role: 'lms_admin' as never }),
    ])
    if (!isAdmin && !isLmsAdmin) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendReinstructorEmail } = await import('./reinstructor-email.server')

    // 1) find unapproved instructors
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('lms_instructors')
      .select('user_id, full_name, full_name_ar, full_name_en')
      .eq('approved', false)
    if (rowsErr) throw rowsErr
    const list = rows ?? []
    if (list.length === 0) {
      return { total: 0, emailed: 0, deleted: 0, failed: [] as string[] }
    }

    const userIds = list.map((r) => r.user_id as string)

    // 2) resolve emails via auth admin listUsers (paginated)
    const emailByUserId = new Map<string, string>()
    let page = 1
    // stop after a reasonable number of pages
    while (page <= 20) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const users = data?.users ?? []
      for (const u of users) {
        if (u.email) emailByUserId.set(u.id, u.email)
      }
      if (users.length < 1000) break
      page++
    }

    // 3) send emails (best-effort)
    const failed: string[] = []
    let emailed = 0
    for (const r of list) {
      const uid = r.user_id as string
      const email = emailByUserId.get(uid)
      if (!email) {
        failed.push(uid)
        continue
      }
      const fullName =
        (r as { full_name_ar?: string | null }).full_name_ar ||
        (r as { full_name?: string | null }).full_name ||
        (r as { full_name_en?: string | null }).full_name_en ||
        ''
      try {
        await sendReinstructorEmail({ to: email, fullName: fullName as string })
        emailed++
      } catch (e) {
        console.error('reinstructor email failed', uid, e)
        failed.push(uid)
      }
    }

    // 4) delete any prior trainer_applications for these users, then the instructor rows
    await supabaseAdmin.from('trainer_applications').delete().in('user_id', userIds)
    const { error: delErr, count } = await supabaseAdmin
      .from('lms_instructors')
      .delete({ count: 'exact' })
      .eq('approved', false)
      .in('user_id', userIds)
    if (delErr) throw delErr

    return {
      total: list.length,
      emailed,
      deleted: count ?? 0,
      failed,
    }
  })

export const countUnapprovedInstructors = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isLmsAdmin }] = await Promise.all([
      context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' as never }),
      context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'lms_admin' as never }),
    ])
    if (!isAdmin && !isLmsAdmin) throw new Error('Forbidden')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { count, error } = await supabaseAdmin
      .from('lms_instructors')
      .select('user_id', { count: 'exact', head: true })
      .eq('approved', false)
    if (error) throw error
    return { count: count ?? 0 }
  })
