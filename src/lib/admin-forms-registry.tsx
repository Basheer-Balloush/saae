import type { ComponentType } from "react";
import { InitiativeSurveyDashboard } from "@/components/admin/crm/InitiativeSurveyDashboard";
import { EventSurveyDashboard } from "@/components/admin/crm/EventSurveyDashboard";

export type AdminFormEntry = {
  slug: string;
  labelAr: string;
  labelEn: string;
  Component: ComponentType;
};

/**
 * Registry of admin-visible forms. Add an entry here to make a new form
 * appear automatically under CRM > Forms in the sidebar and at
 * /admin/crm/forms/:slug — no route or sidebar edits required.
 */
export const ADMIN_FORMS: AdminFormEntry[] = [
  {
    slug: "initiative-survey",
    labelAr: "استبيان المبادرة",
    labelEn: "Initiative Survey",
    Component: InitiativeSurveyDashboard,
  },
  {
    slug: "event-survey",
    labelAr: "استبيان المشاريع",
    labelEn: "Project Survey",
    Component: EventSurveyDashboard,
  },
];

export function findAdminForm(slug: string): AdminFormEntry | undefined {
  return ADMIN_FORMS.find((f) => f.slug === slug);
}
