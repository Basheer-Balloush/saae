import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, link, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  lang?: Lang
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `تأكيد بريدك الإلكتروني لـ ${siteName}` : `Confirm your email for ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'تأكيد بريدك الإلكتروني' : 'Confirm your email'}</Heading>
          <Text style={text}>
            {ar ? 'شكراً لتسجيلك في ' : 'Thanks for signing up for '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            {ar ? '.' : '!'}
          </Text>
          <Text style={text}>
            {ar ? 'يرجى تأكيد عنوان بريدك الإلكتروني (' : 'Please confirm your email address ('}
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
            {ar ? ') بالضغط على الزر أدناه:' : ') by clicking the button below:'}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {ar ? 'تأكيد البريد الإلكتروني' : 'Verify Email'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد بأمان.'
              : "If you didn't create an account, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail
