import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { main, container, h1, text, link, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  siteUrl: string
  verifyUrl: string
  fullName: string
  courseName: string
  serial: string
  lang?: Lang
}

const serialBox: React.CSSProperties = {
  background: '#f6f8fb',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '12px 16px',
  margin: '12px 0',
  fontFamily: 'monospace',
  fontSize: 15,
  letterSpacing: 1,
  direction: 'ltr',
  textAlign: 'center',
}

export const CertificateIssuedEmail = ({
  siteName, siteUrl, verifyUrl, fullName, courseName, serial, lang = 'ar',
}: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>
        {ar ? `مبروك! تم إصدار شهادتك — ${serial}` : `Congratulations! Your certificate ${serial} is ready`}
      </Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>
            {ar ? `مبروك ${fullName}!` : `Congratulations ${fullName}!`}
          </Heading>
          <Text style={text}>
            {ar
              ? `لقد أكملت دورة «${courseName}» بنجاح على منصة `
              : `You've successfully completed "${courseName}" on `}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            {ar ? '، وتم إصدار شهادتك رسمياً.' : '. Your certificate has been issued.'}
          </Text>
          <Text style={text}>
            {ar ? 'الرقم التسلسلي للشهادة:' : 'Certificate serial number:'}
          </Text>
          <Section style={serialBox}>{serial}</Section>
          <Button style={button} href={verifyUrl}>
            {ar ? 'التحقق من الشهادة' : 'Verify certificate'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'يمكنك مشاركة هذا الرابط مع أي جهة للتحقق من صحة الشهادة.'
              : 'You can share this link with anyone to verify the authenticity of your certificate.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default CertificateIssuedEmail
