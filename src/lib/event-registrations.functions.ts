import * as React from 'react'
import { render } from '@react-email/components'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { EventApprovalEmail } from '@/lib/email-templates/event-approval'

const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

async function sendViaResend(input: { to: string; subject: string; html: string; text: string }) {
  const lovableApiKey = process.env.LOVABLE_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!lovableApiKey || !resendApiKey) {
    // Email not configured — silently skip rather than fail approval
    return { skipped: true }
  }
  const response = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Email send failed [${response.status}]: ${body}`)
  }
  return { skipped: false }
}

// Public submit (anon allowed via RLS)
const SubmitSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(255),
  specialization: z.string().trim().min(2).max(150),
})

export const submitEventRegistration = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    )
    const { error } = await supabase.from('event_registrations').insert({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      specialization: data.specialization,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

const ApproveSchema = z.object({
  id: z.string().uuid(),
  lang: z.enum(['ar', 'en']).default('ar'),
})

export const approveEventRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ApproveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc('approve_event_registration', { _id: data.id })
    if (error) throw new Error(error.message)
    const result = Array.isArray(row) ? row[0] : row
    if (!result) throw new Error('Approval failed')
    const { pin_code, full_name, email } = result as { pin_code: string; full_name: string; email: string; phone: string; specialization: string }

    // Send email
    const ar = data.lang === 'ar'
    const html = await render(React.createElement(EventApprovalEmail, { fullName: full_name, pinCode: pin_code, lang: data.lang }))
    const textBody = ar
      ? `${full_name}، تمت الموافقة على تسجيلك. رمز الدخول الخاص بك: ${pin_code}`
      : `${full_name}, your registration is approved. Your access PIN: ${pin_code}`
    await sendViaResend({
      to: email,
      subject: ar ? 'تمت الموافقة على تسجيلك — الندوة الوطنية للذكاء الاصطناعي' : 'Registration approved — Syrian National AI Symposium',
      html,
      text: textBody,
    })
    return result
  })

const RejectSchema = z.object({ id: z.string().uuid() })
export const rejectEventRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RejectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('event_registrations')
      .update({ status: 'rejected' })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
