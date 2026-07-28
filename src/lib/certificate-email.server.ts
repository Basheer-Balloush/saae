import * as React from 'react'
import { render } from '@react-email/components'
import { CertificateIssuedEmail } from './email-templates/certificate-issued'

type Lang = 'ar' | 'en'

const SITE_URL = 'https://www.aisyria.org'
const SITE_NAMES: Record<Lang, string> = {
  ar: 'الجمعية السورية للذكاء الاصطناعي وريادة الأعمال',
  en: 'Syrian Association for AI & Entrepreneurship',
}
const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

export async function sendCertificateIssuedEmail(input: {
  to: string
  fullName: string
  courseName: string
  serial: string
  lang: Lang
}) {
  const lovableApiKey = process.env.LOVABLE_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!lovableApiKey || !resendApiKey) throw new Error('email keys not configured')

  const siteName = SITE_NAMES[input.lang]
  const verifyUrl = `${SITE_URL}/learning-management-system/verify?serial=${encodeURIComponent(input.serial)}`
  const element = React.createElement(CertificateIssuedEmail, {
    siteName,
    siteUrl: SITE_URL,
    verifyUrl,
    fullName: input.fullName,
    courseName: input.courseName,
    serial: input.serial,
    lang: input.lang,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [input.to],
      subject:
        input.lang === 'ar'
          ? `مبروك! تم إصدار شهادتك (${input.serial})`
          : `Your certificate ${input.serial} is ready`,
      html,
      text,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend send failed [${res.status}]: ${body}`)
  }
}
