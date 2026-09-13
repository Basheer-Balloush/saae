import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ShieldX, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { SubHero } from "@/components/lms-skin/SubHero";
import { IconCertificate } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/verify")({
  head: () => ({ meta: [{ title: "LMS · Verify certificate" }], links: LMS_SKIN_LINKS }),
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
  const ar = lang === "ar";
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
    <>
      <SubHero
        id="verify-title"
        eyebrow={ar ? "الشهادات" : "Certificates"}
        titleSpans={ar ? ["تحقّق", "من أي شهادة"] : ["Verify", "any certificate"]}
        lede={
          ar
            ? "أدخل الرقم التسلسليّ للتأكّد من صحّة الشهادة — كل شهادة صادرة عن الجمعية تحمل رمز تحقق فريداً يمكن لأصحاب العمل التأكد منه خلال ثوانٍ."
            : "Enter the serial number to confirm a certificate — every SAAE certificate carries a unique code employers can check in seconds."
        }
      >
        <form
          className="verify-card"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <label htmlFor="cert-serial">{ar ? "الرقم التسلسلي للشهادة" : "Certificate serial number"}</label>
          <input
            id="cert-serial"
            type="text"
            autoComplete="off"
            dir="ltr"
            placeholder={tr.enterSerial}
            value={serial}
            maxLength={MAX_SERIAL_LENGTH}
            disabled={loading}
            onChange={(e) => setSerial(e.target.value)}
          />
          <button type="submit" disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {tr.verify}
          </button>
        </form>
      </SubHero>

      <section className="lms-section verify-results" aria-label={tr.verifyTitle}>
        <div className="page-shell" aria-live="polite">
          {state.status === "valid" && (
            <article className="cert-card verify-result">
              <IconCertificate />
              <p className="verify-status">
                <ShieldCheck aria-hidden="true" />
                {tr.verifyValid}
              </p>
              <h3 dir="auto">{courseTitle(state.cert)}</h3>
              <dl className="course-facts">
                <div>
                  <dt>{tr.serial}</dt>
                  <dd className="cert-code" dir="ltr">
                    {state.cert.serial}
                  </dd>
                </div>
                <div>
                  <dt>{tr.issuedOn}</dt>
                  <dd>{new Date(state.cert.issued_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</dd>
                </div>
              </dl>
            </article>
          )}

          {state.status === "invalid" && (
            <div className="enroll-note is-invalid verify-result">
              <ShieldX aria-hidden="true" />
              {tr.verifyInvalid}
            </div>
          )}

          {state.status === "error" && (
            <div className="enroll-note is-closed verify-result">
              <AlertTriangle aria-hidden="true" />
              {tr.verifyError}
              <button type="button" className="action action-secondary" onClick={() => void run()} disabled={!canSubmit}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {tr.verifyRetry}
              </button>
            </div>
          )}

          {(state.status === "idle" || state.status === "loading") && (
            <p className="verify-note">
              {ar
                ? "التحقق متاح لأصحاب العمل والجهات — أدخل الرقم كما يظهر على الشهادة."
                : "Verification is open to employers and organisations — enter the number exactly as it appears on the certificate."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
