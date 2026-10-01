import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { LocationFields } from "./LocationFields";
import { EMPTY_LOCATION, checkLocation, locationErrorMessage, shouldPrompt } from "./lib/location";
import {
  dismissLocationPrompt,
  getMyLocationStatus,
  saveMyLocation,
} from "./lib/location.functions";

/* Asks a signed-in user who has not said where they live. "Later" hides it
   for a few days; after three times it stops (the profile keeps the field). */
export function LocationPrompt({ userId, lang }: { userId: string; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const fetchStatus = useServerFn(getMyLocationStatus);
  const save = useServerFn(saveMyLocation);
  const dismiss = useServerFn(dismissLocationPrompt);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_LOCATION);
  const [busy, setBusy] = useState<"save" | "later" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOpen(false);
    fetchStatus()
      .then((status) => {
        if (!cancelled) setOpen(shouldPrompt(status));
      })
      .catch(() => {
        /* Never block the page over this prompt. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fetchStatus]);

  if (!open) return null;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = checkLocation(draft);
    if ("missing" in checked) {
      toast.error(locationErrorMessage(lang, checked.missing));
      return;
    }
    setBusy("save");
    try {
      await save({ data: checked.location });
      toast.success(ar ? "شكراً، حفظنا مكان إقامتك" : "Thanks, your location is saved");
      setOpen(false);
    } catch {
      toast.error(ar ? "تعذّر الحفظ، حاول مجدداً" : "Couldn't save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const onLater = async () => {
    setBusy("later");
    setOpen(false);
    try {
      await dismiss();
    } catch {
      /* It simply asks again next time. */
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside
      className="location-prompt"
      role="dialog"
      aria-modal="false"
      aria-labelledby="location-prompt-title"
      dir={ar ? "rtl" : "ltr"}
    >
      <form onSubmit={onSave}>
        <h2 id="location-prompt-title">
          <MapPin aria-hidden="true" />
          <span>{ar ? "أين تقيم حالياً؟" : "Where do you live now?"}</span>
        </h2>
        <p>
          {ar
            ? "يساعدنا ذلك على إيصال التدريب والمشاريع إلى منطقتك. نحتاج المحافظة والمدينة فقط."
            : "It helps us bring training and projects to your area. We only need the governorate and city."}
        </p>
        <LocationFields value={draft} onChange={setDraft} lang={lang} idPrefix="loc-prompt" />
        <div className="location-prompt-actions">
          <button type="submit" className="action action-primary" disabled={busy !== null}>
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{ar ? "حفظ" : "Save"}</span>
          </button>
          <button
            type="button"
            className="action action-secondary"
            onClick={onLater}
            disabled={busy !== null}
          >
            <span>{ar ? "لاحقاً" : "Later"}</span>
          </button>
        </div>
      </form>
    </aside>
  );
}
