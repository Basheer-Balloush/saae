import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LocationFields } from "./LocationFields";
import { EMPTY_LOCATION, checkLocation, locationErrorMessage } from "./lib/location";
import { getMyLocationStatus, saveMyLocation } from "./lib/location.functions";

/* The profile's "where do you live" card. */
export function LocationCard({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const fetchStatus = useServerFn(getMyLocationStatus);
  const save = useServerFn(saveMyLocation);
  const [draft, setDraft] = useState(EMPTY_LOCATION);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.location) setDraft(status.location);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchStatus]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = checkLocation(draft);
    if ("missing" in checked) {
      toast.error(locationErrorMessage(lang, checked.missing));
      return;
    }
    setSaving(true);
    try {
      await save({ data: checked.location });
      setDraft(checked.location);
      toast.success(ar ? "حُفظ مكان الإقامة" : "Location saved");
    } catch {
      toast.error(ar ? "تعذّر الحفظ، حاول مجدداً" : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="pro-card" id="profile-location">
      <h2>{ar ? "مكان الإقامة" : "Where you live"}</h2>
      {!loaded ? (
        <p className="state-box">
          <Loader2 className="h-5 w-5 animate-spin" />
        </p>
      ) : (
        <form onSubmit={onSubmit} className="form-grid">
          <LocationFields value={draft} onChange={setDraft} lang={lang} idPrefix="profile-loc" />
          <div className="form-actions span-2">
            <button type="submit" className="action action-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{ar ? "حفظ" : "Save"}</span>
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
