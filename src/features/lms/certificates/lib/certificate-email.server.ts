import { Buffer } from "node:buffer";
import {
  getSiteUrl,
  sendTransactionalEmail,
  assertEmailRecipientAllowed,
} from "@/lib/email/email-delivery.server";
import * as React from "react";
import { render } from "@react-email/components";
import { CertificateIssuedEmail } from "@/lib/email/templates/certificate-issued";

type Lang = "ar" | "en";

const SITE_NAMES: Record<Lang, string> = {
  ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
  en: "Syrian Association for AI & Entrepreneurship",
};

export async function sendCertificateIssuedEmail(input: {
  to: string;
  fullName: string;
  courseName: string;
  serial: string;
  lang: Lang;
  pdf?: Uint8Array;
}) {
  assertEmailRecipientAllowed(input.to);

  const siteName = SITE_NAMES[input.lang];
  const verifyUrl = `${getSiteUrl()}/learning-management-system/verify?serial=${encodeURIComponent(input.serial)}`;
  const element = React.createElement(CertificateIssuedEmail, {
    siteName,
    siteUrl: getSiteUrl(),
    verifyUrl,
    fullName: input.fullName,
    courseName: input.courseName,
    serial: input.serial,
    lang: input.lang,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  await sendTransactionalEmail({
    to: input.to,
    subject:
      input.lang === "ar"
        ? `مبروك! تم إصدار شهادتك (${input.serial})`
        : `Your certificate ${input.serial} is ready`,
    html,
    text,
    attachments: input.pdf
      ? [{ filename: `${input.serial}.pdf`, content: Buffer.from(input.pdf).toString("base64") }]
      : undefined,
  });
}

/**
 * Sends the "certificate issued" email for a student's certificate in a
 * course, exactly once per certificate: it sends only while `sent_at` is
 * still empty. Callers check who may ask; this runs with service-role access.
 */
export async function deliverCertificateEmail(input: {
  studentId: string;
  courseId: string;
  lang: Lang;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Load the certificate (must exist and be unsent)
  const { data: cert, error: certErr } = await supabaseAdmin
    .from("lms_certificates")
    .select("id, serial, sent_at, student_id, course_id")
    .eq("course_id", input.courseId)
    .eq("student_id", input.studentId)
    .maybeSingle();
  if (certErr) throw new Error(certErr.message);
  if (!cert) return { status: "no_certificate" as const };
  if (cert.sent_at) return { status: "already_sent" as const, sentAt: cert.sent_at };

  // Load recipient email + display name
  const { data: userRow, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
    input.studentId,
  );
  if (userErr || !userRow.user?.email) throw new Error("user_not_found");
  const email = userRow.user.email;
  const fullName =
    (userRow.user.user_metadata as { full_name?: string } | null)?.full_name || email.split("@")[0];

  // Load course name
  const { data: course } = await supabaseAdmin
    .from("lms_courses")
    .select("title_ar, title_en, certificate_pdf_enabled")
    .eq("id", input.courseId)
    .maybeSingle();
  const courseName =
    input.lang === "ar"
      ? course?.title_ar || course?.title_en || "Course"
      : course?.title_en || course?.title_ar || "Course";

  // With the course's certificate switch on, attach the PDF when the name and
  // wording to print are known. Any problem making it leaves the email as it was.
  let pdf: Uint8Array | undefined;
  if (course?.certificate_pdf_enabled) {
    try {
      const { ensureCertificatePdf, CERTIFICATE_BUCKET } = await import("./certificate-pdf.server");
      const admin = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
      const result = await ensureCertificatePdf(admin, cert.id);
      if (result.status === "ready") {
        pdf = result.pdf;
        if (!pdf) {
          const { data: file } = await admin.storage.from(CERTIFICATE_BUCKET).download(result.path);
          if (file) pdf = new Uint8Array(await file.arrayBuffer());
        }
      }
    } catch (e) {
      console.error("certificate pdf for email failed", e instanceof Error ? e.message : e);
    }
  }

  try {
    await sendCertificateIssuedEmail({
      to: email,
      fullName,
      courseName,
      serial: cert.serial,
      lang: input.lang,
      pdf,
    });
    await supabaseAdmin
      .from("lms_certificates")
      .update({ sent_at: new Date().toISOString(), email_error: null })
      .eq("id", cert.id)
      .is("sent_at", null);
    return { status: "sent" as const, serial: cert.serial };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("lms_certificates")
      .update({ email_error: msg.slice(0, 500) })
      .eq("id", cert.id);
    throw new Error(msg);
  }
}
