/* Payment methods offered on paid courses: cash at the association, or a
   Sham Cash transfer with its receipts. Either way a payment reviewer
   confirms the money arrived before the course opens.

   `qrSrc` and `accountNumber` are the association's Sham Cash account. Set
   `isTest` back to true only when they point at a test account. */

export type PaymentMethodId = "cash" | "sham_cash";

export type PaymentMethodOption = {
  id: PaymentMethodId;
  ar: string;
  en: string;
  /** Logo shown on the option; cash uses an icon instead. */
  logo?: string;
  available: boolean;
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "cash", ar: "كاش", en: "Cash", available: true },
  {
    id: "sham_cash",
    ar: "شام كاش",
    en: "Sham Cash",
    logo: "/payments/sham-cash-logo.webp",
    available: true,
  },
];

export const SHAM_CASH = {
  isTest: false,
  qrSrc: "/payments/sham-cash-qr.webp",
  accountName: { ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال", en: "SAAE" },
  accountNumber: "4480b42da0dcf77b23c91d97a9314eaf",
};

/** Receipts a student may attach to one payment (the database enforces the same). */
export const MAX_RECEIPTS = 3;
export const MAX_RECEIPT_MB = 10;
export const RECEIPT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
export const RECEIPTS_BUCKET = "lms-payment-receipts";
