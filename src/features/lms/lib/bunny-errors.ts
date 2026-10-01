import { toUserMessage } from "@/lib/safe-error";

type Lang = "ar" | "en";

/**
 * Turn a failure from the lesson-video flow into a message the instructor can
 * act on. The generic `toUserMessage` fallback ("an error occurred") hides
 * whether the server is missing Bunny secrets, Bunny refused the key, or the
 * upload itself dropped — which is exactly what has to be fixed in each case.
 */
export function bunnyErrorMessage(err: unknown, lang: Lang): string {
  const msg = typeof err === "string" ? err : ((err as { message?: string } | null)?.message ?? "");

  const notConfigured = /bunny_not_configured:\s*(.+)/.exec(msg);
  if (notConfigured) {
    const names = notConfigured[1].trim();
    return lang === "ar"
      ? `خدمة الفيديو غير مهيّأة على الخادم — المتغيرات الناقصة: ${names}`
      : `The video service is not configured on the server — missing: ${names}`;
  }

  const api = /bunny_api_error:.*?HTTP (\d{3})/.exec(msg);
  if (api) {
    const code = Number(api[1]);
    if (code === 401 || code === 403) {
      return lang === "ar"
        ? `رفض Bunny مفتاح الوصول (${code}) — تأكّد أن BUNNY_STREAM_API_KEY هو مفتاح مكتبة الفيديو نفسها وليس مفتاح الحساب`
        : `Bunny refused the access key (${code}) — BUNNY_STREAM_API_KEY must be the video library's API key, not the account key`;
    }
    if (code === 404) {
      return lang === "ar"
        ? "لم يُعثر على مكتبة الفيديو في Bunny (404) — تحقّق من BUNNY_STREAM_LIBRARY_ID"
        : "Bunny could not find the video library (404) — check BUNNY_STREAM_LIBRARY_ID";
    }
    return lang === "ar"
      ? `تعذّر الاتصال بخدمة Bunny (HTTP ${code}) — حاول مرة أخرى`
      : `Bunny request failed (HTTP ${code}) — please try again`;
  }
  if (msg.includes("bunny_api_error")) {
    return lang === "ar"
      ? "ردّ Bunny بشكل غير متوقع — حاول مرة أخرى"
      : "Bunny returned an unexpected response — please try again";
  }

  // tus-js-client DetailedError: "tus: …, response code: 401, …" or no response at all.
  if (msg.startsWith("tus:")) {
    const status = (
      err as { originalResponse?: { getStatus?: () => number } | null } | null
    )?.originalResponse?.getStatus?.();
    if (status === 401 || status === 403) {
      return lang === "ar"
        ? `رفض Bunny توقيع الرفع (${status}) — تحقّق من BUNNY_STREAM_API_KEY و BUNNY_STREAM_LIBRARY_ID`
        : `Bunny rejected the upload signature (${status}) — check BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID`;
    }
    if (status) {
      return lang === "ar"
        ? `فشل رفع الفيديو إلى Bunny (HTTP ${status}) — حاول مرة أخرى`
        : `Uploading the video to Bunny failed (HTTP ${status}) — please try again`;
    }
    return lang === "ar"
      ? "انقطع الاتصال أثناء رفع الفيديو — تحقّق من الإنترنت وحاول مرة أخرى"
      : "The connection dropped while uploading the video — check your internet and try again";
  }

  return toUserMessage(err, lang);
}
