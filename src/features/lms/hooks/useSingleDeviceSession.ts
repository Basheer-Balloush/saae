import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SESSION_KEY = "lms-device-session-id";
const WARNED_KEY = "lms-device-session-warned";

// Phase 7B (Advisory) — we no longer force sign-out when another device
// logs in with the same account. The user is warned once per session so
// they can act if they didn't recognize the new device. This preserves
// the audit signal from `lms_register_session` / `lms_validate_session`
// while removing the disruptive hard-logout behavior.
export function useSingleDeviceSession(userId: string | null) {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const register = async () => {
      let sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
      }
      await supabase.rpc("lms_register_session", {
        _session_id: sessionId,
        _device: navigator.userAgent.slice(0, 100),
      } as never);
      sessionStorage.removeItem(WARNED_KEY);
      notifiedRef.current = false;
    };

    const validate = async () => {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) return;
      const { data } = await supabase.rpc("lms_validate_session", { _session_id: sessionId } as never);
      if (cancelled || data !== false) return;
      if (notifiedRef.current || sessionStorage.getItem(WARNED_KEY) === "1") return;
      notifiedRef.current = true;
      sessionStorage.setItem(WARNED_KEY, "1");
      toast.warning(
        "تم تسجيل الدخول إلى حسابك من جهاز آخر. إن لم يكن أنت، غيّر كلمة المرور فوراً.",
        { duration: 12000 },
      );
    };

    register().then(validate);
    const t = setInterval(validate, 60000);
    const onFocus = () => validate();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
}
