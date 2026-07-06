import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";

export const Route = createFileRoute("/learning-management-system/instructor/profile")({
  head: () => ({ meta: [{ title: "LMS · Instructor profile" }] }),
  component: InstructorProfileEdit,
});

function InstructorProfileEdit() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<{ pct: number; loaded: number; total: number; name: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [specialtyAr, setSpecialtyAr] = useState("");
  const [specialtyEn, setSpecialtyEn] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select("full_name,full_name_ar,full_name_en,bio,bio_ar,bio_en,specialty,specialty_ar,specialty_en,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as Record<string, string | null>;
        setFullName(d.full_name ?? "");
        setFullNameAr(d.full_name_ar ?? d.full_name ?? "");
        setFullNameEn(d.full_name_en ?? "");
        setBioAr(d.bio_ar ?? d.bio ?? "");
        setBioEn(d.bio_en ?? "");
        setSpecialtyAr(d.specialty_ar ?? d.specialty ?? "");
        setSpecialtyEn(d.specialty_en ?? "");
        setAvatarUrl(d.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(ar ? "حجم الصورة أكبر من 5 ميجابايت" : "Image larger than 5MB");
      return;
    }
    setUploading(true);
    setUploadPct({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: "lms-media",
        path,
        file,
        upsert: true,
        contentType: file.type,
        onProgress: (pct, loaded, total) => setUploadPct({ pct, loaded, total, name: file.name }),
      });
      setAvatarUrl(`${publicUrl}?v=${Date.now()}`);
      toast.success(ar ? "تم رفع الصورة" : "Image uploaded");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim()) {
      toast.error(ar ? "الاسم مطلوب" : "Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name: (fullNameAr || fullNameEn || fullName).trim(),
      full_name_ar: fullNameAr.trim() || null,
      full_name_en: fullNameEn.trim() || null,
      bio: (bioAr || bioEn).trim() || null,
      bio_ar: bioAr.trim() || null,
      bio_en: bioEn.trim() || null,
      specialty: (specialtyAr || specialtyEn).trim() || null,
      specialty_ar: specialtyAr.trim() || null,
      specialty_en: specialtyEn.trim() || null,
      avatar_url: avatarUrl,
    };
    const { error } = await supabase.from("lms_instructors").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الحفظ" : "Saved");
    navigate({ to: "/learning-management-system/instructor" });
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        {ar ? "الملف الشخصي للمدرّب" : "Instructor profile"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ar ? "هذه المعلومات تظهر للطلاب على صفحات الدورات." : "This information shows to students on course pages."}
      </p>

      <form onSubmit={onSave} className="mt-8 space-y-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-20 w-20 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
              {(fullNameAr || fullNameEn || fullName || "?").charAt(0)}
            </div>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <Upload className="h-4 w-4 mx-2" />}
              {ar ? "تغيير الصورة" : "Change photo"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">{ar ? "حتى 5 ميجابايت" : "Up to 5MB"}</p>
            {uploadPct && (
              <div className="mt-2 max-w-xs">
                <UploadProgress percent={uploadPct.pct} loaded={uploadPct.loaded} total={uploadPct.total} label={uploadPct.name} />
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>الاسم الكامل (عربي)</Label>
            <Input dir="rtl" required value={fullNameAr} onChange={(e) => { setFullNameAr(e.target.value); setFullName(e.target.value); }} />
          </div>
          <div>
            <Label>Full name (English)</Label>
            <Input dir="ltr" value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>الاختصاص (عربي)</Label>
            <Input dir="rtl" value={specialtyAr} onChange={(e) => setSpecialtyAr(e.target.value)} />
          </div>
          <div>
            <Label>Specialty (English)</Label>
            <Input dir="ltr" value={specialtyEn} onChange={(e) => setSpecialtyEn(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>نبذة (عربي)</Label>
            <Textarea dir="rtl" rows={4} value={bioAr} onChange={(e) => setBioAr(e.target.value)} />
          </div>
          <div>
            <Label>Bio (English)</Label>
            <Textarea dir="ltr" rows={4} value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
          </div>
        </div>


        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
          {ar ? "حفظ" : "Save"}
        </Button>
      </form>
    </div>
  );
}
