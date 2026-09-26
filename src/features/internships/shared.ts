import type { Lifecycle, QuestionKind, RequiredProfileField } from "@/lib/lms-internships-admin";
import type { ApplicationStatus } from "@/lib/lms-internships-applications-admin.functions";

type Tone = "green" | "orange" | "gray" | "teal" | "red";
type Label = { ar: string; en: string };

export const LIFECYCLE_UI: Record<Lifecycle, Label & { tone: Tone; hint: Label }> = {
  draft: {
    ar: "مسودّة",
    en: "Draft",
    tone: "orange",
    hint: { ar: "يراها المسؤولون فقط.", en: "Only admins can see it." },
  },
  published: {
    ar: "منشورة",
    en: "Published",
    tone: "green",
    hint: {
      ar: "ظاهرة في القائمة ومفتوحة للتقديم.",
      en: "Listed on the site and open for applications.",
    },
  },
  hidden: {
    ar: "مخفيّة",
    en: "Hidden",
    tone: "gray",
    hint: {
      ar: "غير ظاهرة في القائمة. من لديه الرابط يستطيع فتحها.",
      en: "Not listed. People with the link can still open it.",
    },
  },
  closed: {
    ar: "مغلقة",
    en: "Closed",
    tone: "gray",
    hint: { ar: "ظاهرة، لكن التقديم متوقف.", en: "Still visible, but applications are closed." },
  },
  archived: {
    ar: "مؤرشفة",
    en: "Archived",
    tone: "red",
    hint: {
      ar: "خارج الموقع. يمكن إعادتها كمسودّة.",
      en: "Off the site. It can come back as a draft.",
    },
  },
};

export const APP_STATUS_UI: Record<ApplicationStatus, Label & { tone: Tone }> = {
  new: { ar: "جديد", en: "New", tone: "orange" },
  under_review: { ar: "قيد المراجعة", en: "Under review", tone: "teal" },
  shortlisted: { ar: "القائمة القصيرة", en: "Shortlisted", tone: "teal" },
  interview: { ar: "مقابلة", en: "Interview", tone: "teal" },
  accepted: { ar: "مقبول", en: "Accepted", tone: "green" },
  rejected: { ar: "مرفوض", en: "Rejected", tone: "red" },
  withdrawn: { ar: "مسحوب", en: "Withdrawn", tone: "gray" },
};

/** The pipeline, left to right. Rejected and withdrawn sit outside it. */
export const PIPELINE: ApplicationStatus[] = [
  "new",
  "under_review",
  "shortlisted",
  "interview",
  "accepted",
];

/** Moving back, or rejecting, needs a reason (the server checks the same rule). */
const RANK: Record<ApplicationStatus, number> = {
  withdrawn: 0,
  new: 1,
  under_review: 2,
  shortlisted: 3,
  interview: 4,
  accepted: 5,
  rejected: 5,
};
export const needsReason = (from: ApplicationStatus, to: ApplicationStatus) =>
  to === "rejected" || RANK[to] < RANK[from];

export const PROFILE_FIELD_UI: Record<RequiredProfileField, Label> = {
  full_name: { ar: "الاسم الكامل", en: "Full name" },
  phone: { ar: "الهاتف", en: "Phone" },
  biography: { ar: "نبذة تعريفية", en: "Biography" },
  organization: { ar: "الجهة", en: "Organisation" },
  avatar: { ar: "الصورة الشخصية", en: "Profile photo" },
};

export const QUESTION_KIND_UI: Record<QuestionKind, Label> = {
  short_text: { ar: "نص قصير", en: "Short text" },
  long_text: { ar: "نص طويل", en: "Long text" },
  single_choice: { ar: "خيار واحد", en: "One choice" },
  multi_choice: { ar: "عدة خيارات", en: "Several choices" },
  number: { ar: "رقم", en: "Number" },
  boolean: { ar: "نعم / لا", en: "Yes / No" },
  date: { ar: "تاريخ", en: "Date" },
  url: { ar: "رابط", en: "Link" },
};

export function internshipError(err: unknown, ar: boolean): string {
  const msg = err instanceof Error ? err.message : String(err);
  const pick = (a: string, e: string) => (ar ? a : e);
  if (msg.includes("slug_taken"))
    return pick("هذا الرابط مستخدم مسبقاً", "That link is already in use");
  if (msg.includes("slug_invalid"))
    return pick(
      "الرابط: أحرف إنجليزية صغيرة وأرقام وشرطات فقط",
      "Link: lowercase letters, numbers and dashes only",
    );
  if (msg.includes("has_applications"))
    return pick(
      "لا يمكن الحذف: توجد طلبات. استخدم الأرشفة.",
      "Cannot delete: it has applications. Archive it instead.",
    );
  if (msg.includes("question_has_answers"))
    return pick("لا يمكن حذف سؤال أُجيب عليه", "A question that has answers cannot be deleted");
  if (msg.includes("status_transition_invalid"))
    return pick("لا يمكن تغيير الحالة بهذا الاتجاه", "That status change isn't allowed");
  if (msg.includes("date_range_invalid"))
    return pick(
      "التواريخ غير متسقة: البداية بعد النهاية",
      "Dates don't add up: a start is after its end",
    );
  if (msg.includes("reason_required"))
    return pick("السبب مطلوب لهذا التغيير", "A reason is required for this change");
  if (msg.includes("application_withdrawn"))
    return pick("سحب المتقدّم طلبه", "The applicant withdrew");
  if (msg.includes("assignee_not_admin"))
    return pick("المستخدم المختار ليس مسؤولاً", "That user is not an admin");
  if (msg.includes("unauthorized"))
    return pick("لا تملك صلاحية هذا الإجراء", "You are not allowed to do this");
  if (msg.includes("not_found")) return pick("غير موجود", "Not found");
  return msg;
}

/** "Closes in 3 days", "Closed 2 days ago", or nothing. */
export function deadlineText(
  deadline: string | null,
  ar: boolean,
): { text: string; soon: boolean } | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: ar ? "انتهى التقديم" : "Applications ended", soon: false };
  if (days === 0) return { text: ar ? "يُغلق اليوم" : "Closes today", soon: true };
  return {
    text: ar ? `يُغلق بعد ${days} يوم` : `Closes in ${days} day${days === 1 ? "" : "s"}`,
    soon: days <= 7,
  };
}
