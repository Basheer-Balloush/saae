// Map raw DB / network errors to safe, generic user-facing messages.
// Prevents leaking table names, RLS policy text, constraint names, etc.
// Bilingual: chooses Arabic or English based on the active app language
// (reads localStorage "saae-lang", defaulting to "ar"). An explicit `lang`
// argument overrides that detection.

type Lang = "ar" | "en";

function detectLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const v = window.localStorage?.getItem("saae-lang");
  return v === "en" ? "en" : "ar";
}

type Entry = { match: (low: string) => boolean; ar: string; en: string };

const RULES: Entry[] = [
  {
    match: (l) => l.includes("row-level security") || l.includes("permission denied"),
    ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    en: "You don't have permission to perform this action.",
  },
  {
    match: (l) => l.includes("duplicate key") || l.includes("unique constraint") || l.includes("already exists"),
    ar: "هذا العنصر موجود مسبقاً.",
    en: "This item already exists.",
  },
  {
    match: (l) => l.includes("violates foreign key") || l.includes("foreign key"),
    ar: "السجل المرتبط غير موجود أو غير صالح.",
    en: "Related record is missing or invalid.",
  },
  {
    match: (l) => l.includes("not null") || l.includes("invalid input") || l.includes("violates check") || l.includes("check constraint"),
    ar: "بعض البيانات المطلوبة ناقصة أو غير صالحة.",
    en: "Some required information is missing or invalid.",
  },
  {
    match: (l) => l.includes("network") || l.includes("failed to fetch") || l.includes("fetch failed") || l.includes("networkerror"),
    ar: "خطأ في الشبكة — يرجى التحقق من اتصالك بالإنترنت.",
    en: "Network error — please check your connection.",
  },
  {
    match: (l) => l.includes("timeout") || l.includes("timed out"),
    ar: "انتهت مهلة الطلب — حاول مرة أخرى.",
    en: "Request timed out — please try again.",
  },
  {
    match: (l) => l.includes("jwt") || l.includes("unauthenticated") || l.includes("not authenticated") || l.includes("unauthorized") || l.includes("401"),
    ar: "يرجى تسجيل الدخول للمتابعة.",
    en: "Please sign in to continue.",
  },
  {
    match: (l) => l.includes("forbidden") || l.includes("403"),
    ar: "ليس لديك صلاحية للوصول.",
    en: "You don't have access.",
  },
  {
    match: (l) => l.includes("not found") || l.includes("404"),
    ar: "العنصر المطلوب غير موجود.",
    en: "The requested item was not found.",
  },
  {
    match: (l) => l.includes("rate limit") || l.includes("too many requests") || l.includes("429"),
    ar: "محاولات كثيرة جداً — يرجى الانتظار قليلاً ثم المحاولة مجدداً.",
    en: "Too many attempts — please wait a moment and try again.",
  },
  {
    match: (l) => l.includes("payload too large") || l.includes("file size") || l.includes("too large"),
    ar: "حجم الملف كبير جداً.",
    en: "The file is too large.",
  },
  {
    match: (l) => l.includes("invalid file") || l.includes("unsupported") || l.includes("mime"),
    ar: "نوع الملف غير مدعوم.",
    en: "Unsupported file type.",
  },
  {
    match: (l) => l.includes("server error") || l.includes("500") || l.includes("internal"),
    ar: "خطأ في الخادم — يرجى المحاولة لاحقاً.",
    en: "Server error — please try again later.",
  },
];

export function toUserMessage(err: unknown, fallbackOrLang?: string | Lang, langArg?: Lang): string {
  if (err) {
    // eslint-disable-next-line no-console
    console.error("[error]", err);
  }
  const lang: Lang =
    langArg ?? (fallbackOrLang === "ar" || fallbackOrLang === "en" ? fallbackOrLang : detectLang());
  const customFallback =
    typeof fallbackOrLang === "string" && fallbackOrLang !== "ar" && fallbackOrLang !== "en"
      ? fallbackOrLang
      : undefined;
  const fallback =
    customFallback ?? (lang === "ar" ? "حدث خطأ — يرجى المحاولة مرة أخرى." : "Operation failed — please try again.");

  const msg = typeof err === "string" ? err : (err as { message?: string })?.message;
  if (!msg) return fallback;
  const low = msg.toLowerCase();
  for (const rule of RULES) {
    if (rule.match(low)) return lang === "ar" ? rule.ar : rule.en;
  }
  return fallback;
}
