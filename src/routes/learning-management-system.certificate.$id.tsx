import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/learning-management-system/certificate/$id")({
  head: () => ({ meta: [{ title: "LMS · Certificate" }] }),
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

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  if (!cert) return <p className="text-center py-20 text-muted-foreground">Not found</p>;

  const courseTitle = cert.course ? (lang === "ar" ? cert.course.title_ar : cert.course.title_en || cert.course.title_ar) : "—";
  const date = new Date(cert.issued_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={() => window.print()} variant="outline"><Printer className="h-4 w-4 mx-1" />{tr.printCertificate}</Button>
      </div>

      <div className="relative rounded-3xl border-[3px] border-primary/30 bg-gradient-to-br from-card via-background to-card p-12 sm:p-16 text-center shadow-soft print:shadow-none print:border-primary">
        <div className="absolute inset-4 border border-primary/20 rounded-2xl pointer-events-none" />
        <Award className="mx-auto h-16 w-16 text-primary" />
        <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">{tr.brand}</div>
        <h1 className="mt-6 text-3xl sm:text-5xl font-bold text-foreground">{tr.certificateOf}</h1>
        <p className="mt-8 text-base text-muted-foreground">{tr.hasCompleted}:</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-primary">{courseTitle}</h2>
        <p className="mt-8 text-lg text-foreground font-semibold">{cert.student_name}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div><div className="font-semibold text-foreground">{tr.serial}</div><div className="mt-1 font-mono">{cert.serial}</div></div>
          <div><div className="font-semibold text-foreground">{tr.issuedOn}</div><div className="mt-1">{date}</div></div>
        </div>
      </div>
    </div>
  );
}
