import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Briefcase, Inbox, ShieldCheck, Star } from "lucide-react";
import { useConsoleCounts } from "@/components/console/useConsoleCounts";
import { PageHeader, Tabs, useT } from "@/components/console/ui";
import { EnrollmentsBoard } from "@/features/lms-console/EnrollmentsBoard";
import { ReviewsBoard } from "@/features/lms-console/ReviewsBoard";
import { InstructorsQueue } from "@/features/lms-console/InstructorsQueue";
import { CourseReviewQueue, InternshipRequestList } from "@/features/lms-console/DecisionQueues";

const TABS = ["enrollments", "courses", "instructors", "reviews", "internships"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/learning-management-system/admin/requests")({
  head: () => ({ meta: [{ title: "Requests — Learning platform — SAAE" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; course?: string } => ({
    // Old "accreditation" links open the one Instructors tab.
    tab:
      s.tab === "accreditation"
        ? "instructors"
        : TABS.includes(s.tab as Tab)
          ? (s.tab as Tab)
          : undefined,
    course: typeof s.course === "string" ? s.course : undefined,
  }),
  component: RequestsPage,
});

/* Every decision the learning platform waits on, in one place. */
function RequestsPage() {
  const { t } = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: c } = useConsoleCounts(true);
  // Open the first tab that has something waiting, unless one was asked for.
  const firstWaiting: Tab =
    (c?.enrollmentRequests && "enrollments") ||
    (c?.coursesToReview && "courses") ||
    (c?.trainerApplications && "instructors") ||
    (c?.reviewsToModerate && "reviews") ||
    (c?.internshipApplications && "internships") ||
    "enrollments";
  const tab = search.tab ?? firstWaiting;
  const go = (next: Tab, course?: string) =>
    navigate({ search: { tab: next, course }, replace: true });

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("الطلبات", "Requests")}
        description={t(
          "كل ما ينتظر قرارك في مكان واحد: التسجيل، نشر الدورات، المدرّبون، الاعتماد، التقييمات وفرص التدريب.",
          "Everything waiting for your decision in one place: enrollments, courses to publish, instructors, accreditation, reviews and internships.",
        )}
      />
      <Tabs
        value={tab}
        onChange={(v) => go(v)}
        tabs={[
          {
            value: "enrollments",
            label: t("التسجيل", "Enrollments"),
            icon: Inbox,
            count: c?.enrollmentRequests,
          },
          {
            value: "courses",
            label: t("نشر الدورات", "Courses"),
            icon: BookOpen,
            count: c?.coursesToReview,
          },
          {
            value: "instructors",
            label: t("اعتماد المدرّبين", "Instructor accreditation"),
            icon: ShieldCheck,
            count: c?.trainerApplications,
          },
          {
            value: "reviews",
            label: t("التقييمات", "Reviews"),
            icon: Star,
            count: c?.reviewsToModerate,
          },
          {
            value: "internships",
            label: t("فرص التدريب", "Internships"),
            icon: Briefcase,
            count: c?.internshipApplications,
          },
        ]}
      />
      {tab === "enrollments" && (
        <EnrollmentsBoard course={search.course} onSelect={(id) => go("enrollments", id)} />
      )}
      {tab === "courses" && <CourseReviewQueue />}
      {tab === "instructors" && <InstructorsQueue />}
      {tab === "reviews" && <ReviewsBoard />}
      {tab === "internships" && <InternshipRequestList />}
    </div>
  );
}
