import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/learning-management-system/instructor/profile")({
  head: () => ({ meta: [{ title: "LMS · Instructor profile" }] }),
  component: InstructorProfileEdit,
});

function InstructorProfileEdit() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select("full_name,bio,specialty,linkedin_url,github_url,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setBio(data.bio ?? "");
        setSpecialty(data.specialty ?? "");
        setLinkedinUrl(data.linkedin_url ?? "");
        setGithubUrl(data.github_url ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(ar ? "حجم الصورة أكبر من 5 ميجابايت" : "Image larger than 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lms-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); toast.error(toUserMessage(error)); return; }
    const { data: pub } = supabase.storage.from("lms-media").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setUploading(false);
    toast.success(ar ? "تم رفع الصورة" : "Image uploaded");
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
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      specialty: specialty.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      github_url: githubUrl.trim() || null,
      avatar_url: avatarUrl,
    };
    const { error } = await supabase.from("lms_instructors").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الحفظ" : "Saved");
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        {ar ? "الملف الشخصي للمدرّس" : "Instructor profile"}
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
              {(fullName || "?").charAt(0)}
            </div>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <Upload className="h-4 w-4 mx-2" />}
              {ar ? "تغيير الصورة" : "Change photo"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">{ar ? "حتى 5 ميجابايت" : "Up to 5MB"}</p>
          </div>
        </div>

        <div>
          <Label>{ar ? "الاسم الكامل" : "Full name"}</Label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>{ar ? "الاختصاص" : "Specialty"}</Label>
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </div>
        <div>
          <Label>{ar ? "نبذة عنك" : "Bio"}</Label>
          <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn</Label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label>GitHub</Label>
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://" />
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
