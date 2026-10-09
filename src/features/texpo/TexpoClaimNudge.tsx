import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n/i18n";
import { texpoFindMine } from "./lib/texpo.functions";
import { hasUnclaimedResult, knownWaiting, rememberWaiting } from "./lib/play-store";

/* After sign-up the confirmation link lands on the learning platform, not on
   the game. A signed-in player with a finished, unclaimed Texpo result gets
   one bar that takes them back to claim it: a result saved on this device,
   or one the server finds by the account's email (played on another phone,
   or before the account existed). */
export function TexpoClaimNudge() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { lang, dir } = useLang();
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(false);

  const findMine = useServerFn(texpoFindMine);

  useEffect(() => {
    if (pathname === "/texpo" || closed) {
      setShow(false);
      return;
    }
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u || u.is_anonymous) {
        if (alive) setShow(false);
        return;
      }
      if (hasUnclaimedResult()) {
        if (alive) setShow(true);
        return;
      }
      let waiting = knownWaiting(u.id);
      if (waiting === null) {
        waiting = !!(await findMine({}).catch(() => null));
        rememberWaiting(u.id, waiting);
      }
      if (alive) setShow(waiting);
    });
    return () => {
      alive = false;
    };
  }, [pathname, closed, findMine]);

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
        {ar ? "هديتك من تحدّي تكسبو بانتظارك." : "Your Texpo challenge gift is waiting."}
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
