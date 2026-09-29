import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkFeedback, keepValidAnswers, type FormDefinition } from "@/lib/course-feedback-survey";
import { feedbackState, type FeedbackState } from "@/lib/course-feedback-state";
import type { Db, EffectiveForm } from "@/lib/course-feedback.server";

/*
 * Course feedback, the last step of an online course before its certificate.
 * The learner is always the signed-in user; nobody can read or write another
 * learner's response here. Writes use the service role after these checks;
 * the table itself only lets learners read their own rows.
 * Answers are never logged.
 */

const courseInput = z.object({ courseId: z.string().uuid() });
const responseInput = courseInput.extend({
  answers: z.record(z.string().max(64), z.string().max(64)).default({}),
  notes: z.record(z.string().max(64), z.string().max(4000)).default({}),
  lang: z.enum(["ar", "en"]).default("ar"),
});
const submitInput = responseInput.extend({
  // The form the learner answered; a newer one means an admin changed it.
  formId: z.string().uuid(),
  formVersion: z.number().int().positive(),
});

export type CourseFeedbackView = {
  state: FeedbackState;
  courseTitle: { ar: string; en: string | null };
  formId: string;
  formVersion: number;
  form: FormDefinition;
  answers: Record<string, string>;
  notes: Record<string, string>;
  certificateId: string | null;
  /** "payment" when everything is done but the course's certificate waits
      for what the learner owes. */
  waitingFor: "payment" | null;
};

const server = () => import("@/lib/course-feedback.server");

type Basics = {
  course: { id: string; delivery_mode: string | null; title_ar: string; title_en: string | null };
  enrollmentId: string | null;
  row: {
    status: "draft" | "submitted";
    answers: Record<string, string> | null;
    notes: Record<string, string> | null;
  } | null;
};

async function loadBasics(db: Db, userId: string, courseId: string): Promise<Basics> {
  const { data: course, error } = await db
    .from("lms_courses")
    .select("id, delivery_mode, title_ar, title_en")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error("Could not load the course");
  if (!course) throw new Error("Course not found");
  const { data: enr } = await db
    .from("lms_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  let row: Basics["row"] = null;
  if (enr) {
    const { data } = await db
      .from("lms_course_feedback")
      .select("status, answers, notes")
      .eq("enrollment_id", enr.id)
      .maybeSingle();
    row = (data as Basics["row"]) ?? null;
  }
  return { course: course as Basics["course"], enrollmentId: enr?.id ?? null, row };
}

/** Runs the course's certificate check. It issues the certificate when
    everything, feedback included, is done; that is always the right outcome. */
async function evaluate(db: Db, userId: string, courseId: string) {
  const { data, error } = await db.rpc("lms_evaluate_certificate", {
    _student_id: userId,
    _course_id: courseId,
  });
  if (error) throw new Error("Could not check the course requirements");
  const res = (data ?? {}) as { certificate_id?: string | null; reason?: string | null };
  return { certificateId: res.certificate_id ?? null, reason: res.reason ?? null };
}

async function existingCertificate(db: Db, userId: string, courseId: string) {
  const { data } = await db
    .from("lms_certificates")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function inspect(db: Db, userId: string, courseId: string) {
  const { effectiveForm } = await server();
  const b = await loadBasics(db, userId, courseId);
  const form: EffectiveForm = await effectiveForm(db, courseId);
  const onsite = b.course.delivery_mode === "onsite";
  const submitted = b.row?.status === "submitted";
  let reason: string | null = "not_enrolled";
  let certificateId: string | null = null;
  let waitingFor: CourseFeedbackView["waitingFor"] = null;
  if (b.enrollmentId && !onsite) {
    if (submitted || !form.enabled) {
      certificateId = await existingCertificate(db, userId, courseId);
      reason = null;
      if (!certificateId) {
        // Nothing left to answer: say what the certificate still waits for.
        const res = await evaluate(db, userId, courseId);
        certificateId = res.certificateId;
        waitingFor = res.reason === "payment_required" ? "payment" : null;
        if (res.certificateId) await emailCertificate(userId, courseId, "ar");
      }
    } else {
      ({ reason, certificateId } = await evaluate(db, userId, courseId));
    }
  }
  // A draft saved before an admin changed the form keeps what still fits.
  const draft = keepValidAnswers(form.definition, {
    answers: b.row?.answers ?? {},
    notes: b.row?.notes ?? {},
  });
  const view: CourseFeedbackView = {
    state: feedbackState({
      enrolled: !!b.enrollmentId,
      onsite,
      enabled: form.enabled,
      submitted,
      reason,
    }),
    courseTitle: { ar: b.course.title_ar, en: b.course.title_en },
    formId: form.formId,
    formVersion: form.version,
    form: form.definition,
    answers: submitted ? {} : draft.answers,
    notes: submitted ? {} : draft.notes,
    certificateId,
    waitingFor,
  };
  return { view, enrollmentId: b.enrollmentId };
}

/** Sends the certificate email once (it does nothing when already sent). A
    failure is logged; the certificate itself is already issued. */
async function emailCertificate(userId: string, courseId: string, lang: "ar" | "en") {
  try {
    const { deliverCertificateEmail } = await import("@/lib/certificate-email.server");
    await deliverCertificateEmail({ studentId: userId, courseId, lang });
  } catch (e) {
    console.error("[course-feedback] certificate email failed", e instanceof Error ? e.message : e);
  }
}

const alreadySubmitted = (message: string | undefined) =>
  !!message && message.toLowerCase().includes("feedback_already_submitted");

/** The learner's feedback for a course: where they stand, the form to fill
    in and any saved draft. */
export const getCourseFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => courseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { serviceClient } = await server();
    return (await inspect(await serviceClient(), context.userId, data.courseId)).view;
  });

/** Saves unfinished answers so the learner can come back to them, on this
    device or another. */
export const saveCourseFeedbackDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => responseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { serviceClient, effectiveForm } = await server();
    const db = await serviceClient();
    const b = await loadBasics(db, context.userId, data.courseId);
    if (!b.enrollmentId) throw new Error("Forbidden: not enrolled");
    if (b.course.delivery_mode === "onsite") throw new Error("feedback_not_open");
    if (b.row?.status === "submitted") return { status: "submitted" as const };
    const form = await effectiveForm(db, data.courseId);
    if (!form.enabled) throw new Error("feedback_not_open");
    // A draft never fails over a question the admin just removed.
    const clean = keepValidAnswers(form.definition, { answers: data.answers, notes: data.notes });
    const { error } = await db.from("lms_course_feedback").upsert(
      {
        enrollment_id: b.enrollmentId,
        course_id: data.courseId,
        student_id: context.userId,
        form_id: form.formId,
        form_version: form.version,
        lang: data.lang,
        answers: clean.answers,
        notes: clean.notes,
        status: "draft",
      },
      { onConflict: "enrollment_id" },
    );
    if (error) {
      if (alreadySubmitted(error.message)) return { status: "submitted" as const };
      throw new Error("Could not save the draft");
    }
    return { status: "draft" as const };
  });

/** Submits the feedback, then issues the certificate when the course's other
    requirements are met and emails it. The response is saved first, so a
    certificate or email problem never loses it. Safe to retry. */
export const submitCourseFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { serviceClient } = await server();
    const db = await serviceClient();
    const userId = context.userId;
    const { view, enrollmentId } = await inspect(db, userId, data.courseId);
    if (view.state === "submitted")
      return {
        status: "submitted" as const,
        certificateId: view.certificateId,
        waitingFor: view.waitingFor,
      };
    if (view.state !== "open") throw new Error(`feedback_not_open:${view.state}`);
    // The page reloads the new form and keeps the answers that still fit.
    if (view.formId !== data.formId || view.formVersion !== data.formVersion)
      throw new Error("form_changed");

    const check = checkFeedback(view.form, { answers: data.answers, notes: data.notes }, "submit");
    if (!check.ok) {
      throw new Error(`invalid_feedback:${check.issues.map((i) => i.question).join(",")}`);
    }
    const { error } = await db.from("lms_course_feedback").upsert(
      {
        enrollment_id: enrollmentId,
        course_id: data.courseId,
        student_id: userId,
        form_id: view.formId,
        form_version: view.formVersion,
        lang: data.lang,
        answers: check.clean.answers,
        notes: check.clean.notes,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "enrollment_id" },
    );
    if (error && !alreadySubmitted(error.message)) throw new Error("Could not save your feedback");

    let certificateId: string | null = null;
    let waitingFor: CourseFeedbackView["waitingFor"] = null;
    try {
      const res = await evaluate(db, userId, data.courseId);
      certificateId = res.certificateId;
      waitingFor = res.reason === "payment_required" ? "payment" : null;
      if (!certificateId) certificateId = await existingCertificate(db, userId, data.courseId);
    } catch (e) {
      console.error(
        "[course-feedback] certificate check failed",
        e instanceof Error ? e.message : e,
      );
    }
    if (certificateId) await emailCertificate(userId, data.courseId, data.lang);
    return { status: "submitted" as const, certificateId, waitingFor };
  });
