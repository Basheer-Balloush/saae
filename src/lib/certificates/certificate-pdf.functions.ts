import { Buffer } from "node:buffer";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const gender = z.enum(["male", "female"]);

async function isLmsAdmin(supabase: { rpc: Function }, userId: string): Promise<boolean> {
  // admin or lms_admin, the same as the LMS pages' own admin check.
  const { data } = await supabase.rpc("is_lms_admin", { _user_id: userId });
  return Boolean(data);
}

/**
 * A short-lived download link for a certificate's PDF, making the PDF first
 * if needed. The student may pass the name and wording to print; they are
 * kept on their profile for later certificates. Students only get a PDF once
 * the course's certificate switch is on; admins always can.
 */
export const getCertificatePdfLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        certificateId: z.string().uuid(),
        name: z.string().trim().min(3).max(120).optional(),
        gender: gender.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureCertificatePdf, CERTIFICATE_BUCKET } = await import("./certificate-pdf.server");
    const admin = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;

    const { data: cert } = await admin
      .from("lms_certificates")
      .select("id, student_id, course_id")
      .eq("id", data.certificateId)
      .maybeSingle();
    if (!cert) return { status: "not_found" as const };

    const isOwner = cert.student_id === context.userId;
    const isAdmin = !isOwner && (await isLmsAdmin(context.supabase, context.userId));
    if (!isOwner && !isAdmin) throw new Error("forbidden");

    if (!isAdmin) {
      const { data: course } = await admin
        .from("lms_courses")
        .select("certificate_pdf_enabled")
        .eq("id", cert.course_id)
        .maybeSingle();
      if (!course?.certificate_pdf_enabled) return { status: "disabled" as const };
    }

    if (isOwner && (data.name || data.gender)) {
      await admin
        .from("lms_user_profiles")
        .upsert(
          {
            user_id: context.userId,
            ...(data.name ? { certificate_name: data.name } : {}),
            ...(data.gender ? { gender: data.gender } : {}),
          },
          { onConflict: "user_id" },
        );
    }

    const result = await ensureCertificatePdf(admin, cert.id, { name: data.name, gender: data.gender });
    if (result.status !== "ready") return result;

    const { data: signed, error } = await admin.storage
      .from(CERTIFICATE_BUCKET)
      .createSignedUrl(result.path, 600, { download: `${result.serial}.pdf` });
    if (error || !signed) throw new Error(error?.message ?? "signed_url_failed");
    return { status: "ready" as const, url: signed.signedUrl };
  });

/** What the certificate page needs to show the PDF option and prefill it. */
export const getCertificatePdfState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ certificateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
    const { data: cert } = await admin
      .from("lms_certificates")
      .select("id, student_id, course_id, recipient_name, recipient_gender")
      .eq("id", data.certificateId)
      .maybeSingle();
    if (!cert) return { enabled: false as const };
    const isOwner = cert.student_id === context.userId;
    const isAdmin = !isOwner && (await isLmsAdmin(context.supabase, context.userId));
    if (!isOwner && !isAdmin) return { enabled: false as const };

    const [{ data: course }, { data: profile }] = await Promise.all([
      admin.from("lms_courses").select("certificate_pdf_enabled, start_date, end_date").eq("id", cert.course_id).maybeSingle(),
      admin.from("lms_user_profiles").select("full_name, certificate_name, gender").eq("user_id", cert.student_id).maybeSingle(),
    ]);
    const enabled = Boolean(course?.certificate_pdf_enabled) || isAdmin;
    return {
      enabled,
      preview: isAdmin && !course?.certificate_pdf_enabled,
      datesReady: Boolean(course?.start_date && course?.end_date),
      name: (cert.recipient_name ?? profile?.certificate_name ?? profile?.full_name ?? "") as string,
      gender: (cert.recipient_gender ?? profile?.gender ?? null) as "male" | "female" | null,
    };
  });

/**
 * A sample certificate for the course editor, with the real course name and
 * dates and a placeholder student name, returned as base64. Nothing is stored.
 */
export const previewCourseCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ courseId: z.string().uuid(), gender }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Admins only while the PDF certificate is being tested.
    if (!(await isLmsAdmin(context.supabase, context.userId))) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderCoursePreviewPdf } = await import("./certificate-pdf.server");
    const pdf = await renderCoursePreviewPdf(
      supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient,
      data.courseId,
      data.gender,
    );
    if (pdf === "course_dates_missing") return { status: "course_dates_missing" as const };
    return { status: "ready" as const, base64: Buffer.from(pdf).toString("base64") };
  });
