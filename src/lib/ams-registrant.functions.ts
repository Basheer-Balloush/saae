import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const schema = z.object({
  amsCourseId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  paymentStatus: z.enum(['paid', 'unpaid', 'partial', 'waived']).default('unpaid'),
  lang: z.enum(['ar', 'en']).default('ar'),
})

export const addAmsRegistrantWithLms = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const email = data.email.toLowerCase()

    // Verify caller can access this AMS course
    const { data: canAccess, error: accessErr } = await context.supabase.rpc('can_access_ams_course', {
      _course_id: data.amsCourseId,
    })
    if (accessErr) throw new Error(accessErr.message)
    if (!canAccess) throw new Error('forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    // Find or create the auth user
    let userId: string | null = null
    let isNewUser = false
    let tempPassword: string | null = null

    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listErr) throw new Error(listErr.message)
    const match = listData.users.find((u) => u.email?.toLowerCase() === email)

    if (match) {
      userId = match.id
    } else {
      // Generate a strong random password
      const bytes = new Uint8Array(18)
      crypto.getRandomValues(bytes)
      tempPassword = btoa(String.fromCharCode(...bytes))
        .replace(/[+/=]/g, '')
        .slice(0, 16) + 'Aa1!'
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, lang: data.lang },
      })
      if (createErr || !created.user) throw new Error(createErr?.message || 'user_create_failed')
      userId = created.user.id
      isNewUser = true

      // Assign LMS student role
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: 'lms_student' }, { onConflict: 'user_id,role', ignoreDuplicates: true })
    }

    if (!userId) throw new Error('user_id_missing')

    // Enroll + create/refresh registrant via RPC
    const { data: registrantId, error: attachErr } = await context.supabase.rpc('ams_attach_user_to_linked_course', {
      _ams_course_id: data.amsCourseId,
      _user_id: userId,
      _full_name: data.fullName,
      _email: email,
      _phone: data.phone ?? '',
      _payment_status: data.paymentStatus,
    })
    if (attachErr) throw new Error(attachErr.message)

    // Email credentials for new users
    if (isNewUser && tempPassword) {
      try {
        const { sendAmsAccountCreatedEmail } = await import('./ams-account-email.server')
        // Fetch course name
        const { data: courseRow } = await context.supabase
          .from('ams_courses')
          .select('name_ar, name_en')
          .eq('id', data.amsCourseId)
          .maybeSingle()
        const courseName = data.lang === 'ar'
          ? (courseRow?.name_ar || courseRow?.name_en || 'Course')
          : (courseRow?.name_en || courseRow?.name_ar || 'Course')
        await sendAmsAccountCreatedEmail({
          to: email,
          fullName: data.fullName,
          password: tempPassword,
          courseName,
          lang: data.lang,
        })
      } catch (e) {
        console.error('AMS account email failed', e)
      }
    }

    return { registrantId, isNewUser, email }
  })
