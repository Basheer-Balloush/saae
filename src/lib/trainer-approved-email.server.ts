const SITE_URL = 'https://www.aisyria.org'
const LOGIN_URL = `${SITE_URL}/learning-management-system/login`
const FROM_ADDRESS = 'SAAE <noreply@aisyria.org>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

/** Phase 2 (CF-02): sent from the outbox after a trainer is activated. */
export async function sendTrainerApprovedEmail(input: { to: string; fullName?: string | null }) {
  const lovableApiKey = process.env.LOVABLE_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  if (!lovableApiKey || !resendApiKey) throw new Error('email keys not configured')

  const name = (input.fullName || '').trim() || 'الأستاذ/ة'
  const subject = 'تم اعتمادك كمدرّب — الجمعية السورية للذكاء الاصطناعي وريادة الأعمال'

  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 12px;">مبروك ${name}،</h2>
    <p style="line-height:1.8;font-size:15px;">
      يسرّنا إعلامك بأنه تم <strong>اعتماد طلبك كمدرّب</strong> على منصة التدريب والتعلّم بعد اجتياز مراحل التقييم بنجاح.
    </p>
    <p style="line-height:1.8;font-size:15px;">
      يمكنك الآن تسجيل الدخول إلى حسابك والوصول إلى لوحة المدرّب لإنشاء دوراتك ومتابعة المتدربين.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${LOGIN_URL}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
        الدخول إلى لوحة المدرّب
      </a>
    </p>
    <p style="font-size:12px;color:#64748b;line-height:1.7;">
      الجمعية السورية للذكاء الاصطناعي وريادة الأعمال
    </p>
  </div>
</body></html>`

  const text = `مبروك ${name},

تم اعتماد طلبك كمدرّب على منصة التدريب والتعلّم. سجّل الدخول عبر:
${LOGIN_URL}

— الجمعية السورية للذكاء الاصطناعي وريادة الأعمال`

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [input.to], subject, html, text }),
  })

  if (!res.ok) {
    throw new Error(`resend_failed_${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return true
}
