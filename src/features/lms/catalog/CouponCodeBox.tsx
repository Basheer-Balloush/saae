import { useState } from "react";
import { Loader2 } from "lucide-react";
import { couponErrorMessage, normalizeCode } from "@/features/lms/lib/coupons";
import { redeemRecognitionCode } from "@/features/lms/lib/coupons-db";

/** The coupon field for a learner who is past the enrollment form: their
    request is waiting, or they are enrolled. Only a recognition code can still
    be used then (what they owe does not change); a discount code is refused
    with a message. The code waits for an admin before it takes effect. */
export function CouponCodeBox({
  courseId,
  ar,
  onWaiting,
  onRecognized,
}: {
  courseId: string;
  ar: boolean;
  /** The code was accepted and now waits for an admin. */
  onWaiting: () => void;
  /** Only from a database that still applies a code at once. */
  onRecognized: (certificateId: string | null) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const use = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizeCode(code) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await redeemRecognitionCode(courseId, code);
      if (!res.ok) setError(couponErrorMessage(res.error, ar));
      else if (res.status === "recognized") onRecognized(res.certificate_id);
      else onWaiting();
    } catch (err) {
      setError(couponErrorMessage(err instanceof Error ? err.message : null, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="enroll-code" onSubmit={use}>
      <label htmlFor="course-coupon">{ar ? "كود الكوبون" : "Coupon code"}</label>
      <div className="enroll-code-row">
        <input
          id="course-coupon"
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
