/* Where a learner stands with a course's feedback, from the certificate
   check's answer (lms_evaluate_certificate "reason"). Kept apart from the
   server function so it can be tested on its own. */

/** A response's status in lms_course_feedback. */
export type FeedbackStatus = "draft" | "submitted" | "skipped";

/** A sent or skipped form is closed: final, and enough for the certificate. */
export const isClosed = (status: FeedbackStatus | undefined) =>
  status === "submitted" || status === "skipped";

export type FeedbackState =
  | "not_enrolled"
  | "onsite"
  | "disabled"
  | "unavailable"
  | "lessons_incomplete"
  | "quiz_required"
  | "open"
  | "submitted";

export function feedbackState(x: {
  enrolled: boolean;
  onsite: boolean;
  /** False when an admin switched feedback off for the course. */
  enabled: boolean;
  /** The form is closed: sent or skipped. */
  submitted: boolean;
  /** The certificate check's reason; null when a certificate exists. */
  reason: string | null;
}): FeedbackState {
  if (!x.enrolled) return "not_enrolled";
  if (x.onsite) return "onsite";
  if (x.submitted) return "submitted";
  if (!x.enabled) return "disabled";
  switch (x.reason) {
    // Everything else is done. Before the certificate rule is switched on,
    // or for a certificate issued earlier, the form is open but optional.
    case null:
    case "feedback_required":
      return "open";
    case "lessons_incomplete":
    case "progress_incomplete":
      return "lessons_incomplete";
    case "quiz_not_passed":
      return "quiz_required";
    case "not_enrolled":
      return "not_enrolled";
    default:
      return "unavailable";
  }
}
