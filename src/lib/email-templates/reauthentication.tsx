import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, code as codeStyle, footer, type Lang } from './_shared'

interface Props {
  token: string
  lang?: Lang
}

export const ReauthenticationEmail = ({ token, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? 'رمز التحقق' : 'Your verification code'}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'تأكيد إعادة المصادقة' : 'Confirm reauthentication'}</Heading>
          <Text style={text}>
            {ar ? 'استخدم الرمز أدناه لتأكيد هويتك:' : 'Use the code below to confirm your identity:'}
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            {ar
              ? 'سينتهي صلاحية هذا الرمز قريباً. إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.'
              : "This code will expire shortly. If you didn't request this, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail
