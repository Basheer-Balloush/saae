import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from '@react-email/components'
import { main, container, h1, text, footer, type Lang } from './_shared'

interface Props {
  fullName: string
  pinCode: string
  lang?: Lang
}

export const EventApprovalEmail = ({ fullName, pinCode, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `تمت الموافقة على تسجيلك — رمزك ${pinCode}` : `Registration approved — your PIN ${pinCode}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>
            {ar ? 'تمت الموافقة على تسجيلك 🎉' : 'Your registration is approved 🎉'}
          </Heading>
          <Text style={text}>
            {ar
              ? `${fullName}، يسعدنا تأكيد قبول تسجيلك في الندوة الوطنية السورية الأولى للذكاء الاصطناعي — المكتبة الوطنية، دمشق، 25/6/2026.`
              : `${fullName}, we're pleased to confirm your registration for the First Syrian National AI Symposium — National Library, Damascus, 25/6/2026.`}
          </Text>
          <Text style={text}>
            {ar ? 'رمز الدخول الخاص بك (احتفظ به لتقديمه عند الدخول):' : 'Your access PIN (keep it to present at the entrance):'}
          </Text>
          <Section style={pinBox}>
            <Text style={pinText}>{pinCode}</Text>
          </Section>
          <Text style={footer}>
            {ar
              ? 'سيتم إرسال هذا الرمز أيضاً عبر واتساب. لأي استفسار يرجى التواصل معنا.'
              : 'This PIN is also being sent to you via WhatsApp. For any questions, please contact us.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const pinBox = {
  background: '#0f172a',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const pinText = {
  color: '#ffffff',
  fontSize: '42px',
  fontWeight: 800 as const,
  letterSpacing: '12px',
  margin: 0,
}

export default EventApprovalEmail
