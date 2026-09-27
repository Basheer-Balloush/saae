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
    const targetStudentId = data.studentId ?? callerId

    // Only admins may send on behalf of another student
    if (targetStudentId !== callerId) {
      const { data: isAdmin } = await context.supabase.rpc('has_role', {
        _user_id: callerId,
        _role: 'lms_admin',
      })
      if (!isAdmin) throw new Error('forbidden')
    }

    const { deliverCertificateEmail } = await import('./certificate-email.server')
    return deliverCertificateEmail({ studentId: targetStudentId, courseId: data.courseId, lang: data.lang })
  })
