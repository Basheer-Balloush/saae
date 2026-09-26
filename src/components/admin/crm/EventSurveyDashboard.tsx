import { SurveyView, type SurveyField } from "@/features/website/SurveyView";

type Row = {
  id: string;
  project_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  field: string | null;
  description: string | null;
  problem_solved: string | null;
  stage: string | null;
  team_size: string | null;
  notes: string | null;
  created_at: string;
};

const FIELDS: SurveyField<Row>[] = [
  { key: "project_name", ar: "اسم المشروع", en: "Project", width: 26 },
  { key: "contact_name", ar: "المسؤول", en: "Contact person" },
  { key: "phone", ar: "الهاتف", en: "Phone", ltr: true, width: 18 },
  { key: "email", ar: "البريد", en: "Email", ltr: true, width: 28 },
  { key: "city", ar: "المدينة", en: "City", width: 16 },
  { key: "field", ar: "المجال", en: "Field" },
  { key: "stage", ar: "المرحلة", en: "Stage", width: 16 },
  { key: "team_size", ar: "حجم الفريق", en: "Team size", width: 14 },
  { key: "description", ar: "الوصف", en: "Description", width: 40 },
  { key: "problem_solved", ar: "المشكلة التي يحلّها", en: "Problem it solves", width: 40 },
  { key: "website", ar: "الموقع", en: "Website", link: true, width: 30 },
  { key: "facebook_url", ar: "فيسبوك", en: "Facebook", link: true, width: 30 },
  { key: "instagram_url", ar: "إنستغرام", en: "Instagram", link: true, width: 30 },
  { key: "linkedin_url", ar: "لينكدإن", en: "LinkedIn", link: true, width: 30 },
  { key: "notes", ar: "ملاحظات", en: "Notes", width: 40 },
];

export function EventSurveyDashboard() {
  return (
    <SurveyView<Row>
      table="event_survey_responses"
      fields={FIELDS}
      titleKey="project_name"
      subKeys={["contact_name", "field", "city"]}
      filename="event-survey"
    />
  );
}
