import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import { main, container, h1, text, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  catalogUrl: string
  fullName: string
  code: string
  /** e.g. "خصم 20٪ بحد أقصى 400 ل.س" */
  offer: string
  /** e.g. "صالح لدورتين حتى 31 كانون الأول 2026", or empty */
  limits: string
  lang?: Lang
}

const codeBox: React.CSSProperties = {
  background: '#f6f8fb',
  border: '1px dashed #0b7572',
  borderRadius: 8,
  padding: '14px 16px',
  margin: '12px 0',
  fontFamily: 'monospace',
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: 2,
  direction: 'ltr',
  textAlign: 'center',
}

export const PersonalCouponEmail = ({
  siteName, catalogUrl, fullName, code, offer, limits, lang = 'ar',
}: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `كوبون خاص بك: ${offer}` : `A coupon for you: ${offer}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>
            {ar ? `مرحباً ${fullName}،` : `Hello ${fullName},`}
          </Heading>
          <Text style={text}>
            {ar
              ? `لديك كوبون خاص بك على منصة التعلّم في ${siteName}: ${offer}.`
              : `You have a coupon of your own on the ${siteName} learning platform: ${offer}.`}
            {limits ? ` ${limits}.` : ''}
          </Text>
          <Section style={codeBox}>{code}</Section>
          <Text style={text}>
            {ar
              ? 'افتح الدورة التي تريدها واضغط «سجّل الآن»، ثم أدخل الكود في حقل «كود الكوبون». يعمل الكود مع حسابك فقط.'
              : 'Open the course you want, press Enroll, then enter the code in the "Coupon code" field. The code works only with your account.'}
          </Text>
          <Button style={button} href={catalogUrl}>
            {ar ? 'تصفّح الدورات' : 'Browse courses'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'وصلتك هذه الرسالة لأن فريق المنصة أنشأ هذا الكوبون لك.'
              : 'You received this email because the platform team created this coupon for you.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PersonalCouponEmail
