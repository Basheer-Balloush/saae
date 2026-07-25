import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ShieldX, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/learning-management-system/verify")({
  head: () => ({ meta: [{ title: "LMS · Verify certificate" }] }),
  component: VerifyPage,
});

const MAX_SERIAL_LENGTH = 128;

type VerifiedCertificate = {
  serial: string;
  issued_at: string;
  course_title_ar: string;
  course_title_en: string;
};

type VerifyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; cert: VerifiedCertificate }
  | { status: "invalid" }
  | { status: "error" };

function VerifyPage() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [serial, setSerial] = useState("");
  const [state, setState] = useState<VerifyState>({ status: "idle" });

  const loading = state.status === "loading";
  const trimmed = serial.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_SERIAL_LENGTH && !loading;

  const run = async () => {
    if (!canSubmit) return;
    // Clear any stale result before starting a new verification.
    setState({ status: "loading" });
    try {
      const { data, error } = await supabase.rpc("verify_certificate", {
        _serial: trimmed,
      });
      if (error) {
        setState({ status: "error" });
        return;
      }
      const row = data?.[0];
      if (!row || !row.is_valid) {
        setState({ status: "invalid" });
        return;
      }
      setState({
        status: "valid",
        cert: {
          serial: row.serial,
          issued_at: row.issued_at,
          course_title_ar: row.course_title_ar,
          course_title_en: row.course_title_en,
        },
      });
    } catch {
      setState({ status: "error" });
    }
  };

  const courseTitle = (cert: VerifiedCertificate) =>
    lang === "ar" ? cert.course_title_ar : cert.course_title_en || cert.course_title_ar;

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
          aria-label={tr.enterSerial}
          value={serial}
          maxLength={MAX_SERIAL_LENGTH}
          disabled={loading}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
        />
        <Button onClick={() => void run()} disabled={!canSubmit} size="lg">
          {loading && <Loader2 className="h-4 w-4 animate-spin mx-2" aria-hidden="true" />}
          {tr.verify}
        </Button>
      </div>

      <div aria-live="polite">
        {state.status === "valid" && (
          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-3 text-primary font-bold">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              {tr.verifyValid}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-4">
                <dt className="text-muted-foreground">{tr.serial}</dt>
                <dd className="font-mono text-foreground break-all">{state.cert.serial}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-4">
                <dt className="text-muted-foreground">{tr.aboutCourse}</dt>
                <dd className="font-semibold text-foreground break-words" dir="auto">
                  {courseTitle(state.cert)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-4">
                <dt className="text-muted-foreground">{tr.issuedOn}</dt>
                <dd className="text-foreground">
                  {new Date(state.cert.issued_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {state.status === "invalid" && (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-center gap-3 text-destructive font-bold">
              <ShieldX className="h-5 w-5" aria-hidden="true" />
              {tr.verifyInvalid}
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-6">
            <div className="flex items-center gap-3 font-bold text-foreground">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              {tr.verifyError}
            </div>
            <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void run()} disabled={!canSubmit}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {tr.verifyRetry}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
