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

export const RecoveryEmail = ({ siteName, confirmationUrl, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `إعادة تعيين كلمة المرور لـ ${siteName}` : `Reset your password for ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'إعادة تعيين كلمة المرور' : 'Reset your password'}</Heading>
          <Text style={text}>
            {ar
              ? `لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك في ${siteName}. اضغط على الزر أدناه لاختيار كلمة مرور جديدة.`
              : `We received a request to reset your password for ${siteName}. Click the button below to choose a new password.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {ar ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان. لن يتم تغيير كلمة المرور الخاصة بك.'
              : "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail
