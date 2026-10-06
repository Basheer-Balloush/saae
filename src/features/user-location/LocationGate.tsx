import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogOut, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LmsPortalSkin } from "@/components/ui/lms-portal-skin";
import { CITY_MAX, SYRIA_GOVERNORATES } from "@/lib/syria-governorates";
import { EMPTY_LOCATION, checkLocation, locationErrorMessage } from "./lib/location";
import { getMyLocationStatus, saveMyLocation } from "./lib/location.functions";

/* Accounts known to have a location in this tab, so moving between pages
   does not ask the server again. */
const answered = new Set<string>();

/* A signed-in user with no location must give one before using the
   platform. It cannot be dismissed, only answered or signed out of. If the
   check itself fails, nothing is blocked. Styled with Tailwind so it works
   in the LMS pages and the admin console alike. */
export function LocationGate({ userId, lang }: { userId: string; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const fetchStatus = useServerFn(getMyLocationStatus);
  const save = useServerFn(saveMyLocation);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_LOCATION);
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (answered.has(userId)) return;
    let cancelled = false;
    fetchStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.location) answered.add(userId);
        else setOpen(true);
      })
      .catch(() => {
        /* Never lock anyone out because the check failed. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fetchStatus]);

  useEffect(() => {
    if (!open) return;
    /* Phones scroll the root element, so hiding overflow on <body> alone
       still let a swipe scroll the page behind the form. */
    const root = document.documentElement;
    const overflow = [root.style.overflow, document.body.style.overflow];
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    firstField.current?.focus();
    return () => {
      root.style.overflow = overflow[0];
      document.body.style.overflow = overflow[1];
    };
  }, [open]);

  if (!open) return null;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = checkLocation(draft);
    if ("missing" in checked) {
      toast.error(locationErrorMessage(lang, checked.missing));
      return;
    }
    setBusy(true);
    try {
      await save({ data: checked.location });
      answered.add(userId);
      setOpen(false);
      toast.success(ar ? "شكراً، حفظنا مكان إقامتك" : "Thanks, your location is saved");
    } catch {
      toast.error(ar ? "تعذّر الحفظ، حاول مجدداً" : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/learning-management-system/login");
  };

  const abroad = draft.governorate === "abroad";
  const field =
    "h-12 w-full min-w-0 rounded-xl border border-[rgba(184,232,240,0.16)] bg-[rgba(2,16,20,0.6)] px-4 text-[15px] text-[#fefdfc] outline-none [color-scheme:dark] focus:border-[#008b9d] focus:ring-2 focus:ring-[rgba(0,139,157,0.25)]";
  const label = "mb-1.5 block text-[13px] font-bold text-[rgba(254,253,252,0.8)]";

  /* Portalled to <body>. Inside the LMS page's <main> (position: relative;
     z-index: 1) the overlay's z-index only counted within main, so the site
     footer painted over the whole form once the page behind reached it. */
  return createPortal(
    <LmsPortalSkin>
      <div
        className="fixed inset-0 z-[1000] grid place-items-center bg-[rgba(2,12,15,0.78)] p-4 backdrop-blur-sm"
        dir={ar ? "rtl" : "ltr"}
      >
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-gate-title"
          onSubmit={onSave}
          className="max-h-[calc(100vh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-[rgba(184,232,240,0.16)] bg-[#06232a] p-6 text-[#fefdfc] shadow-2xl"
          style={{ fontFamily: '"Cairo", Arial, sans-serif' }}
        >
          <h2
            id="location-gate-title"
            className="flex items-center gap-2 text-[19px] font-extrabold"
          >
            <MapPin className="h-5 w-5 shrink-0 text-[#14a3b4]" aria-hidden="true" />
            {ar ? "أين تقيم حالياً؟" : "Where do you live now?"}
          </h2>
          <div className="mt-1.5 mb-5 text-[14px] leading-relaxed text-[rgba(254,253,252,0.72)]">
            {ar
              ? "نحتاج المحافظة والمدينة فقط، لنوصل التدريب والمشاريع إلى منطقتك. تكتبها مرة واحدة ويمكنك تعديلها من ملفك الشخصي."
              : "We only need the governorate and city, to bring training and projects to your area. You give it once and can change it from your profile."}
          </div>

          <label htmlFor="gate-governorate" className={label}>
            {ar ? "المحافظة التي تقيم فيها" : "Governorate you live in"}
          </label>
          <select
            id="gate-governorate"
            ref={firstField}
            required
            className={field}
            value={draft.governorate}
            onChange={(e) => setDraft({ ...draft, governorate: e.target.value })}
          >
            <option value="">{ar ? "اختر المحافظة" : "Choose a governorate"}</option>
            {SYRIA_GOVERNORATES.map((g) => (
              <option key={g.key} value={g.key} className="bg-[#06232a]">
                {g[lang]}
              </option>
            ))}
          </select>

          <div className="h-4" aria-hidden="true" />
          <label htmlFor="gate-city" className={label}>
            {abroad
              ? ar
                ? "الدولة والمدينة"
                : "Country and city"
              : ar
                ? "المدينة أو البلدة"
                : "City or town"}
          </label>
          <input
            id="gate-city"
            type="text"
            required
            dir="auto"
            maxLength={CITY_MAX}
            autoComplete="address-level2"
            className={field}
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            placeholder={
              abroad
                ? ar
                  ? "مثال: تركيا – إسطنبول"
                  : "e.g. Turkey – Istanbul"
                : ar
                  ? "مثال: ببيلا"
                  : "e.g. Babbila"
            }
          />

          <div className="h-6" aria-hidden="true" />
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#008b9d] text-[15px] font-extrabold text-white transition-colors hover:bg-[#0a9fb2] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {ar ? "حفظ والمتابعة" : "Save and continue"}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="mx-auto mt-3 flex items-center gap-1.5 text-[13px] font-bold text-[rgba(254,253,252,0.6)] hover:text-[#fefdfc]"
          >
            <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {ar ? "تسجيل الخروج" : "Sign out"}
          </button>
        </form>
      </div>
    </LmsPortalSkin>,
    document.body,
  );
}
