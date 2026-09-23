/* Turns a certificate into a stored PDF.
 *
 * The page comes from renderCertificateHtml; Cloudflare's Browser Rendering
 * prints it (REST API, so no browser package in the Worker). That browser
 * loads the template image from the live site (/lms/certificates/template.png).
 * The Cairo fonts are embedded in the page instead: the site serves them
 * without cross-origin headers, and the renderer's page has no origin of its
 * own, so a linked font would be dropped for a fallback face.
 *
 * A PDF is made once per certificate and stored in the private
 * lms-certificates bucket as <certificate id>.pdf. It is made again only when
 * the name or wording it was made with changes.
 */
import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/email-delivery.server";
import { renderCertificateHtml, type CertificateGender } from "./certificate-html";

export const CERTIFICATE_BUCKET = "lms-certificates";

const fontCache = new Map<string, Promise<string>>();

function fontDataUrl(url: string): Promise<string> {
  let cached = fontCache.get(url);
  if (!cached) {
    cached = fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`certificate_font_unavailable ${res.status}`);
      return `data:font/ttf;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    });
    cached.catch(() => fontCache.delete(url));
    fontCache.set(url, cached);
  }
  return cached;
}

async function assetUrls() {
  const base = (process.env.CERTIFICATE_ASSETS_URL || getSiteUrl()).replace(/\/$/, "");
  const [regular, bold] = await Promise.all([
    fontDataUrl(`${base}/cinematic/fonts/cairo-arabic-400.ttf`),
    fontDataUrl(`${base}/cinematic/fonts/cairo-arabic-700.ttf`),
  ]);
  return { templateUrl: `${base}/lms/certificates/template.png`, fontUrls: { regular, bold } };
}

export async function renderCertificatePdf(html: string): Promise<Uint8Array> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_BROWSER_TOKEN;
  if (!account || !token) throw new Error("certificate_renderer_not_configured");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/pdf`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        gotoOptions: { waitUntil: "networkidle0", timeout: 30_000 },
        pdfOptions: {
          format: "a4",
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`certificate_render_failed ${res.status}: ${detail}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export type CertificatePdfResult =
  | { status: "ready"; path: string; serial: string; pdf?: Uint8Array }
  | { status: "needs_details"; name: string | null; gender: CertificateGender | null }
  | { status: "course_dates_missing" }
  | { status: "not_found" };

/* The PDF for one certificate, made if it is missing or its name or wording
   changed. `details` are the name and wording to use; without them the ones
   already on the certificate or the student's profile are used. */
export async function ensureCertificatePdf(
  admin: SupabaseClient,
  certificateId: string,
  details: { name?: string; gender?: CertificateGender } = {},
): Promise<CertificatePdfResult> {
  const { data: cert } = await admin
    .from("lms_certificates")
    .select("id, serial, issued_at, course_id, student_id, recipient_name, recipient_gender, pdf_path")
    .eq("id", certificateId)
    .maybeSingle();
  if (!cert) return { status: "not_found" };

  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("lms_courses").select("title_ar, start_date, end_date").eq("id", cert.course_id).maybeSingle(),
    admin.from("lms_user_profiles").select("full_name, certificate_name, gender").eq("user_id", cert.student_id).maybeSingle(),
  ]);
  if (!course?.start_date || !course?.end_date) return { status: "course_dates_missing" };

  const name = (details.name ?? cert.recipient_name ?? profile?.certificate_name ?? profile?.full_name ?? "").trim() || null;
  const gender = (details.gender ?? cert.recipient_gender ?? profile?.gender ?? null) as CertificateGender | null;
  if (!name || !gender) return { status: "needs_details", name, gender };

  if (cert.pdf_path && name === cert.recipient_name && gender === cert.recipient_gender) {
    return { status: "ready", path: cert.pdf_path, serial: cert.serial };
  }

  const html = renderCertificateHtml({
    name,
    gender,
    serial: cert.serial,
    courseTitleAr: course.title_ar,
    startDate: course.start_date,
    endDate: course.end_date,
    issuedAt: cert.issued_at,
    ...(await assetUrls()),
  });

  try {
    const pdf = await renderCertificatePdf(html);
    const path = `${cert.id}.pdf`;
    const { error: upErr } = await admin.storage
      .from(CERTIFICATE_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);
    await admin
      .from("lms_certificates")
      .update({
        recipient_name: name,
        recipient_gender: gender,
        pdf_path: path,
        pdf_generated_at: new Date().toISOString(),
        pdf_error: null,
      })
      .eq("id", cert.id);
    return { status: "ready", path, serial: cert.serial, pdf };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("lms_certificates").update({ pdf_error: msg.slice(0, 500) }).eq("id", cert.id);
    throw e;
  }
}

/* A sample for the course editor: the real course, a placeholder name. */
export async function renderCoursePreviewPdf(
  admin: SupabaseClient,
  courseId: string,
  gender: CertificateGender,
): Promise<Uint8Array | "course_dates_missing"> {
  const { data: course } = await admin
    .from("lms_courses")
    .select("title_ar, start_date, end_date")
    .eq("id", courseId)
    .maybeSingle();
  if (!course?.start_date || !course?.end_date) return "course_dates_missing";
  return renderCertificatePdf(
    renderCertificateHtml({
      name: gender === "female" ? "اسم الطالبة الكامل" : "اسم الطالب الكامل",
      gender,
      serial: "C.TR.0.0",
      courseTitleAr: course.title_ar,
      startDate: course.start_date,
      endDate: course.end_date,
      issuedAt: new Date().toISOString(),
      ...(await assetUrls()),
    }),
  );
}
