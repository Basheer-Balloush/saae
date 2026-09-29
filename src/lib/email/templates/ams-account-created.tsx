import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { main, container, h1, text, link, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  siteUrl: string
  loginUrl: string
  fullName: string
  email: string
  password: string
  courseName: string
  lang?: Lang
}

const credBox: React.CSSProperties = {
  background: '#f6f8fb',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '12px 16px',
  margin: '12px 0',
  fontFamily: 'monospace',
  fontSize: 14,
  direction: 'ltr',
  textAlign: 'left',
}

export const AmsAccountCreatedEmail = ({
  siteName, siteUrl, loginUrl, fullName, email, password, courseName, lang = 'ar',
}: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>
        {ar ? `تم إنشاء حسابك في ${siteName}` : `Your ${siteName} account is ready`}
      </Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>
            {ar ? `مرحباً ${fullName}` : `Welcome ${fullName}`}
          </Heading>
          <Text style={text}>
            {ar
              ? `تم تسجيلك في دورة «${courseName}» على منصة `
              : `You've been enrolled in "${courseName}" on `}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            {ar ? '، وأنشأنا لك حساباً للدخول إلى المنصة.' : '. We created an account for you.'}
          </Text>
          <Text style={text}>
            {ar ? 'بيانات الدخول:' : 'Your login details:'}
          </Text>
          <Section style={credBox}>
            <div>Email: {email}</div>
            <div>Password: {password}</div>
          </Section>
          <Button style={button} href={loginUrl}>
            {ar ? 'تسجيل الدخول' : 'Sign in'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'ننصح بتغيير كلمة المرور بعد أول تسجيل دخول.'
              : 'For your security, please change this password after your first sign-in.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AmsAccountCreatedEmail
