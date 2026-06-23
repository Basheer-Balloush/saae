import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SESSION_KEY = "lms-device-session-id";

/**
 * Single-device login enforcement. When the user signs in, we register a
 * new session id in the DB. The current device stores that id in localStorage.
 * Every 30s we validate. If another device logs in, ours will be rejected.
 */
export function useSingleDeviceSession(userId: string | null) {
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
      } as any);
    };

    const validate = async () => {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) return;
      const { data } = await supabase.rpc("lms_validate_session", { _session_id: sessionId } as any);
      if (!cancelled && data === false) {
        localStorage.removeItem(SESSION_KEY);
        toast.error("تم تسجيل الدخول من جهاز آخر. سيتم إنهاء جلستك.");
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = "/learning-management-system/login";
        }, 1500);
      }
    };

    register().then(validate);
    const t = setInterval(validate, 30000);
    const onFocus = () => validate();
    window.addEventListener("focus", onFocus);

    return () => { cancelled = true; clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [userId]);
}
