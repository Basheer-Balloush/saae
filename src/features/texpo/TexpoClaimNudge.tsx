import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n/i18n";
import { hasUnclaimedResult } from "./lib/play-store";

/* After sign-up the confirmation link lands on the learning platform, not on
   the game. A player with a finished, unclaimed Texpo result on this device
   who is now signed in gets one bar that takes them back to claim it. */
export function TexpoClaimNudge() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { lang, dir } = useLang();
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (pathname === "/texpo" || closed || !hasUnclaimedResult()) {
      setShow(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (alive) setShow(!!u && !u.is_anonymous);
    });
    return () => {
      alive = false;
    };
  }, [pathname, closed]);

  if (!show) return null;
  const ar = lang === "ar";
  return (
    <div
      dir={dir}
      role="status"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-cyan-300/40 bg-[#06232a] px-4 py-3 text-[#eafcff] shadow-2xl"
    >
      <Gift className="h-5 w-5 shrink-0 text-[#57e4ee]" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-bold">
        {ar ? "كوبونك من تحدّي تكسبو بانتظارك." : "Your Texpo challenge coupon is waiting."}
      </span>
      <a
        href="/texpo"
        className="shrink-0 rounded-full bg-[#57e4ee] px-4 py-2 text-sm font-extrabold text-[#03222a]"
      >
        {ar ? "استلمه" : "Claim it"}
      </a>
      <button
        type="button"
        onClick={() => setClosed(true)}
        className="shrink-0 text-[#eafcff]/70"
        aria-label={ar ? "إغلاق" : "Close"}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
