import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const schema = z.object({
  courseId: z.string().uuid(),
  // Optional: when omitted, sends for the current user. Admins may pass another studentId.
  studentId: z.string().uuid().optional(),
  lang: z.enum(['ar', 'en']).default('ar'),
})

/**
 * Sends the "certificate issued" email for a completed course, exactly once
 * per certificate. Idempotent — safe to call multiple times: it only sends
 * if a certificate exists and `sent_at` is still null.
 */
export const sendCertificateEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId
    let targetStudentId = data.studentId ?? callerId

    // Only admins may send on behalf of another student
    if (targetStudentId !== callerId) {
      const { data: isAdmin } = await context.supabase.rpc('has_role', {
        _user_id: callerId,
        _role: 'lms_admin',
      })
      if (!isAdmin) throw new Error('forbidden')
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    // Load the certificate (must exist and be unsent)
    const { data: cert, error: certErr } = await supabaseAdmin
      .from('lms_certificates')
      .select('id, serial, sent_at, student_id, course_id')
      .eq('course_id', data.courseId)
      .eq('student_id', targetStudentId)
      .maybeSingle()
    if (certErr) throw new Error(certErr.message)
    if (!cert) return { status: 'no_certificate' as const }
    if (cert.sent_at) return { status: 'already_sent' as const, sentAt: cert.sent_at }

    // Load recipient email + display name
    const { data: userRow, error: userErr } = await supabaseAdmin.auth.admin.getUserById(targetStudentId)
    if (userErr || !userRow.user?.email) throw new Error('user_not_found')
    const email = userRow.user.email
    const fullName =
      (userRow.user.user_metadata as { full_name?: string } | null)?.full_name ||
      email.split('@')[0]

    // Load course name
    const { data: course } = await supabaseAdmin
      .from('lms_courses')
      .select('title, title_en')
      .eq('id', data.courseId)
      .maybeSingle()
    const courseName =
      data.lang === 'ar'
        ? ((course as { title?: string } | null)?.title || (course as { title_en?: string } | null)?.title_en || 'Course')
        : ((course as { title_en?: string } | null)?.title_en || (course as { title?: string } | null)?.title || 'Course')

    try {
      const { sendCertificateIssuedEmail } = await import('./certificate-email.server')
      await sendCertificateIssuedEmail({
        to: email,
        fullName,
        courseName,
        serial: cert.serial,
        lang: data.lang,
      })
      await supabaseAdmin
        .from('lms_certificates')
        .update({ sent_at: new Date().toISOString(), email_error: null })
        .eq('id', cert.id)
        .is('sent_at', null)
      return { status: 'sent' as const, serial: cert.serial }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await supabaseAdmin
        .from('lms_certificates')
        .update({ email_error: msg.slice(0, 500) })
        .eq('id', cert.id)
      throw new Error(msg)
    }
  })
