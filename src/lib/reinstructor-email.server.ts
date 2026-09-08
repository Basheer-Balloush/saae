import { getSiteUrl, sendTransactionalEmail, assertEmailRecipientAllowed } from '@/lib/email-delivery.server'

export async function sendReinstructorEmail(input: { idempotencyKey?: string; to: string; fullName: string }) {
  assertEmailRecipientAllowed(input.to)

  const name = (input.fullName || '').trim() || 'الأستاذ/ة'
  const subject = 'يرجى إعادة تعبئة نموذج اعتماد المدرّبين — الجمعية السورية للذكاء الاصطناعي'

  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="color:#0f172a;margin:0 0 12px;">مرحباً ${name}،</h2>
    <p style="line-height:1.8;font-size:15px;">
      شكراً لاهتمامك بالانضمام إلى فريق مدرّبي منصة الجمعية السورية للذكاء الاصطناعي وريادة الأعمال.
    </p>
    <p style="line-height:1.8;font-size:15px;">
      لقد قمنا بتحديث نظام اعتماد المدرّبين لدينا، ويتطلّب ذلك منك إعادة تعبئة
      <strong>نموذج طلب اعتماد المدرّبين</strong> عبر الرابط التالي، حيث ستتم مراجعة طلبك من قبل الإدارة وفق المسار الجديد.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${getSiteUrl()}/learning-management-system/trainer-apply"
         style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
        تعبئة نموذج المدرّبين
      </a>
    </p>
    <p style="line-height:1.8;font-size:14px;color:#475569;">
      إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:<br/>
      <span dir="ltr">${getSiteUrl()}/learning-management-system/trainer-apply</span>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
    <p style="font-size:12px;color:#64748b;line-height:1.7;">
      الجمعية السورية للذكاء الاصطناعي وريادة الأعمال<br/>
      إذا لم تكن قد قدّمت طلباً من قبل يمكنك تجاهل هذه الرسالة.
    </p>
  </div>
</body></html>`

  const text = `مرحباً ${name},

تم تحديث نظام اعتماد المدرّبين. يرجى إعادة تعبئة نموذج الطلب عبر الرابط:
${getSiteUrl()}/learning-management-system/trainer-apply

— الجمعية السورية للذكاء الاصطناعي وريادة الأعمال`

  await sendTransactionalEmail({ to: input.to, subject: subject, html, text, idempotencyKey: input.idempotencyKey })
}
