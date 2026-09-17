import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";

type InstructorEdits = {
  fullNameAr: string; fullNameEn: string; specialtyAr: string; specialtyEn: string;
  bioAr: string; bioEn: string; linkedin: string; github: string; avatarUrl: string;
};

export function AdminInstructorEditDialog({
  userId,
  open,
  onOpenChange,
  onSaved,
  ar,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
  ar: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [specialtyAr, setSpecialtyAr] = useState("");
  const [specialtyEn, setSpecialtyEn] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<{ pct: number; loaded: number; total: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useLmsAuth();
  const [loadedValues, setLoadedValues] = useState<InstructorEdits | null>(null);
  const currentValues = useMemo<InstructorEdits>(
    () => ({ fullNameAr, fullNameEn, specialtyAr, specialtyEn, bioAr, bioEn, linkedin, github, avatarUrl }),
    [fullNameAr, fullNameEn, specialtyAr, specialtyEn, bioAr, bioEn, linkedin, github, avatarUrl],
  );
  const draft = useRecordDraft<InstructorEdits>({
    key: formDraftKey(user?.id, "lms-instructor", userId),
    loaded: loadedValues,
    current: loadedValues ? currentValues : null,
    apply: (d) => {
      setFullNameAr(d.fullNameAr); setFullNameEn(d.fullNameEn);
      setSpecialtyAr(d.specialtyAr); setSpecialtyEn(d.specialtyEn);
      setBioAr(d.bioAr); setBioEn(d.bioEn);
      setLinkedin(d.linkedin); setGithub(d.github); setAvatarUrl(d.avatarUrl);
    },
  });

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(ar ? "حجم الصورة أكبر من 5 ميجابايت" : "Image larger than 5MB");
      return;
    }
    setUploading(true);
    setUploadPct({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
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

  useEffect(() => {
    setLoadedValues(null);
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select("full_name,full_name_ar,full_name_en,bio,bio_ar,bio_en,specialty,specialty_ar,specialty_en,linkedin_url,github_url,avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      const d = (data ?? {}) as Record<string, string | null>;
      const loaded: InstructorEdits = {
        fullNameAr: d.full_name_ar ?? d.full_name ?? "",
        fullNameEn: d.full_name_en ?? "",
        specialtyAr: d.specialty_ar ?? d.specialty ?? "",
        specialtyEn: d.specialty_en ?? "",
        bioAr: d.bio_ar ?? d.bio ?? "",
        bioEn: d.bio_en ?? "",
        linkedin: d.linkedin_url ?? "",
        github: d.github_url ?? "",
        avatarUrl: d.avatar_url ?? "",
      };
      setFullNameAr(loaded.fullNameAr);
      setFullNameEn(loaded.fullNameEn);
      setSpecialtyAr(loaded.specialtyAr);
      setSpecialtyEn(loaded.specialtyEn);
      setBioAr(loaded.bioAr);
      setBioEn(loaded.bioEn);
      setLinkedin(loaded.linkedin);
      setGithub(loaded.github);
      setAvatarUrl(loaded.avatarUrl);
      setLoadedValues(loaded);
      setLoading(false);
    })();
  }, [open, userId]);

  const onSave = async () => {
    if (!fullNameAr.trim() && !fullNameEn.trim()) {
      toast.error(ar ? "الاسم مطلوب" : "Name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("lms_instructors")
      .update({
        full_name: (fullNameAr || fullNameEn).trim(),
        full_name_ar: fullNameAr.trim() || null,
        full_name_en: fullNameEn.trim() || null,
        specialty: (specialtyAr || specialtyEn).trim() || null,
        specialty_ar: specialtyAr.trim() || null,
        specialty_en: specialtyEn.trim() || null,
        bio: (bioAr || bioEn).trim() || null,
        bio_ar: bioAr.trim() || null,
        bio_en: bioEn.trim() || null,
        linkedin_url: linkedin.trim() || null,
        github_url: github.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الحفظ" : "Saved");
    draft.clear();
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ar ? "تعديل ملف المدرّب" : "Edit instructor profile"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">…</p>
        ) : (
          <div className="space-y-4">
            <DraftNotice show={draft.restored} onDiscard={draft.discard} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>الاسم (عربي)</Label>
                <Input dir="rtl" value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} />
              </div>
              <div>
                <Label>Name (English)</Label>
                <Input dir="ltr" value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>الاختصاص (عربي)</Label>
                <Input dir="rtl" value={specialtyAr} onChange={(e) => setSpecialtyAr(e.target.value)} />
              </div>
              <div>
                <Label>Specialty (English)</Label>
                <Input dir="ltr" value={specialtyEn} onChange={(e) => setSpecialtyEn(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>نبذة (عربي)</Label>
                <Textarea dir="rtl" rows={3} value={bioAr} onChange={(e) => setBioAr(e.target.value)} />
              </div>
              <div>
                <Label>Bio (English)</Label>
                <Textarea dir="ltr" rows={3} value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>LinkedIn URL</Label>
                <Input dir="ltr" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
              </div>
              <div>
                <Label>GitHub URL</Label>
                <Input dir="ltr" value={github} onChange={(e) => setGithub(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{ar ? "الصورة الشخصية" : "Avatar"}</Label>
              <div className="mt-2 flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted border border-border" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <Upload className="h-4 w-4 mx-2" />}
                  {ar ? "رفع صورة" : "Upload image"}
                </Button>
              </div>
              {uploadPct && (
                <div className="mt-2">
                  <UploadProgress percent={uploadPct.pct} loaded={uploadPct.loaded} total={uploadPct.total} label={uploadPct.name} />
                </div>
              )}
              <Label className="mt-3 block text-xs text-muted-foreground">{ar ? "أو رابط مباشر" : "Or direct URL"}</Label>
              <Input dir="ltr" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {ar ? "حفظ" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
