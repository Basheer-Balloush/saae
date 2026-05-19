import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { SignupEmail } from '@/lib/email-templates/signup'
import { RecoveryEmail } from '@/lib/email-templates/recovery'

type Lang = 'ar' | 'en'

type SignupInput = {
  fullName: string
  email: string
  password: string
  asInstructor: boolean
  lang: Lang
}

type ResetInput = {
  email: string
  lang: Lang
}

const SITE_URL = 'https://www.aisyria.org'
const SITE_NAMES: Record<Lang, string> = {
  ar: 'الجمعية السورية للذكاء الاصطناعي وريادة الأعمال',
  en: 'Syrian Association for AI & Entrepreneurship',
}
const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

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

async function renderEmail(element: React.ReactElement) {
  return {
    html: await render(element),
    text: await render(element, { plainText: true }),
  }
}

function getActionLink(data: unknown) {
  const actionLink = (data as { properties?: { action_link?: string } })?.properties?.action_link
  if (!actionLink) throw new Error('Could not generate email link')
  return actionLink
}

export async function signUpWithResendConfirmation(input: SignupInput) {
  const email = input.email.trim().toLowerCase()
  const redirectTo = `${SITE_URL}/learning-management-system/student`

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: input.password,
    options: {
      data: { full_name: input.fullName, lang: input.lang },
      redirectTo,
    },
  })

  if (error) throw error

  const userId = data.user?.id
  if (userId) {
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'lms_student' }, { onConflict: 'user_id,role', ignoreDuplicates: true })

    if (roleError) console.error('Failed to assign LMS student role', { error: roleError.message, userId })

    if (input.asInstructor) {
      const { error: instructorError } = await supabaseAdmin
        .from('lms_instructors')
        .upsert({ user_id: userId, full_name: input.fullName, approved: false }, { onConflict: 'user_id' })

      if (instructorError) console.error('Failed to create LMS instructor request', { error: instructorError.message, userId })
    }
  }

  const confirmationUrl = getActionLink(data)
  const siteName = SITE_NAMES[input.lang]
  const rendered = await renderEmail(
    React.createElement(SignupEmail, {
      siteName,
      siteUrl: SITE_URL,
      recipient: email,
      confirmationUrl,
      lang: input.lang,
    })
  )

  await sendViaResend({
    to: email,
    subject: input.lang === 'ar' ? 'تأكيد بريدك الإلكتروني' : 'Confirm your email',
    ...rendered,
  })

  return { sentTo: email }
}

export async function sendPasswordResetWithResend(input: ResetInput) {
  const email = input.email.trim().toLowerCase()
  const redirectTo = `${SITE_URL}/learning-management-system/reset-password`

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) {
    if (/not found|unable to validate email address/i.test(error.message)) {
      return { sent: true }
    }
    throw error
  }

  const confirmationUrl = getActionLink(data)
  const siteName = SITE_NAMES[input.lang]
  const rendered = await renderEmail(
    React.createElement(RecoveryEmail, {
      siteName,
      confirmationUrl,
      lang: input.lang,
    })
  )

  await sendViaResend({
    to: email,
    subject: input.lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
    ...rendered,
  })

  return { sent: true }
}