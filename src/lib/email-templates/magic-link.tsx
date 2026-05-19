import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  confirmationUrl: string
  lang?: Lang
}

export const MagicLinkEmail = ({ siteName, confirmationUrl, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `رابط تسجيل الدخول لـ ${siteName}` : `Your login link for ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'رابط تسجيل الدخول' : 'Your login link'}</Heading>
          <Text style={text}>
            {ar
              ? `اضغط على الزر أدناه لتسجيل الدخول إلى ${siteName}. سينتهي صلاحية هذا الرابط قريباً.`
              : `Click the button below to log in to ${siteName}. This link will expire shortly.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {ar ? 'تسجيل الدخول' : 'Log In'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا البريد بأمان.'
              : "If you didn't request this link, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
