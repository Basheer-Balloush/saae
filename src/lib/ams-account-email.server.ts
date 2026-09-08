import { getSiteUrl, sendTransactionalEmail, assertEmailRecipientAllowed } from '@/lib/email-delivery.server'
import * as React from 'react'
import { render } from '@react-email/components'
import { AmsAccountCreatedEmail } from './email-templates/ams-account-created'

type Lang = 'ar' | 'en'

const SITE_NAMES: Record<Lang, string> = {
  ar: 'الجمعية السورية للذكاء الاصطناعي وريادة الأعمال',
  en: 'Syrian Association for AI & Entrepreneurship',
}

export async function sendAmsAccountCreatedEmail(input: {
  to: string
  fullName: string
  password: string
  courseName: string
  lang: Lang
}) {
  assertEmailRecipientAllowed(input.to)

  const siteName = SITE_NAMES[input.lang]
  const element = React.createElement(AmsAccountCreatedEmail, {
    siteName,
    siteUrl: getSiteUrl(),
    loginUrl: `${getSiteUrl()}/learning-management-system/login`,
    fullName: input.fullName,
    email: input.to,
    password: input.password,
    courseName: input.courseName,
    lang: input.lang,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  await sendTransactionalEmail({ to: input.to, subject: input.lang === 'ar' ? 'تم إنشاء حسابك على المنصة' : 'Your account has been created', html, text })
}
