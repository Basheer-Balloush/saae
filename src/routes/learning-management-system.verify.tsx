import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ShieldX, Loader2, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/learning-management-system/verify")({
  head: () => ({ meta: [{ title: "LMS · Verify certificate" }] }),
  component: VerifyPage,
});

type Found = {
  id: string;
  serial: string;
  issued_at: string;
  course_id: string;
  student_id: string;
  course_title?: string;
};

function VerifyPage() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; cert?: Found } | null>(null);

  const run = async () => {
    if (!serial.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await supabase
        .from("lms_certificates")
        .select("id,serial,issued_at,course_id,student_id")
        .eq("serial", serial.trim())
        .maybeSingle();
      if (!data) {
        setResult({ ok: false });
      } else {
        const { data: c } = await supabase
          .from("lms_courses")
          .select("title_ar,title_en")
          .eq("id", data.course_id)
          .maybeSingle();
        setResult({
          ok: true,
          cert: {
            ...(data as Found),
            course_title: c ? (lang === "ar" ? c.title_ar : c.title_en || c.title_ar) : "",
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-20">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-foreground">{tr.verifyTitle}</h1>
        <p className="mt-2 text-muted-foreground">{tr.verifySubtitle}</p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={tr.enterSerial}
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <Button onClick={run} disabled={loading || !serial.trim()} size="lg">
          {loading && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
          {tr.verify}
        </Button>
      </div>

      {result && result.ok && result.cert && (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-3 text-primary font-bold">
            <ShieldCheck className="h-5 w-5" />
            {tr.verifyValid}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{tr.serial}</dt>
              <dd className="font-mono text-foreground">{result.cert.serial}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{tr.aboutCourse}</dt>
              <dd className="font-semibold text-foreground">{result.cert.course_title}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{tr.issuedOn}</dt>
              <dd className="text-foreground">
                {new Date(result.cert.issued_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
              </dd>
            </div>
          </dl>
          <Link
            to="/learning-management-system/certificate/$id"
            params={{ id: result.cert.id }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Award className="h-4 w-4" />
            {tr.viewCertificate}
          </Link>
        </div>
      )}

      {result && !result.ok && (
        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3 text-destructive font-bold">
            <ShieldX className="h-5 w-5" />
            {tr.verifyInvalid}
          </div>
        </div>
      )}
    </div>
  );
}
