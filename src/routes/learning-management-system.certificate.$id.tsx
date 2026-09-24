import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { SubHero } from "@/components/lms-skin/SubHero";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/certificate/$id")({
  head: () => ({ meta: [{ title: "LMS · Certificate" }], links: LMS_SKIN_LINKS }),
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
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          student_name: ins?.full_name ?? "Student",
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const crumbs = (
    <nav className="course-crumbs" aria-label={ar ? "أنت هنا" : "You are here"}>
      <Link to="/learning-management-system/student">{tr.myCourses}</Link>
      <span aria-hidden="true">/</span>
      <span>{tr.certificate}</span>
    </nav>
  );

  if (loading || !cert) {
    return (
      <SubHero
        id="cert-title"
        titleSpans={[tr.certificate]}
        titleClassName="course-page-title"
        before={crumbs}
        copyChildren={
          <p className="state-box" style={{ marginTop: 28 }}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : ar ? "الشهادة غير موجودة" : "Not found"}
          </p>
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
