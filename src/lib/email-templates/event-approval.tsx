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
      <Preview>{ar ? `تم قبول طلبك — رمزك ${pinCode}` : `Registration approved — your PIN ${pinCode}`}</Preview>
      <Body style={main}>
        <Container style={{ ...container, textAlign: ar ? 'right' : 'left' }}>
          <Heading style={h1}>
            {ar ? `مرحباً ${fullName}،` : `Hello ${fullName},`}
          </Heading>
          {ar ? (
            <>
              <Text style={text}>
                نشكر لك اهتمامك وتسجيلك لحضور "الندوة الوطنية السورية الأولى للذكاء الاصطناعي". يسعدنا إبلاغك بأنه قد تم قبول طلبك لحضور هذه الفعالية.
              </Text>
              <Text style={text}>
                نحن نؤمن بأن تواجدك ومشاركتك سيمثلان إضافة مهمة ومثرية جداً لمخرجات الندوة والنقاشات القيمة التي ستُطرح فيها.
              </Text>
              <Text style={{ ...text, fontWeight: 700, color: '#000000', marginBottom: '8px' }}>
                تفاصيل الفعالية:
              </Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>المكان: دمشق، المكتبة الوطنية.</Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>التاريخ: غداً الخميس 25/6/2026.</Text>
              <Text style={{ ...text, margin: '0 0 20px' }}>موعد البدء: الساعة 10:00 صباحاً.</Text>
              <Text style={{ ...text, fontWeight: 700, color: '#000000', marginBottom: '8px' }}>
                ملاحظات تنظيمية هامة:
              </Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>
                • يرجى التواجد في تمام الساعة 9:45 صباحاً لضمان إتمام عملية التسجيل بكل سلاسة وراحة.
              </Text>
              <Text style={{ ...text, margin: '0 0 20px' }}>
                • يرجى التأكد من الاحتفاظ برمز الدخول الخاص بك، حيث ستحتاج لإبرازه للفريق التنظيمي في قسم الاستقبال لتسهيل إجراءات الدخول.
              </Text>
              <Text style={text}>رمز الدخول الخاص بك:</Text>
              <Section style={pinBox}>
                <Text style={pinText}>{pinCode}</Text>
              </Section>
              <Text style={text}>نتطلع للترحيب بك غداً!</Text>
              <Text style={text}>مع أطيب التحيات،</Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Thank you for your interest and for registering to attend the "First Syrian National AI Symposium". We're pleased to inform you that your request has been approved.
              </Text>
              <Text style={text}>
                We believe your presence and participation will be a meaningful and enriching addition to the symposium's outcomes and the valuable discussions that will take place.
              </Text>
              <Text style={{ ...text, fontWeight: 700, color: '#000000', marginBottom: '8px' }}>
                Event details:
              </Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>Venue: Damascus, National Library.</Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>Date: Tomorrow, Thursday 25/6/2026.</Text>
              <Text style={{ ...text, margin: '0 0 20px' }}>Start time: 10:00 AM.</Text>
              <Text style={{ ...text, fontWeight: 700, color: '#000000', marginBottom: '8px' }}>
                Important organizational notes:
              </Text>
              <Text style={{ ...text, margin: '0 0 6px' }}>
                • Please arrive at 9:45 AM to ensure a smooth and comfortable registration process.
              </Text>
              <Text style={{ ...text, margin: '0 0 20px' }}>
                • Please keep your access PIN; you'll need to present it to the organizing team at the reception desk to facilitate entry.
              </Text>
              <Text style={text}>Your access PIN:</Text>
              <Section style={pinBox}>
                <Text style={pinText}>{pinCode}</Text>
              </Section>
              <Text style={text}>We look forward to welcoming you tomorrow!</Text>
              <Text style={text}>Best regards,</Text>
            </>
          )}
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
