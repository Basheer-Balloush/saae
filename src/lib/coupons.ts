/* Coupons and course payments: what the pages show before and after asking
   the database. The database is the judge of every rule; the discount and
   price here mirror it so a form can explain itself
   (supabase/migrations/20260929150000_coupons.sql and
   20260929150100_course_payments.sql). */

export type CouponEffect = "recognition" | "discount";
export type CouponScope = "course" | "category" | "personal";
export type CouponUseStatus = "pending" | "applied" | "released" | "cancelled";

export type Coupon = {
  id: string;
  code: string;
  effect: CouponEffect;
  scope: CouponScope;
  course_id: string | null;
  category_id: string | null;
  user_id: string | null;
  percent_off: number | null;
  min_discount: number | null;
  max_discount: number | null;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
  label: string | null;
  created_at: string;
};

export type CouponUse = {
  id: string;
  coupon_id: string;
  scope: CouponScope;
  effect: CouponEffect;
  user_id: string;
  course_id: string;
  request_id: string | null;
  enrollment_id: string | null;
  status: CouponUseStatus;
  list_price: number;
  discount: number;
  final_price: number;
  created_at: string;
  decided_at: string | null;
  note: string | null;
};

/** What checking a code in the enroll form returns. */
export type CouponQuote =
  | {
      ok: true;
      code: string;
      effect: CouponEffect;
      scope: CouponScope;
      percent_off: number | null;
      min_discount: number | null;
      max_discount: number | null;
      list_price: number;
      discount: number;
      final_price: number;
    }
  | { ok: false; error: string };

/* ---------- codes ---------- */

export const CODE_MIN = 3;
export const CODE_MAX = 40;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

/** Codes ignore capitals and spaces: " archathon 2025 " is ARCHATHON2025. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type CodeProblem = "empty" | "too_short" | "too_long" | "characters";

/** Why a code cannot be saved, or null when it can. */
export function codeProblem(raw: string): CodeProblem | null {
  const code = normalizeCode(raw);
  if (!code) return "empty";
  if (code.length < CODE_MIN) return "too_short";
  if (code.length > CODE_MAX) return "too_long";
  if (!CODE_PATTERN.test(code)) return "characters";
  return null;
}

// No 0/O or 1/I/L, so a code read aloud or over WhatsApp is not misread.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A random code such as K7QX-M2PA, for personal coupons. */
export function randomCode(random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

function defaultRandom(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

/* ---------- prices ---------- */

/** The price a learner sees: the sale price when it is lower, 0 when free. */
export function listPrice(price: number, salePrice: number | null, isFree: boolean): number {
  if (isFree || !(price > 0)) return 0;
  if (salePrice != null && salePrice >= 0 && salePrice < price) return salePrice;
  return price;
}

/** The percentage rounded down to whole pounds, raised to the optional
    minimum, then capped by the optional maximum and the course price. */
export function discountFor(
  list: number,
  percent: number,
  maxDiscount: number | null,
  minDiscount: number | null = null,
): number {
  if (!(list > 0) || !(percent > 0)) return 0;
  // The small epsilon keeps 7% of 1,100 (77.00000000000001) at 77.
  const percentage = Math.floor((list * Math.min(percent, 100)) / 100 + 1e-9);
  return Math.min(
    list,
    maxDiscount == null ? list : Math.floor(maxDiscount),
    Math.max(percentage, minDiscount ?? 0),
  );
}

/** Amounts in Syrian pounds, the way the course page writes them. */
export function formatSP(n: number | null | undefined, ar: boolean): string {
  const v = Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return ar ? `${v} ل.س` : `${v} SP`;
}

/* ---------- personal coupons ---------- */

/** The last nine digits: 0944 123 456, +963 944 123 456 and 00963944123456
    are the same Syrian mobile number. */
export function phoneKey(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/** A number wa.me accepts: country code first, no plus or leading zero
    (a local 09… number is taken as Syrian). */
export function whatsappNumber(raw: string | null | undefined): string {
  let p = (raw ?? "").trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  else if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = "963" + p.slice(1);
  return p.replace(/\D/g, "");
}

/** What a personal coupon offers, for the email and the WhatsApp message:
    { offer: "خصم 20٪ بحد أقصى 400 ل.س", limits: "صالح لـ 2 دورات حتى …" }. */
export function couponOffer(
  c: Pick<Coupon, "percent_off" | "min_discount" | "max_discount" | "max_uses" | "expires_at">,
  ar: boolean,
) {
  const pct = Number(c.percent_off ?? 0);
  const floor = c.min_discount != null ? formatSP(Number(c.min_discount), ar) : null;
  const cap = c.max_discount != null ? formatSP(Number(c.max_discount), ar) : null;
  const offer = ar
    ? `خصم ${pct}٪${floor ? ` بحد أدنى ${floor} (حتى سعر الدورة)` : ""}${cap ? ` بحد أقصى ${cap}` : ""}`
    : `${pct}% off${floor ? `, at least ${floor} (up to the course price)` : ""}${cap ? `, at most ${cap}` : ""}`;
  const parts: string[] = [];
  if (c.max_uses != null) {
    const n = Number(c.max_uses);
    parts.push(
      ar
        ? n === 1
          ? "صالح لدورة واحدة"
          : `صالح لـ ${n} دورات`
        : `valid for ${n} course${n === 1 ? "" : "s"}`,
    );
  }
  if (c.expires_at) {
    const d = new Date(c.expires_at).toLocaleDateString(ar ? "ar-SY" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    parts.push(ar ? `حتى ${d}` : `until ${d}`);
  }
  return { offer, limits: parts.join(" ") };
}

/** The WhatsApp message for a personal coupon. */
export function couponWhatsappText(
  c: Pick<
    Coupon,
    "code" | "percent_off" | "min_discount" | "max_discount" | "max_uses" | "expires_at"
  >,
  name: string | null,
  catalogUrl: string,
  ar: boolean,
) {
  const { offer, limits } = couponOffer(c, ar);
  return ar
    ? `مرحباً ${name ?? ""}،\nلديك كوبون خاص بك على منصة التعلّم: ${offer}${limits ? ` (${limits})` : ""}.\nالكود: ${c.code}\nافتح الدورة التي تريدها واضغط «سجّل الآن»، ثم أدخل الكود في حقل «كود الكوبون». يعمل الكود مع حسابك فقط.\n${catalogUrl}`
    : `Hello ${name ?? ""},\nYou have a coupon of your own on the learning platform: ${offer}${limits ? ` (${limits})` : ""}.\nCode: ${c.code}\nOpen the course you want, press Enroll, then enter the code in the "Coupon code" field. It works only with your account.\n${catalogUrl}`;
}

/* ---------- messages ---------- */

const COUPON_MESSAGES: Record<string, { ar: string; en: string }> = {
  coupon_needs_account: {
    ar: "الكوبونات للحسابات فقط. أنشئ حسابك (يبقى تقدّمك معك) ثم أدخل الكود.",
    en: "Coupons are for accounts only. Create your account (your progress stays with you), then enter the code.",
  },
  account_required: {
    ar: "هذا متاح للحسابات فقط، لا للزوار.",
    en: "This is available to accounts only, not to guests.",
  },
  coupon_not_found: {
    ar: "هذا الكود غير صحيح. تأكّد منه وأعد المحاولة.",
    en: "This code is not valid. Check it and try again.",
  },
  coupon_rate_limited: {
    ar: "أدخلت أكواداً غير صحيحة كثيرة. حاول مجدداً بعد ساعة.",
    en: "Too many wrong codes. Try again in an hour.",
  },
  coupon_inactive: { ar: "هذا الكود غير مفعّل حالياً.", en: "This code is switched off." },
  coupon_expired: { ar: "انتهت صلاحية هذا الكود.", en: "This code has expired." },
  coupon_used_up: { ar: "تم استخدام هذا الكود بالكامل.", en: "This code has been used up." },
  coupon_wrong_course: {
    ar: "هذا الكود لا ينطبق على هذه الدورة.",
    en: "This code does not apply to this course.",
  },
  coupon_already_used_here: {
    ar: "استخدمت كوداً في هذه الدورة من قبل، ولا يمكن استخدام كود آخر فيها.",
    en: "You already used a code on this course, and only one is allowed.",
  },
  coupon_already_used: {
    ar: "استخدمت هذا الكود في دورة أخرى من قبل.",
    en: "You already used this code on another course.",
  },
  coupon_free_course: {
    ar: "هذه الدورة مجانية ولا تحتاج إلى كود خصم.",
    en: "This course is free and needs no discount code.",
  },
  coupon_recognition_only: {
    ar: "أدخل كود اعتراف بإكمال الدورة، وليس كود خصم.",
    en: "Enter a course recognition code, not a discount code.",
  },
  already_completed: {
    ar: "هذه الدورة مكتملة بالفعل في حسابك.",
    en: "This course is already completed in your account.",
  },
  already_enrolled: { ar: "أنت مسجّل في هذه الدورة.", en: "You are enrolled in this course." },
  request_already_pending: {
    ar: "لديك طلب تسجيل قيد المراجعة في هذه الدورة. لا يُقبل الآن إلا كود اعتراف.",
    en: "You have a request waiting for this course. Only a recognition code can be used now.",
  },
  form_required: {
    ar: "املأ نموذج التسجيل وأدخل الكود فيه.",
    en: "Fill in the enrollment form and enter the code there.",
  },
  course_not_found: { ar: "الدورة غير موجودة.", en: "Course not found." },
};

export function couponErrorMessage(code: string | null | undefined, ar: boolean): string {
  const m = code ? COUPON_MESSAGES[code] : undefined;
  if (m) return ar ? m.ar : m.en;
  return ar ? "تعذّر التحقق من الكود. حاول مجدداً." : "The code could not be checked. Try again.";
}

/** A one-line description of what a checked code does. */
export function quoteSummary(q: Extract<CouponQuote, { ok: true }>, ar: boolean): string {
  if (q.effect === "recognition") {
    return ar
      ? "كود اعتراف: ستظهر الدورة مكتملة في ملفك، ثم تجيب عن استبيان التقييم وتحصل على شهادتك."
      : "Recognition code: the course shows as completed on your profile, then you answer the feedback form and get your certificate.";
  }
  const pct = Number(q.percent_off);
  const floor = q.min_discount != null ? Number(q.min_discount) : null;
  const cap = q.max_discount != null ? Number(q.max_discount) : null;
  const kind =
    q.scope === "personal"
      ? ar
        ? "كوبون شخصي"
        : "Personal coupon"
      : q.scope === "category"
        ? ar
          ? "كوبون تصنيف"
          : "Category coupon"
        : ar
          ? "كوبون الدورة"
          : "Course coupon";
  const floorText =
    floor != null
      ? ar
        ? ` بحد أدنى ${formatSP(floor, ar)} (حتى سعر الدورة)`
        : `, at least ${formatSP(floor, ar)} (up to the course price)`
      : "";
  const capText =
    cap != null ? (ar ? ` بحد أقصى ${formatSP(cap, ar)}` : `, at most ${formatSP(cap, ar)}`) : "";
  return ar
    ? `${kind}: خصم ${pct}٪${floorText}${capText}`
    : `${kind}: ${pct}% off${floorText}${capText}`;
}

/* ---------- payments ---------- */

export type PaymentKind = "payment" | "waiver" | "correction";
export type PaymentMethod = "cash" | "transfer" | "online" | "other";

export type PaymentEntry = {
  id: string;
  course_id: string;
  student_id: string;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod | null;
  paid_on: string;
  reference: string | null;
  note: string | null;
  corrects_id: string | null;
  recorded_by: string | null;
  created_at: string;
};

export const PAYMENT_METHODS: { value: PaymentMethod; ar: string; en: string }[] = [
  { value: "cash", ar: "نقداً", en: "Cash" },
  { value: "transfer", ar: "حوالة", en: "Transfer" },
  { value: "online", ar: "دفع إلكتروني", en: "Online" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export function methodLabel(m: PaymentMethod | null, ar: boolean): string {
  const found = PAYMENT_METHODS.find((x) => x.value === m);
  return found ? (ar ? found.ar : found.en) : "—";
}

/** untracked: enrolled before payments were recorded. free: nothing owed. */
export type PaymentState = "untracked" | "free" | "unpaid" | "partial" | "paid" | "waived";

export type PaymentSummary = {
  due: number | null;
  /** Money received, after corrections. */
  paid: number;
  /** Forgiven by a waiver, after corrections. */
  waived: number;
  remaining: number;
  /** Share of what is owed that is settled, 0 to 100. */
  percent: number;
  state: PaymentState;
  /** Entries a correction has cancelled. */
  cancelled: Set<string>;
};

export function paymentSummary(
  amountDue: number | null | undefined,
  entries: Pick<PaymentEntry, "id" | "kind" | "amount" | "corrects_id">[],
): PaymentSummary {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const cancelled = new Set<string>();
  let paid = 0;
  let waived = 0;
  for (const e of entries) {
    const amount = Number(e.amount);
    if (e.kind === "payment") paid += amount;
    else if (e.kind === "waiver") waived += amount;
    else if (e.corrects_id) {
      cancelled.add(e.corrects_id);
      if (byId.get(e.corrects_id)?.kind === "waiver") waived += amount;
      else paid += amount;
    }
  }
  paid = round2(paid);
  waived = round2(waived);
  const due = amountDue == null ? null : Number(amountDue);
  if (due == null) {
    return { due, paid, waived, remaining: 0, percent: 0, state: "untracked", cancelled };
  }
  const settled = paid + waived;
  const remaining = round2(Math.max(due - settled, 0));
  if (due <= 0) return { due, paid, waived, remaining: 0, percent: 100, state: "free", cancelled };
  const done = remaining === 0;
  // Never show 100% while something is still owed.
  const percent = done ? 100 : Math.min(99, Math.round((settled / due) * 100));
  const state: PaymentState = done
    ? waived > 0
      ? "waived"
      : "paid"
    : settled > 0
      ? "partial"
      : "unpaid";
  return { due, paid, waived, remaining, percent, state, cancelled };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const PAYMENT_STATE_LABELS: Record<
  PaymentState,
  { ar: string; en: string; tone: "gray" | "orange" | "green" | "red" | "teal" }
> = {
  untracked: { ar: "غير محدد", en: "Not recorded", tone: "gray" },
  free: { ar: "لا شيء مطلوب", en: "Nothing owed", tone: "teal" },
  unpaid: { ar: "لم يدفع", en: "Unpaid", tone: "red" },
  partial: { ar: "جزئي", en: "Partly paid", tone: "orange" },
  paid: { ar: "مكتمل", en: "Paid", tone: "green" },
  waived: { ar: "مكتمل مع إعفاء", en: "Settled with a waiver", tone: "green" },
};
