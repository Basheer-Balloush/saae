import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkFeedback, getTemplate, type TemplateId } from "@/lib/course-feedback-survey";
import { feedbackState, type FeedbackState } from "@/lib/course-feedback-state";

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

export type CourseFeedbackView = {
  state: FeedbackState;
  courseTitle: { ar: string; en: string | null };
  template: TemplateId;
  version: string;
  answers: Record<string, string>;
  notes: Record<string, string>;
  certificateId: string | null;
};

type Admin = SupabaseClient;

async function adminClient(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as never as Admin;
}

type Basics = {
  course: {
    id: string;
    delivery_mode: string | null;
    feedback_template: string | null;
    title_ar: string;
    title_en: string | null;
  };
  enrollmentId: string | null;
  row: {
    status: "draft" | "submitted";
    answers: Record<string, string> | null;
    notes: Record<string, string> | null;
  } | null;
};

async function loadBasics(admin: Admin, userId: string, courseId: string): Promise<Basics> {
  const { data: course, error } = await admin
    .from("lms_courses")
    .select("id, delivery_mode, feedback_template, title_ar, title_en")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error("Could not load the course");
  if (!course) throw new Error("Course not found");
  const { data: enr } = await admin
    .from("lms_enrollments")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  let row: Basics["row"] = null;
  if (enr) {
    const { data } = await admin
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
async function evaluate(admin: Admin, userId: string, courseId: string) {
  const { data, error } = await admin.rpc("lms_evaluate_certificate", {
    _student_id: userId,
    _course_id: courseId,
  });
  if (error) throw new Error("Could not check the course requirements");
  const res = (data ?? {}) as { certificate_id?: string | null; reason?: string | null };
  return { certificateId: res.certificate_id ?? null, reason: res.reason ?? null };
}

async function existingCertificate(admin: Admin, userId: string, courseId: string) {
  const { data } = await admin
    .from("lms_certificates")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function inspect(admin: Admin, userId: string, courseId: string) {
  const b = await loadBasics(admin, userId, courseId);
  const onsite = b.course.delivery_mode === "onsite";
  const submitted = b.row?.status === "submitted";
  let reason: string | null = "not_enrolled";
  let certificateId: string | null = null;
  if (b.enrollmentId && !onsite) {
    if (submitted) {
      certificateId = await existingCertificate(admin, userId, courseId);
      reason = null;
    } else {
      ({ reason, certificateId } = await evaluate(admin, userId, courseId));
    }
  }
  const template = getTemplate(b.course.feedback_template);
  const view: CourseFeedbackView = {
    state: feedbackState({ enrolled: !!b.enrollmentId, onsite, submitted, reason }),
    courseTitle: { ar: b.course.title_ar, en: b.course.title_en },
    template: template.id,
    version: template.version,
    answers: b.row?.answers ?? {},
    notes: b.row?.notes ?? {},
    certificateId,
  };
  return { view, enrollmentId: b.enrollmentId };
}

const alreadySubmitted = (message: string | undefined) =>
  !!message && message.toLowerCase().includes("feedback_already_submitted");

/** The learner's feedback for a course: where they stand, the questions to
    ask (template) and any saved draft. */
export const getCourseFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => courseInput.parse(input))
  .handler(
    async ({ data, context }) =>
      (await inspect(await adminClient(), context.userId, data.courseId)).view,
  );

/** Saves unfinished answers so the learner can come back to them, on this
    device or another. */
export const saveCourseFeedbackDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => responseInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await adminClient();
    const b = await loadBasics(admin, context.userId, data.courseId);
    if (!b.enrollmentId) throw new Error("Forbidden: not enrolled");
    if (b.course.delivery_mode === "onsite") throw new Error("feedback_not_open");
    if (b.row?.status === "submitted") return { status: "submitted" as const };
    const template = getTemplate(b.course.feedback_template);
    const check = checkFeedback(template, { answers: data.answers, notes: data.notes }, "draft");
    if (!check.ok) throw new Error("invalid_feedback");
    const { error } = await admin.from("lms_course_feedback").upsert(
      {
        enrollment_id: b.enrollmentId,
        course_id: data.courseId,
        student_id: context.userId,
        template: template.id,
        version: template.version,
        lang: data.lang,
        answers: check.clean.answers,
        notes: check.clean.notes,
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
  .inputValidator((input: unknown) => responseInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await adminClient();
    const userId = context.userId;
    const { view, enrollmentId } = await inspect(admin, userId, data.courseId);
    if (view.state === "submitted")
      return { status: "submitted" as const, certificateId: view.certificateId };
    if (view.state !== "open") throw new Error(`feedback_not_open:${view.state}`);

    const template = getTemplate(view.template);
    const check = checkFeedback(template, { answers: data.answers, notes: data.notes }, "submit");
    if (!check.ok) {
      throw new Error(`invalid_feedback:${check.issues.map((i) => i.question).join(",")}`);
    }
    const { error } = await admin.from("lms_course_feedback").upsert(
      {
        enrollment_id: enrollmentId,
        course_id: data.courseId,
        student_id: userId,
        template: template.id,
        version: template.version,
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
    try {
      ({ certificateId } = await evaluate(admin, userId, data.courseId));
      if (!certificateId) certificateId = await existingCertificate(admin, userId, data.courseId);
    } catch (e) {
      console.error(
        "[course-feedback] certificate check failed",
        e instanceof Error ? e.message : e,
      );
    }
    if (certificateId) {
      try {
        const { deliverCertificateEmail } = await import("@/lib/certificate-email.server");
        await deliverCertificateEmail({
          studentId: userId,
          courseId: data.courseId,
          lang: data.lang,
        });
      } catch (e) {
        console.error(
          "[course-feedback] certificate email failed",
          e instanceof Error ? e.message : e,
        );
      }
    }
    return { status: "submitted" as const, certificateId };
  });
