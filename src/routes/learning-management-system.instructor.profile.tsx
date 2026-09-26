import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { toUserMessage } from "@/lib/safe-error";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  LangSwitch,
  Loading,
  PageHeader,
  Panel,
  SaveBar,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/learning-management-system/instructor/profile")({
  head: () => ({ meta: [{ title: "My profile — SAAE Training and Learning Platform" }] }),
  component: InstructorProfile,
});

type P = {
  full_name_ar: string;
  full_name_en: string;
  specialty_ar: string;
  specialty_en: string;
  bio_ar: string;
  bio_en: string;
  avatar_url: string | null;
};
const EMPTY: P = {
  full_name_ar: "",
  full_name_en: "",
  specialty_ar: "",
  specialty_en: "",
  bio_ar: "",
  bio_en: "",
  avatar_url: null,
};

/* What students see about the instructor on course pages, edited with a
   live preview beside it. */
function InstructorProfile() {
  const { user } = useLmsAuth();
  const { t, ar, lang } = useT();
  const [loaded, setLoaded] = useState<P | null>(null);
  const [p, setP] = useState<P>(EMPTY);
  const [tl, setTl] = useState<"ar" | "en">(lang);
  const [saving, setSaving] = useState(false);
  const [upload, setUpload] = useState<{
    pct: number;
    loaded: number;
    total: number;
    name: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lms_instructors")
      .select(
        "full_name,full_name_ar,full_name_en,bio,bio_ar,bio_en,specialty,specialty_ar,specialty_en,avatar_url",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = (data ?? {}) as Record<string, string | null>;
        const v: P = {
          full_name_ar: d.full_name_ar ?? d.full_name ?? "",
          full_name_en: d.full_name_en ?? "",
          specialty_ar: d.specialty_ar ?? d.specialty ?? "",
          specialty_en: d.specialty_en ?? "",
          bio_ar: d.bio_ar ?? d.bio ?? "",
          bio_en: d.bio_en ?? "",
          avatar_url: d.avatar_url ?? null,
        };
        setLoaded(v);
        setP(v);
      });
  }, [user]);

  if (!loaded) return <Loading />;
  const dirty = JSON.stringify(p) !== JSON.stringify(loaded);
  const k = <B extends "full_name" | "specialty" | "bio">(b: B) =>
    `${b}_${tl}` as `${B}_${"ar" | "en"}`;
  const shown = (b: "full_name" | "specialty" | "bio") =>
    ar ? p[`${b}_ar`] || p[`${b}_en`] : p[`${b}_en`] || p[`${b}_ar`];

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return void toast.error(t("اختر صورة", "Choose an image"));
    if (file.size > 5 * 1024 * 1024)
      return void toast.error(t("حجم الصورة أكبر من 5 ميجابايت", "Image larger than 5 MB"));
    setUpload({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: "lms-media",
        path: `${user.id}/avatar-${Date.now()}.${ext}`,
        file,
        upsert: true,
        contentType: file.type,
        onProgress: (pct, l, total) => setUpload({ pct, loaded: l, total, name: file.name }),
      });
      setP((x) => ({ ...x, avatar_url: `${publicUrl}?v=${Date.now()}` }));
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setUpload(null);
    }
  };

  const save = async () => {
    if (!user) return;
    const name = (p.full_name_ar || p.full_name_en).trim();
    if (!name) return void toast.error(t("الاسم مطلوب", "Your name is required"));
    setSaving(true);
    const { error } = await supabase.from("lms_instructors").upsert(
      {
        user_id: user.id,
        full_name: name,
        full_name_ar: p.full_name_ar.trim() || null,
        full_name_en: p.full_name_en.trim() || null,
        bio: (p.bio_ar || p.bio_en).trim() || null,
        bio_ar: p.bio_ar.trim() || null,
        bio_en: p.bio_en.trim() || null,
        specialty: (p.specialty_ar || p.specialty_en).trim() || null,
        specialty_ar: p.specialty_ar.trim() || null,
        specialty_en: p.specialty_en.trim() || null,
        avatar_url: p.avatar_url,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return void toast.error(toUserMessage(error));
    setLoaded(p);
    toast.success(t("حُفظ ملفك", "Profile saved"));
  };

  const initial = (shown("full_name") || "?").trim().charAt(0).toUpperCase();

  return (
    <div>
      <PageHeader
        eyebrow={t("مساحة المدرّب", "Instructor workspace")}
        title={t("ملفي الشخصي", "My profile")}
        description={t(
          "يظهر للطلاب على صفحة كل دورة تدرّسها.",
          "Students see this on the page of every course you teach.",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={t("معلوماتك", "About you")}
          actions={
            <LangSwitch
              value={tl}
              onChange={setTl}
              missing={{ ar: !p.full_name_ar.trim(), en: !p.full_name_en.trim() }}
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                aria-label={t("تغيير الصورة", "Change photo")}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-[var(--cx-teal-50)] text-[28px] font-extrabold text-[var(--cx-teal)]">
                    {initial}
                  </span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {upload ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pick}
              />
              <div className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  "اضغط على الصورة لتغييرها. حتى 5 ميجابايت.",
                  "Click the photo to change it. Up to 5 MB.",
                )}
                {upload && (
                  <div className="mt-2 max-w-xs">
                    <UploadProgress
                      percent={upload.pct}
                      loaded={upload.loaded}
                      total={upload.total}
                      label={upload.name}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
            <Field label={t("الاسم الكامل", "Full name")}>
              <Input
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={p[k("full_name")]}
                onChange={(e) => setP({ ...p, [k("full_name")]: e.target.value })}
              />
            </Field>
            <Field
              label={t("الاختصاص", "Specialty")}
              hint={t(
                "مثال: مهندس بيانات، مدرّب ذكاء اصطناعي",
                "For example: data engineer, AI trainer",
              )}
            >
              <Input
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={p[k("specialty")]}
                onChange={(e) => setP({ ...p, [k("specialty")]: e.target.value })}
              />
            </Field>
            <Field label={t("نبذة", "Bio")}>
              <Textarea
                rows={6}
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={p[k("bio")]}
                onChange={(e) => setP({ ...p, [k("bio")]: e.target.value })}
              />
            </Field>
          </div>
        </Panel>

        <aside>
          <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--cx-muted)]">
            {t("كما يراك الطلاب", "How students see you")}
          </div>
          <div className="cx-card overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-[#048090] to-[#0b5560]" />
            <div className="-mt-10 px-5 pb-5">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt=""
                  className="h-20 w-20 rounded-2xl border-4 border-[var(--cx-card-solid)] object-cover"
                />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-[var(--cx-card-solid)] bg-[var(--cx-teal-50)] text-[28px] font-extrabold text-[var(--cx-teal)]">
                  {initial}
                </span>
              )}
              <div className="mt-3 text-[17px] font-extrabold" dir="auto">
                {shown("full_name") || t("اسمك", "Your name")}
              </div>
              <div className="text-[13px] font-bold text-[var(--cx-teal)]" dir="auto">
                {shown("specialty") || t("اختصاصك", "Your specialty")}
              </div>
              <p
                className="mt-3 line-clamp-6 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--cx-ink-2)]"
                dir="auto"
              >
                {shown("bio") ||
                  t("نبذة قصيرة عنك وعن خبرتك.", "A short bio about you and your experience.")}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <SaveBar show={dirty} saving={saving} onSave={save} onDiscard={() => setP(loaded)} />
    </div>
  );
}
