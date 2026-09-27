/* Where a learner stands with a course's feedback, from the certificate
   check's answer (lms_evaluate_certificate "reason"). Kept apart from the
   server function so it can be tested on its own. */

export type FeedbackState =
  | "not_enrolled"
  | "onsite"
  | "unavailable"
  | "lessons_incomplete"
  | "quiz_required"
  | "open"
  | "submitted";

export function feedbackState(x: {
  enrolled: boolean;
  onsite: boolean;
  submitted: boolean;
  /** The certificate check's reason; null when a certificate exists. */
  reason: string | null;
}): FeedbackState {
  if (!x.enrolled) return "not_enrolled";
  if (x.onsite) return "onsite";
  if (x.submitted) return "submitted";
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
