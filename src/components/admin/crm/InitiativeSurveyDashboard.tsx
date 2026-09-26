import { SurveyView, type SurveyField } from "@/features/website/SurveyView";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  heard_from: string | null;
  ai_relationship: string | null;
  ai_tools_used: string | null;
  learning_interests: string[] | null;
  biggest_obstacle: string | null;
  learning_method: string | null;
  device: string | null;
  commitment_level: number | null;
  main_motivation: string | null;
  current_status: string | null;
  extra_notes: string | null;
  subscription_type: string | null;
  donation_amount: number | null;
  created_at: string;
};

const SUB: Record<string, string> = {
  waitlist: "قائمة الانتظار",
  self: "يدفع عن نفسه",
  self_and_donate: "يدفع ويتبرّع",
};

const FIELDS: SurveyField<Row>[] = [
  { key: "full_name", ar: "الاسم", en: "Name", width: 26 },
  { key: "phone", ar: "الهاتف", en: "Phone", ltr: true, width: 18 },
  { key: "email", ar: "البريد", en: "Email", ltr: true, width: 28 },
  { key: "address", ar: "العنوان", en: "Address" },
  { key: "specialization", ar: "الاختصاص", en: "Specialisation" },
  {
    key: "subscription_type",
    ar: "نمط الاشتراك",
    en: "Subscription",
    show: (v) => (v ? (SUB[String(v)] ?? String(v)) : ""),
  },
  { key: "donation_amount", ar: "مبلغ التبرّع", en: "Donation", show: (v) => (v ? `$${v}` : "") },
  { key: "current_status", ar: "الوضع الحالي", en: "Current status" },
  { key: "main_motivation", ar: "الدافع", en: "Motivation" },
  {
    key: "commitment_level",
    ar: "الالتزام",
    en: "Commitment",
    show: (v) => (v === null || v === undefined ? "" : `${v}/5`),
  },
  { key: "device", ar: "الجهاز", en: "Device" },
  { key: "learning_method", ar: "طريقة التعلّم", en: "Learning method" },
  { key: "biggest_obstacle", ar: "أكبر عائق", en: "Biggest obstacle" },
  { key: "learning_interests", ar: "الاهتمامات", en: "Interests", width: 30 },
  { key: "ai_relationship", ar: "علاقته بالذكاء الاصطناعي", en: "Relationship with AI" },
  { key: "ai_tools_used", ar: "أدوات استخدمها", en: "AI tools used" },
  { key: "heard_from", ar: "سمع عنّا من", en: "Heard from" },
  { key: "extra_notes", ar: "ملاحظات", en: "Notes", width: 40 },
];

export function InitiativeSurveyDashboard() {
  return (
    <SurveyView<Row>
      table="initiative_survey_responses"
      fields={FIELDS}
      titleKey="full_name"
      subKeys={["specialization", "subscription_type", "phone"]}
      filename="initiative-survey"
    />
  );
}
