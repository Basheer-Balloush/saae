import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, link, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: Lang
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `تأكيد تغيير البريد لـ ${siteName}` : `Confirm your email change for ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'تأكيد تغيير البريد الإلكتروني' : 'Confirm your email change'}</Heading>
          <Text style={text}>
            {ar ? `لقد طلبت تغيير عنوان بريدك الإلكتروني في ${siteName} من ` : `You requested to change your email address for ${siteName} from `}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>
            {ar ? ' إلى ' : ' to '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Text style={text}>
            {ar ? 'اضغط على الزر أدناه لتأكيد التغيير:' : 'Click the button below to confirm the change:'}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {ar ? 'تأكيد التغيير' : 'Confirm Change'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا لم تطلب هذا التغيير، يمكنك تجاهل هذا البريد بأمان.'
              : "If you didn't request this change, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail
