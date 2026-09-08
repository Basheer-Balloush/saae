import { useEffect, useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Instructor = {
  user_id: string;
  full_name: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  specialty: string | null;
  specialty_ar: string | null;
  specialty_en: string | null;
  avatar_url: string | null;
};

export function CourseCoInstructors({
  courseId,
  ownerId,
  ar,
}: {
  courseId: string;
  ownerId: string;
  ar: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState<Instructor[]>([]);
  const [coIds, setCoIds] = useState<string[]>([]);
  const [pick, setPick] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: ins }, { data: links }] = await Promise.all([
      supabase
        .from("lms_instructors")
        .select("user_id,full_name,full_name_ar,full_name_en,specialty,specialty_ar,specialty_en,avatar_url")
        .eq("approved", true)
        .order("full_name"),
      supabase.rpc("lms_get_course_assignments", { _course_id: courseId }),
    ]);
    setApproved((ins as Instructor[]) ?? []);
    setCoIds(((links as { instructor_user_id: string }[]) ?? []).map((l) => l.instructor_user_id));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const nameOf = (i: Instructor) =>
    (ar ? i.full_name_ar : i.full_name_en) || i.full_name;
  const specOf = (i: Instructor) =>
    (ar ? i.specialty_ar : i.specialty_en) || i.specialty || "";

  const availableToAdd = approved.filter(
    (i) => i.user_id !== ownerId && !coIds.includes(i.user_id),
  );

  const onAdd = async () => {
    if (!pick) return;
    setBusy(true);
    const { error } = await supabase
      .from("lms_course_instructors")
      .insert({ course_id: courseId, instructor_user_id: pick });
    setBusy(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setCoIds((p) => [...p, pick]);
    setPick("");
    toast.success(ar ? "تمت الإضافة" : "Added");
  };

  const onRemove = async (uid: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("lms_remove_course_instructor", { _course_id: courseId, _instructor_id: uid });
    setBusy(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setCoIds((p) => p.filter((x) => x !== uid));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }

  const chosen = coIds
    .map((id) => approved.find((i) => i.user_id === id))
    .filter(Boolean) as Instructor[];

  return (
    <div className="space-y-3">
      <div>
        <Label>{ar ? "المدرّبون المشاركون" : "Co-instructors"}</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {ar
            ? "أضف مدرّبين معتمدين إضافيين. يمكنهم تحرير محتوى الدورة مثل المالك."
            : "Add other approved instructors. They can edit course content like the owner."}
        </p>
      </div>

      {chosen.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chosen.map((i) => (
            <span
              key={i.user_id}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-1"
            >
              {i.avatar_url ? (
                <img src={i.avatar_url} alt={nameOf(i)} className="h-5 w-5 rounded-full object-cover" />
              ) : null}
              <span className="font-medium">{nameOf(i)}</span>
              <button
                type="button"
                onClick={() => onRemove(i.user_id)}
                disabled={busy}
                aria-label={ar ? "إزالة" : "Remove"}
                className="ms-1 rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {ar ? "لا يوجد مدرّبون مشاركون بعد." : "No co-instructors yet."}
        </p>
      )}

      <div className="flex items-center gap-2">
        <select
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          disabled={busy || availableToAdd.length === 0}
        >
          <option value="">
            {availableToAdd.length === 0
              ? (ar ? "لا يوجد مدرّبون متاحون للإضافة" : "No more instructors to add")
              : (ar ? "اختر مدرّباً معتمداً…" : "Pick an approved instructor…")}
          </option>
          {availableToAdd.map((i) => {
            const sp = specOf(i);
            return (
              <option key={i.user_id} value={i.user_id}>
                {nameOf(i)}{sp ? ` — ${sp}` : ""}
              </option>
            );
          })}
        </select>
        <Button type="button" onClick={onAdd} disabled={!pick || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <UserPlus className="h-4 w-4 mx-1" />}
          {ar ? "إضافة" : "Add"}
        </Button>
      </div>
    </div>
  );
}
