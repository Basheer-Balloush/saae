import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Download, Loader2, Printer } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCertificatePdfLink, getCertificatePdfState } from "@/lib/certificates/certificate-pdf.functions";
import { toUserMessage } from "@/lib/safe-error";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { SubHero } from "@/components/lms-skin/SubHero";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { currentLmsReturn } from "@/lib/lms-redirect";

export const Route = createFileRoute("/learning-management-system/certificate/$id")({
  head: () => ({
    meta: [
      { title: "Certificate — SAAE Training and Learning Platform" },
      // Owner-only page: search engines would only ever see the sign-in state.
      { name: "robots", content: "noindex" },
    ],
    links: LMS_SKIN_LINKS,
  }),
  component: CertificatePage,
});

type Cert = {
  id: string; serial: string; issued_at: string;
  course: { title_ar: string; title_en: string | null } | null;
  student_name: string;
};

function CertificatePage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const { user, loading: authLoading } = useLmsAuth();
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);

  // Certificates are readable by their owner only (RLS); anyone else checks a
  // serial on /verify. Wait for the session before querying.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCert(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data: c } = await supabase.from("lms_certificates")
        .select("id, serial, issued_at, course_id, student_id").eq("id", id).maybeSingle();
      if (c) {
        const [{ data: course }, { data: ins }] = await Promise.all([
          supabase.from("lms_courses").select("title_ar,title_en").eq("id", (c as { course_id: string }).course_id).maybeSingle(),
          supabase.from("lms_instructors").select("full_name").eq("user_id", (c as { student_id: string }).student_id).maybeSingle(),
        ]);
        setCert({
          id: c.id, serial: c.serial, issued_at: c.issued_at,
          course: course as { title_ar: string; title_en: string | null } | null,
          // Students have no lms_instructors row: fall back to the account name.
          student_name:
            ins?.full_name ||
            (user.user_metadata as { full_name?: string } | null)?.full_name ||
            (ar ? "الطالب" : "Student"),
        });
      } else {
        setCert(null);
      }
      setLoading(false);
    })();
  }, [id, user, authLoading, ar]);

  const crumbs = (
    <nav className="course-crumbs" aria-label={ar ? "أنت هنا" : "You are here"}>
      {user ? (
        <Link to="/learning-management-system/student">{tr.myCourses}</Link>
      ) : (
        <Link to="/learning-management-system/verify">{ar ? "التحقق من شهادة" : "Verify a certificate"}</Link>
      )}
      <span aria-hidden="true">/</span>
      <span>{tr.certificate}</span>
    </nav>
  );

  if (loading || authLoading || !cert) {
    const busy = loading || authLoading;
    return (
      <SubHero
        id="cert-title"
        titleSpans={[tr.certificate]}
        titleClassName="course-page-title"
        before={crumbs}
        copyChildren={
          <div className="state-box cert-state" style={{ marginTop: 28 }}>
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <p>
                  {user
                    ? ar
                      ? "لم نجد هذه الشهادة في حسابك."
                      : "This certificate isn't in your account."
                    : ar
                      ? "سجّل الدخول لعرض شهادتك. للتحقق من شهادة شخص آخر استخدم رقمها التسلسلي."
                      : "Sign in to view your certificate. To check someone else's, use its serial number."}
                </p>
                <p className="cert-state-actions">
                  {!user ? (
                    <Link
                      className="action action-primary"
                      to="/learning-management-system/login"
                      search={{ redirect: currentLmsReturn() }}
                    >
                      <span className="btn-content">
                        <span>{tr.signIn}</span>
                      </span>
                    </Link>
                  ) : null}
                  <Link className="action action-secondary" to="/learning-management-system/verify">
                    <span className="btn-content">
                      <span>{ar ? "التحقق برقم الشهادة" : "Verify by serial"}</span>
                    </span>
                  </Link>
                </p>
              </>
            )}
          </div>
        }
      />
    );
  }

  const courseTitle = cert.course ? (lang === "ar" ? cert.course.title_ar : cert.course.title_en || cert.course.title_ar) : "—";
  const date = new Date(cert.issued_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <SubHero
        id="cert-title"
        eyebrow={ar ? "الشهادات" : "Certificates"}
        titleSpans={[courseTitle]}
        titleClassName="course-page-title"
        before={crumbs}
        copyChildren={
          <p className="cert-print" style={{ marginTop: 26 }}>
            <button type="button" className="action action-secondary" onClick={() => window.print()}>
              <span className="btn-content">
                <Printer className="h-4 w-4" />
                <span>{tr.printCertificate}</span>
              </span>
            </button>
          </p>
        }
      />

      <CertificatePdfPanel certificateId={cert.id} ar={ar} />

      <section className="lms-section cert-section" aria-labelledby="cert-sheet-title">
        <div className="page-shell">
          <article className="cert-sheet">
            <Award className="cert-sheet-icon" aria-hidden="true" />
            <p className="cert-sheet-brand">{tr.brand}</p>
            <h2 id="cert-sheet-title">{tr.certificateOf}</h2>
            <p className="cert-sheet-lede">{tr.hasCompleted}:</p>
            <p className="cert-sheet-course">{courseTitle}</p>
            <p className="cert-sheet-name">{cert.student_name}</p>
            <dl className="cert-sheet-meta">
              <div>
                <dt>{tr.serial}</dt>
                <dd dir="ltr">{cert.serial}</dd>
              </div>
              <div>
                <dt>{tr.issuedOn}</dt>
                <dd>{date}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </>
  );
}

/* The PDF certificate, once the course has it switched on: the student
   confirms the name to print and the wording (male/female), then downloads. */
function CertificatePdfPanel({ certificateId, ar }: { certificateId: string; ar: boolean }) {
  const getState = useServerFn(getCertificatePdfState);
  const getLink = useServerFn(getCertificatePdfLink);
  const [state, setState] = useState<Awaited<ReturnType<typeof getCertificatePdfState>> | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getState({ data: { certificateId } })
      .then((s) => {
        setState(s);
        if (s.enabled) {
          setName(s.name);
          setGender(s.gender ?? "");
        }
      })
      .catch(() => setState(null));
  }, [certificateId, getState]);

  if (!state?.enabled) return null;

  const download = async () => {
    if (name.trim().length < 3 || !gender) {
      toast.error(ar ? "اكتب اسمك كما تريده على الشهادة واختر الصيغة." : "Enter your name as it should appear and choose the wording.");
      return;
    }
    setBusy(true);
    try {
      const res = await getLink({ data: { certificateId, name: name.trim(), gender } });
      if (res.status === "ready") window.location.href = res.url;
      else if (res.status === "course_dates_missing")
        toast.error(ar ? "لم تُحدَّد تواريخ الدورة بعد. تواصل مع إدارة الدورة." : "The course dates are not set yet. Please contact the course team.");
      else if (res.status === "error" && res.message)
        toast.error(`${ar ? "تعذّر إنشاء الشهادة" : "Certificate failed"}: ${res.message}`, { duration: 20_000 });
      else toast.error(ar ? "تعذّر تجهيز الشهادة الآن." : "The certificate could not be prepared right now.");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="lms-section" aria-labelledby="cert-pdf-title">
      <div className="page-shell" style={{ maxWidth: 640 }}>
        <h2 id="cert-pdf-title" style={{ fontWeight: 800, fontSize: "1.2rem" }}>
          {ar ? "شهادتك بصيغة PDF" : "Your certificate as a PDF"}
        </h2>
        {state.preview && (
          <p style={{ marginTop: 6, fontSize: ".85rem", opacity: 0.75 }}>
            {ar ? "معاينة للمشرف: الشهادة غير مفعّلة لطلاب هذه الدورة بعد." : "Admin preview: the certificate is not on for this course's students yet."}
          </p>
        )}
        {!state.datesReady ? (
          <p style={{ marginTop: 12 }}>
            {ar ? "ستتوفر الشهادة عند تحديد تواريخ الدورة." : "The certificate will be available once the course dates are set."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>{ar ? "الاسم كما سيظهر على الشهادة" : "Your name as it will appear on the certificate"}</span>
              <input
                className="field-input"
                dir="rtl"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid currentColor", background: "transparent" }}
              />
            </label>
            <fieldset style={{ display: "flex", gap: 18, border: 0, padding: 0 }}>
              <legend style={{ marginBottom: 6 }}>{ar ? "صيغة الشهادة" : "Certificate wording"}</legend>
              <label><input type="radio" name="cert-gender" checked={gender === "male"} onChange={() => setGender("male")} /> {ar ? "مذكّر" : "Male"}</label>
              <label><input type="radio" name="cert-gender" checked={gender === "female"} onChange={() => setGender("female")} /> {ar ? "مؤنّث" : "Female"}</label>
            </fieldset>
            <p>
              <button type="button" className="action action-primary" disabled={busy} onClick={download}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {ar ? "تحميل الشهادة (PDF)" : "Download certificate (PDF)"}
              </button>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
