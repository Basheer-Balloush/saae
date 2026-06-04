import * as React from 'react'
import { render } from '@react-email/components'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { EnrollmentApprovedEmail } from '@/lib/email-templates/enrollment-approved'

const SITE_URL = 'https://www.aisyria.org'
const SITE_NAMES = {
  ar: 'الجمعية السورية للذكاء الاصطناعي وريادة الأعمال',
  en: 'Syrian Association for AI & Entrepreneurship',
} as const
const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const InputSchema = z.object({
  requestId: z.string().uuid(),
  lang: z.enum(['ar', 'en']).default('ar'),
})

async function sendViaResend(input: { to: string; subject: string; html: string; text: string }) {
  const lovableApiKey = process.env.LOVABLE_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!lovableApiKey) throw new Error('LOVABLE_API_KEY is not configured')
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured')

  const response = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend send failed [${response.status}]: ${body}`)
  }
}

export const sendEnrollmentApprovedEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is an LMS admin
    const { data: isAdmin, error: roleError } = await context.supabase.rpc('is_lms_admin', { _user_id: context.userId })
    if (roleError) throw new Error(roleError.message)
    if (!isAdmin) throw new Error('Forbidden')

    // Load request + course
    const { data: req, error: reqError } = await supabaseAdmin
      .from('lms_enrollment_requests')
      .select('id, user_id, course_id, status')
      .eq('id', data.requestId)
      .single()
    if (reqError) throw new Error(reqError.message)
    if (!req) throw new Error('Request not found')

    const { data: course, error: courseError } = await supabaseAdmin
      .from('lms_courses')
      .select('id, title_ar, title_en, approval_email_subject_ar, approval_email_subject_en, approval_email_body_ar, approval_email_body_en')
      .eq('id', req.course_id)
      .single()
    if (courseError) throw new Error(courseError.message)

    const { data: userResp, error: userError } = await supabaseAdmin.auth.admin.getUserById(req.user_id)
    if (userError) throw new Error(userError.message)
    const email = userResp.user?.email
    if (!email) throw new Error('User has no email')
    const studentName = (userResp.user?.user_metadata as { full_name?: string } | null)?.full_name

    const ar = data.lang === 'ar'
    const courseTitle = ar ? course.title_ar : (course.title_en || course.title_ar)
    const siteName = SITE_NAMES[data.lang]
    const courseUrl = `${SITE_URL}/learning-management-system/courses/${course.id}`

    const customBody = ar
      ? (course.approval_email_body_ar ?? null)
      : (course.approval_email_body_en ?? course.approval_email_body_ar ?? null)
    const customSubject = ar
      ? (course.approval_email_subject_ar ?? null)
      : (course.approval_email_subject_en ?? course.approval_email_subject_ar ?? null)

    const interpolate = (s: string) => s
      .replace(/\{\{\s*student_name\s*\}\}/g, studentName ?? '')
      .replace(/\{\{\s*course_title\s*\}\}/g, courseTitle)
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName)
      .replace(/\{\{\s*course_url\s*\}\}/g, courseUrl)

    const element = React.createElement(EnrollmentApprovedEmail, {
      siteName,
      courseTitle,
      courseUrl,
      studentName,
      lang: data.lang,
      customBody,
    })

    const html = await render(element)
    const text = await render(element, { plainText: true })

    const subject = customSubject
      ? interpolate(customSubject)
      : (ar ? `تمت الموافقة على تسجيلك في ${courseTitle}` : `Your enrollment in ${courseTitle} has been approved`)

    await sendViaResend({
      to: email,
      subject,
      html,
      text,
    })

    return { sent: true }
  })
