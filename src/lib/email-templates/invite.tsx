import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, link, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  lang?: Lang
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl, lang = 'ar' }: Props) => {
  const ar = lang === 'ar'
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `تمت دعوتك للانضمام إلى ${siteName}` : `You've been invited to join ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'تمت دعوتك' : "You've been invited"}</Heading>
          <Text style={text}>
            {ar ? 'تمت دعوتك للانضمام إلى ' : "You've been invited to join "}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            {ar
              ? '. اضغط على الزر أدناه لقبول الدعوة وإنشاء حسابك.'
              : '. Click the button below to accept the invitation and create your account.'}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {ar ? 'قبول الدعوة' : 'Accept Invitation'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.'
              : "If you weren't expecting this invitation, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail
