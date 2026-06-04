// Localize common Supabase auth error messages to Arabic/English.
// Falls back to the original message if no mapping exists.

type Lang = "ar" | "en";

const MAP: Array<{ match: RegExp; ar: string; en: string }> = [
  {
    match: /invalid login credentials/i,
    ar: "بيانات تسجيل الدخول غير صحيحة",
    en: "Invalid login credentials",
  },
  {
    match: /email not confirmed/i,
    ar: "لم يتمّ تأكيد البريد الإلكترونيّ بعد",
    en: "Email not confirmed",
  },
  {
    match: /user already registered|already exists|already.*registered|email_exists|EMAIL_ALREADY_REGISTERED/i,
    ar: "هذا البريد الإلكترونيّ مسجَّل مسبقاً — سجّل الدخول بدلاً من إنشاء حساب جديد",
    en: "This email is already registered — please log in instead",
  },
  {
    match: /password should be at least/i,
    ar: "يجب ألّا تقلّ كلمة المرور عن 6 أحرف",
    en: "Password must be at least 6 characters",
  },
  {
    match: /password is too weak|weak password|password strength|strength.*weak/i,
    ar: "كلمة المرور ضعيفة — استخدم أحرفاً كبيرة وصغيرة وأرقام ورموز",
    en: "Password is too weak — use uppercase, lowercase, numbers and symbols",
  },
  {
    match: /password should contain|password must contain|missing/i,
    ar: "كلمة المرور يجب أن تحتوي على حروف وأرقام",
    en: "Password must contain letters and numbers",
  },
  {
    match: /password has been found in|compromised|pwned/i,
    ar: "كلمة المرور شائعة وسهلة الاختراق — اختر كلمةً أقوى",
    en: "This password is commonly used and easily guessed — choose a stronger one",
  },
  {
    match: /unable to validate email address|invalid email/i,
    ar: "بريد إلكترونيّ غير صالح",
    en: "Invalid email address",
  },
  {
    match: /rate limit|too many requests/i,
    ar: "محاولات كثيرة جداً، حاول لاحقاً",
    en: "Too many attempts, please try again later",
  },
  {
    match: /network|failed to fetch/i,
    ar: "تعذّر الاتصال بالخادم",
    en: "Network error, please try again",
  },
];

export function localizeAuthError(err: unknown, lang: Lang, fallback: string): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  for (const entry of MAP) {
    if (entry.match.test(msg)) return lang === "ar" ? entry.ar : entry.en;
  }
  return fallback;
}
