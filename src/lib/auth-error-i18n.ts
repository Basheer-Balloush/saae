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
    match: /password should be at least|password.*(?:min|short)|PASSWORD_TOO_SHORT/i,
    ar: "يجب ألّا تقلّ كلمة المرور عن 10 أحرف",
    en: "Password must be at least 10 characters",
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
    match: /rate limit|too many requests|RATE_LIMITED/i,
    ar: "محاولات كثيرة جداً، يرجى الانتظار قبل المحاولة مرّة أخرى",
    en: "Too many attempts — please wait a few minutes before trying again",
  },
  {
    match: /SIGNUP_FAILED/i,
    ar: "تعذّر إنشاء الحساب حالياً — حاول مرة أخرى",
    en: "We couldn't create your account right now — please try again",
  },
  {
    match: /network|failed to fetch/i,
    ar: "تعذّر الاتصال بالخادم",
    en: "Network error, please try again",
  },
];

// Stable Supabase auth error codes take priority over English message matching.
const CODE_MAP: Record<string, { ar: string; en: string }> = {
  invalid_credentials: {
    ar: "بيانات تسجيل الدخول غير صحيحة",
    en: "Invalid login credentials",
  },
  email_not_confirmed: {
    ar: "لم يتمّ تأكيد البريد الإلكترونيّ بعد",
    en: "Email not confirmed",
  },
  email_exists: {
    ar: "هذا البريد الإلكترونيّ مسجَّل مسبقاً — سجّل الدخول بدلاً من إنشاء حساب جديد",
    en: "This email is already registered — please log in instead",
  },
  user_already_exists: {
    ar: "هذا البريد الإلكترونيّ مسجَّل مسبقاً — سجّل الدخول بدلاً من إنشاء حساب جديد",
    en: "This email is already registered — please log in instead",
  },
  weak_password: {
    ar: "كلمة المرور ضعيفة — استخدم أحرفاً كبيرة وصغيرة وأرقام ورموز",
    en: "Password is too weak — use uppercase, lowercase, numbers and symbols",
  },
  over_request_rate_limit: {
    ar: "محاولات كثيرة جداً، يرجى الانتظار قبل المحاولة مرّة أخرى",
    en: "Too many attempts — please wait a few minutes before trying again",
  },
  over_email_send_rate_limit: {
    ar: "محاولات كثيرة جداً، يرجى الانتظار قبل المحاولة مرّة أخرى",
    en: "Too many attempts — please wait a few minutes before trying again",
  },
};

export function localizeAuthError(err: unknown, lang: Lang, fallback: string): string {
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  if (typeof code === "string" && CODE_MAP[code]) {
    return lang === "ar" ? CODE_MAP[code].ar : CODE_MAP[code].en;
  }
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  for (const entry of MAP) {
    if (entry.match.test(msg)) return lang === "ar" ? entry.ar : entry.en;
  }
  return fallback;
}
