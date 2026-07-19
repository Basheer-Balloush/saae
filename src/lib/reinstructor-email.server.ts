const SITE_URL = 'https://www.aisyria.org'
const APPLY_URL = `${SITE_URL}/learning-management-system/trainer-apply`
const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

export async function sendReinstructorEmail(input: { to: string; fullName: string }) {
  const lovableApiKey = process.env.LOVABLE_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!lovableApiKey || !resendApiKey) throw new Error('email keys not configured')

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
      <a href="${APPLY_URL}"
         style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
        تعبئة نموذج المدرّبين
      </a>
    </p>
    <p style="line-height:1.8;font-size:14px;color:#475569;">
      إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:<br/>
      <span dir="ltr">${APPLY_URL}</span>
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
${APPLY_URL}

— الجمعية السورية للذكاء الاصطناعي وريادة الأعمال`

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [input.to],
      subject,
      html,
      text,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend send failed [${res.status}]: ${body}`)
  }
}
