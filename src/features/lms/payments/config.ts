/* Payment methods offered on paid courses. Only Sham Cash is live; the others
   show as "coming soon" until their flow is built.

   Before going live: replace public/payments/sham-cash-qr-test.svg with the
   association's real Sham Cash QR (or point `qrSrc` at the new file), fill in
   the real account details, and set `isTest` to false. The logos in
   public/payments/ are placeholders for the official ones (same file names). */

export type PaymentMethodId = "cash" | "sham_cash" | "paymera";

export type PaymentMethodOption = {
  id: PaymentMethodId;
  ar: string;
  en: string;
  /** Logo shown on the option; cash uses an icon instead. */
  logo?: string;
  available: boolean;
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "cash", ar: "كاش", en: "Cash", available: false },
  {
    id: "sham_cash",
    ar: "شام كاش",
    en: "Sham Cash",
    logo: "/payments/sham-cash-logo.svg",
    available: true,
  },
  {
    id: "paymera",
    ar: "Paymera",
    en: "Paymera",
    logo: "/payments/paymera-logo.svg",
    available: false,
  },
];

export const SHAM_CASH = {
  /** A test QR while the system is being tried out. */
  isTest: true,
  qrSrc: "/payments/sham-cash-qr-test.svg",
  accountName: { ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال", en: "SAAE" },
  accountNumber: "0000-0000-TEST",
};

/** Receipts a student may attach to one payment (the database enforces the same). */
export const MAX_RECEIPTS = 3;
export const MAX_RECEIPT_MB = 10;
export const RECEIPT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
export const RECEIPTS_BUCKET = "lms-payment-receipts";
