import { useState } from "react";
import { Loader2 } from "lucide-react";
import { couponErrorMessage, normalizeCode } from "@/features/lms/lib/coupons";
import { redeemRecognitionCode } from "@/features/lms/lib/coupons-db";

/** A learner who attended the course elsewhere enters their recognition code
    here: while their request is still waiting, or once enrolled (then what
    they owe does not change). */
export function RecognitionCodeBox({
  courseId,
  ar,
  onRecognized,
}: {
  courseId: string;
  ar: boolean;
  onRecognized: (certificateId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="enroll-code-toggle" onClick={() => setOpen(true)}>
        {ar ? "لديك كود اعتراف بإكمال الدورة؟" : "Have a course recognition code?"}
      </button>
    );
  }

  const use = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizeCode(code) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await redeemRecognitionCode(courseId, code);
      if (!res.ok) setError(couponErrorMessage(res.error, ar));
      else if (res.status === "recognized") onRecognized(res.certificate_id);
    } catch (err) {
      setError(couponErrorMessage(err instanceof Error ? err.message : null, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="enroll-code" onSubmit={use}>
      <label htmlFor="recognition-code">{ar ? "كود الاعتراف" : "Recognition code"}</label>
      <div className="enroll-code-row">
        <input
          id="recognition-code"
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
        />
        <button
          type="submit"
          className="action action-primary"
          disabled={busy || !normalizeCode(code)}
        >
          <span className="btn-content">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{ar ? "استخدام الكود" : "Use code"}</span>
          </span>
        </button>
      </div>
      {error && (
        <p className="enroll-code-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
