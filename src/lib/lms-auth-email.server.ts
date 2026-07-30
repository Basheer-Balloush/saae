import * as React from 'react'
import { createHash } from 'crypto'
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

// Phase 7A — privacy-safe identifier hashing for the rate-limit table.
// We never store raw emails; a peppered SHA-256 keeps the identifier stable
// across attempts while making the row unusable outside this process.
function hashIdentifier(kind: string, value: string) {
  const pepper = process.env.AUTH_RATE_LIMIT_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'saae-fallback-pepper'
  return createHash('sha256').update(`${kind}:${value}:${pepper}`).digest('hex')
}

async function enforceRateLimit(kind: 'signup' | 'reset' | 'resend', email: string, maxPerWindow = 5, windowSeconds = 900) {
  const identifierHash = hashIdentifier(kind, email)
  const { data, error } = await supabaseAdmin.rpc('lms_auth_check_rate_limit', {
    _kind: kind,
    _identifier_hash: identifierHash,
    _max_per_window: maxPerWindow,
    _window_seconds: windowSeconds,
  } as never)
  if (error) {
    // fail-open on limiter errors — don't lock users out because of infra
    console.error('rate limiter error', { kind, message: error.message })
    return
  }
  const parsed = (data ?? {}) as { allowed?: boolean; retry_after_seconds?: number }
  if (parsed.allowed === false) {
    throw new Error('RATE_LIMITED')
  }
}

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

/**
 * Trusted, server-only read of the LMS email-confirmation switch.
 * Fails closed: any error / missing row / non-boolean value ⇒ confirmation required.
 * Flip it with:
 *   UPDATE public.lms_settings SET email_confirmation_required = true, updated_at = now() WHERE id = true;
 */
export async function isEmailConfirmationRequired(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('lms_settings')
      .select('email_confirmation_required')
      .eq('id', true)
      .maybeSingle()

    if (error) {
      console.error('lms_settings lookup failed — failing closed', { message: error.message })
      return true
    }
    const value = (data as { email_confirmation_required?: unknown } | null)?.email_confirmation_required
    return typeof value === 'boolean' ? value : true
  } catch (e) {
    console.error('lms_settings lookup threw — failing closed', { message: e instanceof Error ? e.message : String(e) })
    return true
  }
}

async function assignLmsRoles(userId: string, input: SignupInput) {
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

function mapSignupError(error: { code?: string; status?: number; message: string }): never {
  const code = (error as { code?: string }).code
  const status = (error as { status?: number }).status
  if (code === 'email_exists' || status === 422 || /already.*registered/i.test(error.message)) {
    throw new Error('EMAIL_ALREADY_REGISTERED')
  }
  // Never leak raw provider error text to the client.
  console.error('signup failed', { code, status, message: error.message })
  throw new Error('SIGNUP_FAILED')
}

export type CreateAccountResult = { sentTo: string; email: string; confirmationRequired: boolean }

/**
 * Account creation service. Behaviour depends solely on the server-side
 * `lms_settings.email_confirmation_required` switch — never on client input.
 */
export async function createLmsAccount(input: SignupInput): Promise<CreateAccountResult> {
  const email = input.email.trim().toLowerCase()
  const redirectTo = `${SITE_URL}/learning-management-system/student`

  // Phase 7A — bound signup abuse per normalized email. Six attempts per 15 min.
  await enforceRateLimit('signup', email, 6, 900)

  const confirmationRequired = await isEmailConfirmationRequired()

  if (!confirmationRequired) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, lang: input.lang },
    })

    if (error) mapSignupError(error as never)

    const userId = data.user?.id
    if (userId) await assignLmsRoles(userId, input)

    return { sentTo: email, email, confirmationRequired: false }
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: input.password,
    options: {
      data: { full_name: input.fullName, lang: input.lang },
      redirectTo,
    },
  })

  if (error) mapSignupError(error as never)

  const userId = data.user?.id
  if (userId) await assignLmsRoles(userId, input)

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

  return { sentTo: email, email, confirmationRequired: true }
}

/** Back-compat alias for the previous export name. */
export const signUpWithResendConfirmation = createLmsAccount


export async function sendPasswordResetWithResend(input: ResetInput) {
  const email = input.email.trim().toLowerCase()
  const redirectTo = `${SITE_URL}/learning-management-system/reset-password`

  // Phase 7A — enumeration-safe: every code path returns the same shape.
  // Rate-limit failures also collapse to the generic success response so
  // an attacker cannot distinguish "known email hit" from "unknown email".
  try {
    await enforceRateLimit('reset', email, 5, 900)
  } catch {
    return { sent: true }
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) {
    // Any provider error (including user-not-found) → generic response.
    console.error('recovery generateLink failed', { message: error.message })
    return { sent: true }
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

  try {
    await sendViaResend({
      to: email,
      subject: input.lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
      ...rendered,
    })
  } catch (e) {
    console.error('recovery email send failed', { message: e instanceof Error ? e.message : String(e) })
  }

  return { sent: true }
}
