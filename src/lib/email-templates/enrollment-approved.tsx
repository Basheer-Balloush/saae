import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import { main, container, h1, text, button, footer, type Lang } from './_shared'

interface Props {
  siteName: string
  courseTitle: string
  courseUrl: string
  studentName?: string
  lang?: Lang
  customBody?: string | null
}

export const EnrollmentApprovedEmail = ({ siteName, courseTitle, courseUrl, studentName, lang = 'ar', customBody }: Props) => {
  const ar = lang === 'ar'
  const interpolate = (s: string) => s
    .replace(/\{\{\s*student_name\s*\}\}/g, studentName ?? '')
    .replace(/\{\{\s*course_title\s*\}\}/g, courseTitle)
    .replace(/\{\{\s*site_name\s*\}\}/g, siteName)
    .replace(/\{\{\s*course_url\s*\}\}/g, courseUrl)
  const paragraphs = customBody?.trim()
    ? interpolate(customBody).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : null
  return (
    <Html lang={lang} dir={ar ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{ar ? `تمت الموافقة على تسجيلك في ${courseTitle}` : `Your enrollment in ${courseTitle} has been approved`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>{ar ? 'تمت الموافقة على تسجيلك 🎉' : 'Your enrollment is approved 🎉'}</Heading>
          {paragraphs ? (
            paragraphs.map((p, i) => <Text key={i} style={text}>{p}</Text>)
          ) : (
            <Text style={text}>
              {ar
                ? `${studentName ? studentName + '، ' : ''}يسعدنا إخبارك بأنه قد تمت الموافقة على طلب تسجيلك في دورة "${courseTitle}" على منصة ${siteName}.`
                : `${studentName ? studentName + ', ' : ''}We're happy to let you know that your enrollment request for the course "${courseTitle}" on ${siteName} has been approved.`}
            </Text>
          )}
          <Button style={button} href={courseUrl}>
            {ar ? 'انتقل إلى الدورة' : 'Go to the course'}
          </Button>
          <Text style={footer}>
            {ar
              ? 'إذا واجهت أي مشكلة في الوصول إلى الدورة، يرجى التواصل معنا.'
              : 'If you have any trouble accessing the course, please contact us.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EnrollmentApprovedEmail
