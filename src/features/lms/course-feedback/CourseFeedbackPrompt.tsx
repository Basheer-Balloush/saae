import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Award, ClipboardList, MessageSquareText } from "lucide-react";
import { getCourseFeedback, type CourseFeedbackView } from "@/features/lms/course-feedback/lib/feedback.functions";

type Props = {
  courseId: string;
  ar: boolean;
  /** Where it is shown: the player offers the quiz as the next step; the
      quiz pages explain that the lessons come first. */
  context: "player" | "quiz";
};

/** The learner's next step after the lessons: the quiz, the course feedback
    or the certificate. Shows nothing when there is no step to point to, when
    the course asks no feedback, or when the check fails (the feedback page
    itself explains and retries). */
export function CourseFeedbackPrompt({ courseId, ar, context }: Props) {
  const load = useServerFn(getCourseFeedback);
  const [view, setView] = useState<CourseFeedbackView | null>(null);

  useEffect(() => {
    let active = true;
    load({ data: { courseId } })
      .then((v) => {
        if (active) setView(v);
      })
      .catch(() => {
        /* Stay quiet: this is a pointer, not the gate. */
      });
    return () => {
      active = false;
    };
  }, [courseId, load]);

  if (!view) return null;

  if (view.state === "open") {
    const started = Object.keys(view.answers ?? {}).length > 0;
    return (
      <aside
        className="course-next-step is-feedback"
        aria-label={ar ? "الخطوة التالية" : "Next step"}
      >
        <MessageSquareText aria-hidden="true" />
        <div>
          <p className="course-next-step-title">
            {ar ? "الخطوة الأخيرة: تقييم الدورة" : "One last step: course feedback"}
          </p>
          <p>
            {view.certificateId
              ? ar
                ? "شهادتك صادرة. أخبرنا في أسئلة قصيرة كيف كانت الدورة."
                : "Your certificate is issued. Tell us in a few short questions how the course went."
              : ar
                ? "أجب عن أسئلة قصيرة لتحصل على شهادتك."
                : "Answer a few short questions to get your certificate."}
          </p>
        </div>
        <Link
          to="/learning-management-system/student/feedback/$courseId"
          params={{ courseId }}
          className="action action-primary"
        >
          {started
            ? ar
              ? "أكمل التقييم"
              : "Continue feedback"
            : ar
              ? "ابدأ التقييم"
              : "Give feedback"}
        </Link>
      </aside>
    );
  }

  if (view.state === "quiz_required" && context === "player") {
    return (
      <aside className="course-next-step" aria-label={ar ? "الخطوة التالية" : "Next step"}>
        <ClipboardList aria-hidden="true" />
        <div>
          <p className="course-next-step-title">
            {ar
              ? "أنهيت جميع الدروس. الخطوة التالية: اختبار الدورة"
              : "All lessons done. Next: the course quiz"}
          </p>
          <p>
            {ar
              ? "اجتز الاختبار، ثم قيّم الدورة لتحصل على شهادتك."
              : "Pass the quiz, then give your feedback to get your certificate."}
          </p>
        </div>
        <Link
          to="/learning-management-system/student/quiz/$courseId"
          params={{ courseId }}
          search={{ quiz: undefined, review: undefined }}
          className="action action-primary"
        >
          {ar ? "إلى الاختبار" : "Go to the quiz"}
        </Link>
      </aside>
    );
  }

  if (view.state === "lessons_incomplete" && context === "quiz") {
    return (
      <aside className="course-next-step" aria-label={ar ? "الخطوة التالية" : "Next step"}>
        <ClipboardList aria-hidden="true" />
        <div>
          <p className="course-next-step-title">
            {ar
              ? "أكمل جميع الدروس لتحصل على شهادتك"
              : "Complete every lesson to get your certificate"}
          </p>
          <p>
            {ar
              ? "بعد إكمال الدروس يُفتح تقييم الدورة، ثم تصدر الشهادة."
              : "Once the lessons are done, the course feedback opens, and then the certificate is issued."}
          </p>
        </div>
        <Link
          to="/learning-management-system/student/player/$courseId"
          params={{ courseId }}
          className="action action-secondary"
        >
          {ar ? "تابع الدروس" : "Continue the lessons"}
        </Link>
      </aside>
    );
  }

  if (view.state === "submitted" && view.certificateId) {
    return (
      <aside className="course-next-step is-done" aria-label={ar ? "الشهادة" : "Certificate"}>
        <Award aria-hidden="true" />
        <div>
          <p className="course-next-step-title">
            {ar ? "شهادتك جاهزة" : "Your certificate is ready"}
          </p>
          <p>
            {ar
              ? "أكملت الدورة وأرسلت تقييمك. شكراً لك!"
              : "You finished the course and sent your feedback. Thank you!"}
          </p>
        </div>
        <Link
          to="/learning-management-system/certificate/$id"
          params={{ id: view.certificateId }}
          className="action action-primary"
        >
          {ar ? "الحصول على الشهادة" : "Get certificate"}
        </Link>
      </aside>
    );
  }

  return null;
}
