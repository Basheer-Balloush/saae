import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(ar ? "حجم الصورة أكبر من 5 ميجابايت" : "Image larger than 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lms-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); toast.error(toUserMessage(error)); return; }
    const { data: pub } = supabase.storage.from("lms-media").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setUploading(false);
    toast.success(ar ? "تم رفع الصورة" : "Image uploaded");
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select("full_name,full_name_ar,full_name_en,bio,bio_ar,bio_en,specialty,specialty_ar,specialty_en,linkedin_url,github_url,avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      const d = (data ?? {}) as Record<string, string | null>;
      setFullNameAr(d.full_name_ar ?? d.full_name ?? "");
      setFullNameEn(d.full_name_en ?? "");
      setSpecialtyAr(d.specialty_ar ?? d.specialty ?? "");
      setSpecialtyEn(d.specialty_en ?? "");
      setBioAr(d.bio_ar ?? d.bio ?? "");
      setBioEn(d.bio_en ?? "");
      setLinkedin(d.linkedin_url ?? "");
      setGithub(d.github_url ?? "");
      setAvatarUrl(d.avatar_url ?? "");
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
              <Label>{ar ? "رابط الصورة" : "Avatar URL"}</Label>
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
