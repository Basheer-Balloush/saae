import { getSiteUrl, sendTransactionalEmail, assertEmailRecipientAllowed } from '@/lib/email-delivery.server'
import * as React from 'react'
import { render } from '@react-email/components'
import { CertificateIssuedEmail } from './email-templates/certificate-issued'

type Lang = 'ar' | 'en'

const SITE_NAMES: Record<Lang, string> = {
  ar: 'الجمعية السورية للذكاء الاصطناعي وريادة الأعمال',
  en: 'Syrian Association for AI & Entrepreneurship',
}

export async function sendCertificateIssuedEmail(input: {
  to: string
  fullName: string
  courseName: string
  serial: string
  lang: Lang
}) {
  assertEmailRecipientAllowed(input.to)

  const siteName = SITE_NAMES[input.lang]
  const verifyUrl = `${getSiteUrl()}/learning-management-system/verify?serial=${encodeURIComponent(input.serial)}`
  const element = React.createElement(CertificateIssuedEmail, {
    siteName,
    siteUrl: getSiteUrl(),
    verifyUrl,
    fullName: input.fullName,
    courseName: input.courseName,
    serial: input.serial,
    lang: input.lang,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  await sendTransactionalEmail({ to: input.to, subject: input.lang === 'ar' ? `مبروك! تم إصدار شهادتك (${input.serial})` : `Your certificate ${input.serial} is ready`, html, text })
}
