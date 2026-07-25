import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react";

import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import {
  clearProfilePointer,
  finalizeProfileFileUpload,
  getMyProfileOverview,
  getProfileFileSignedUrl,
  prepareProfileFileUpload,
  updateMyProfile,
  type ProfileOverview,
} from "@/lib/lms-profile.functions";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  CV_MAX_BYTES,
  CV_MIME_TYPES,
} from "@/lib/lms-profile";
import {
  listMyInternshipApplications,
  mapApplyError,
  withdrawInternshipApplication,
  type MyApplicationRow,
} from "@/lib/lms-internships-apply.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/learning-management-system/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Training and Learning Platform" },
      { name: "description", content: "Manage your profile, CV, and applications." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { lang, dir } = useLang();
  const isRtl = dir === "rtl";
  const t = lmsInternshipsT[lang];
  const { user, loading: authLoading } = useLmsAuth();

  const fetchOverview = useServerFn(getMyProfileOverview);

  const [data, setData] = useState<ProfileOverview | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrMsg(null);
    try {
      const overview = await fetchOverview();
      setData(overview);
      setLoadState("ready");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setLoadState("error");
    }
  }, [fetchOverview]);

  // Redirect logged-out users to LMS login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/learning-management-system/login" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading || (!data && loadState !== "error")) {
    return <ProfileSkeleton isRtl={isRtl} />;
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <p className="text-lg font-semibold text-foreground">{t.errorLoad}</p>
        {errMsg && <p className="mt-2 text-sm text-muted-foreground">{errMsg}</p>}
        <Button onClick={load} className="mt-6 gap-2">
          <RefreshCw className="h-4 w-4" /> {t.errorRetry}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12"
      dir={dir}
    >
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.profileTitle}</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <AvatarCard data={data} onChanged={load} isRtl={isRtl} lang={lang} />
          <CvCard data={data} onChanged={load} isRtl={isRtl} lang={lang} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <IdentityCard data={data} onSaved={load} isRtl={isRtl} lang={lang} />
          <CoursesCard data={data} isRtl={isRtl} lang={lang} />
          <CertificatesCard data={data} isRtl={isRtl} lang={lang} />
          <ApplicationsCard isRtl={isRtl} lang={lang} />
        </div>
      </div>
    </div>
  );
}

// ---------- Identity ----------

function IdentityCard({
  data,
  onSaved,
  isRtl,
  lang,
}: {
  data: ProfileOverview;
  onSaved: () => Promise<void>;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const save = useServerFn(updateMyProfile);
  const [fullName, setFullName] = useState(data.profile.full_name ?? "");
  const [biography, setBiography] = useState(data.profile.biography ?? "");
  const [organization, setOrganization] = useState(data.profile.organization ?? "");
  const [phone, setPhone] = useState(data.profile.phone ?? "");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save({
        data: {
          full_name: fullName.trim() || null,
          biography: biography.trim() || null,
          organization: organization.trim() || null,
          phone: phone.trim() || null,
        },
      });
      toast.success(t.profileSaved);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorValidation);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <UserIcon className="h-5 w-5" /> {t.profileIdentity}
      </h2>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>{t.profileEmail}</Label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground" dir="ltr">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{data.email ?? "—"}</span>
          </div>
        </div>
        <div>
          <Label htmlFor="fullName">{t.profileFullName}</Label>
          <Input
            id="fullName"
            value={fullName}
            maxLength={200}
            onChange={(e) => setFullName(e.target.value)}
            dir="auto"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="phone">{t.profilePhone}</Label>
          <Input
            id="phone"
            value={phone}
            maxLength={40}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="org">{t.profileOrganization}</Label>
          <Input
            id="org"
            value={organization}
            maxLength={200}
            onChange={(e) => setOrganization(e.target.value)}
            dir="auto"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bio">{t.profileBiography}</Label>
          <Textarea
            id="bio"
            value={biography}
            maxLength={4000}
            onChange={(e) => setBiography(e.target.value)}
            dir="auto"
            className="mt-1 min-h-[120px]"
          />
          <div className={`mt-1 text-xs text-muted-foreground ${isRtl ? "text-left" : "text-right"}`}>
            {biography.length}/4000
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {t.profileSave}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------- Avatar ----------

function AvatarCard({
  data,
  onChanged,
  isRtl,
  lang,
}: {
  data: ProfileOverview;
  onChanged: () => Promise<void>;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "upload" | "clear" | "preview">(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const uploader = useAvatarOrCvUploader("avatar", onChanged);
  const clearFn = useServerFn(clearProfilePointer);
  const signFn = useServerFn(getProfileFileSignedUrl);

  const fileId = data.profile.avatar_file_id;

  useEffect(() => {
    setPreviewUrl(null);
    if (!fileId) return;
    let cancelled = false;
    setBusy("preview");
    signFn({ data: { file_id: fileId, expires_in: 300 } })
      .then((res) => {
        if (!cancelled) setPreviewUrl(res.signed_url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, signFn]);

  const onPick = () => inputRef.current?.click();
  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy("upload");
    try {
      await uploader(file);
      toast.success(t.profileSaved);
    } catch (err) {
      toast.error(mapUploadError(err, "avatar", lang));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onClear = async () => {
    setBusy("clear");
    try {
      await clearFn({ data: { kind: "avatar" } });
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorValidation);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Camera className="h-5 w-5" /> {t.profileAvatar}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted ring-1 ring-border">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserIcon className="h-12 w-12" />
            </div>
          )}
          {busy === "preview" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onPick} disabled={busy === "upload"}>
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Upload className="h-4 w-4 mx-1" />}
            {fileId
              ? lang === "ar" ? "تغيير الصورة" : "Change photo"
              : lang === "ar" ? "رفع صورة" : "Upload photo"}
          </Button>
          {fileId && (
            <Button variant="ghost" size="sm" onClick={onClear} disabled={busy === "clear"} className="text-destructive">
              {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Trash2 className="h-4 w-4 mx-1" />}
              {lang === "ar" ? "إزالة" : "Remove"}
            </Button>
          )}
        </div>
        <p className={`text-xs text-muted-foreground ${isRtl ? "text-right" : "text-left"}`}>
          {lang === "ar" ? "JPEG / PNG / WebP · حتى 5 ميغابايت" : "JPEG / PNG / WebP · up to 5 MB"}
        </p>
      </div>
    </Card>
  );
}

// ---------- CV ----------

function CvCard({
  data,
  onChanged,
  isRtl: _isRtl,
  lang,
}: {
  data: ProfileOverview;
  onChanged: () => Promise<void>;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "upload" | "clear" | "view">(null);
  const uploader = useAvatarOrCvUploader("cv", onChanged);
  const clearFn = useServerFn(clearProfilePointer);
  const signFn = useServerFn(getProfileFileSignedUrl);

  const fileId = data.profile.cv_file_id;

  const onPick = () => inputRef.current?.click();
  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy("upload");
    try {
      await uploader(file);
      toast.success(t.profileSaved);
    } catch (err) {
      toast.error(mapUploadError(err, "cv", lang));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onClear = async () => {
    setBusy("clear");
    try {
      await clearFn({ data: { kind: "cv" } });
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorValidation);
    } finally {
      setBusy(null);
    }
  };

  const onView = async (download: boolean) => {
    if (!fileId) return;
    setBusy("view");
    try {
      const res = await signFn({ data: { file_id: fileId, expires_in: 300 } });
      window.open(res.signed_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorLoad);
    } finally {
      setBusy(null);
    }
    void download;
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <FileText className="h-5 w-5" /> {t.profileCv}
      </h2>
      <div className="mt-4 space-y-3">
        {fileId ? (
          <div className="flex items-center gap-3 rounded-md border border-input bg-muted/20 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate flex-1" dir="auto">
              {lang === "ar" ? "السيرة الذاتيّة الحاليّة" : "Current CV"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لم تُضف سيرة ذاتيّة بعد" : "No CV uploaded yet"}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={CV_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onPick} disabled={busy === "upload"}>
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Upload className="h-4 w-4 mx-1" />}
            {fileId ? t.profileReplaceCv : t.profileUploadCv}
          </Button>
          {fileId && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onView(false)} disabled={busy === "view"}>
                {busy === "view" ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : null}
                {t.profileViewCv}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClear} disabled={busy === "clear"} className="text-destructive">
                {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Trash2 className="h-4 w-4 mx-1" />}
                {lang === "ar" ? "إزالة" : "Remove"}
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? "PDF فقط · حتى 10 ميغابايت" : "PDF only · up to 10 MB"}
        </p>
      </div>
    </Card>
  );
}

// ---------- Courses ----------

function CoursesCard({
  data,
  isRtl: _isRtl,
  lang,
}: {
  data: ProfileOverview;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const courseMap = useMemo(
    () => new Map(data.courses.map((c) => [c.id, c])),
    [data.courses],
  );
  const active = data.enrollments.filter((e) => !e.completed_at);
  const completed = data.enrollments.filter((e) => e.completed_at);

  const avg = data.enrollments.length
    ? Math.round(
        data.enrollments.reduce((s, e) => s + Number(e.progress ?? 0), 0) /
          data.enrollments.length,
      )
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> {t.profileCurrentCourses}
        </h2>
        <div className="text-sm text-muted-foreground">
          {t.profileProgress}: <span className="font-semibold text-foreground">{avg}%</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لا توجد دورات نشطة حاليًا" : "No active courses right now"}
          </p>
        )}
        {active.map((e) => {
          const c = courseMap.get(e.course_id);
          const title = c ? (lang === "ar" ? c.title_ar : c.title_en || c.title_ar) : e.course_id;
          const att = data.attendance.byCourse[e.course_id];
          return (
            <div key={e.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/learning-management-system/student/player/$courseId"
                  params={{ courseId: e.course_id }}
                  className="font-medium text-foreground hover:text-primary truncate"
                  dir="auto"
                >
                  {title}
                </Link>
                <span className="text-xs text-muted-foreground shrink-0">{Number(e.progress)}%</span>
              </div>
              <Progress value={Number(e.progress)} className="mt-2 h-1.5" />
              {att && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.profileAttendance}: {att.present}/{att.total}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {completed.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> {t.profileCompletedCourses}
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {completed.map((e) => {
              const c = courseMap.get(e.course_id);
              const title = c ? (lang === "ar" ? c.title_ar : c.title_en || c.title_ar) : e.course_id;
              return (
                <li key={e.id} className="truncate" dir="auto">
                  • {title}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ---------- Certificates ----------

function CertificatesCard({
  data,
  isRtl: _isRtl,
  lang,
}: {
  data: ProfileOverview;
  isRtl: boolean;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const courseMap = useMemo(
    () => new Map(data.courses.map((c) => [c.id, c])),
    [data.courses],
  );

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Award className="h-5 w-5" /> {t.profileCertificates}
      </h2>
      <div className="mt-4">
        {data.certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لم تحصل على شهادات بعد" : "No certificates yet"}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.certificates.map((c) => {
              const co = courseMap.get(c.course_id);
              const title = co ? (lang === "ar" ? co.title_ar : co.title_en || co.title_ar) : c.course_id;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" dir="auto">{title}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{c.serial}</p>
                  </div>
                  <Link
                    to="/learning-management-system/certificate/$id"
                    params={{ id: c.id }}
                    className="text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    {lang === "ar" ? "عرض" : "View"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------- Applications ----------

function ApplicationsCard({ isRtl: _isRtl, lang }: { isRtl: boolean; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const listFn = useServerFn(listMyInternshipApplications);
  const withdrawFn = useServerFn(withdrawInternshipApplication);
  const [rows, setRows] = useState<MyApplicationRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listFn();
      setRows(res);
    } catch {
      setRows([]);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const onWithdraw = async (id: string) => {
    if (!confirm(lang === "ar" ? "هل تريد سحب الطلب؟" : "Withdraw this application?")) return;
    setBusy(id);
    try {
      await withdrawFn({ data: { application_id: id } });
      toast.success(t.applyWithdrawn);
      await load();
    } catch (err) {
      toast.error(mapApplyError(err, lang));
    } finally {
      setBusy(null);
    }
  };

  const statusLabel = (s: MyApplicationRow["status"]) => {
    switch (s) {
      case "new":
        return t.statusNew;
      case "under_review":
        return t.statusUnderReview;
      case "shortlisted":
        return t.statusShortlisted;
      case "interview":
        return t.statusInterview;
      case "accepted":
        return t.statusAccepted;
      case "rejected":
        return t.statusRejected;
      case "withdrawn":
        return t.statusWithdrawn;
      default:
        return s;
    }
  };

  const canWithdraw = (s: MyApplicationRow["status"]) =>
    s !== "accepted" && s !== "rejected" && s !== "withdrawn";

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">{t.profileApplications}</h2>
      {rows === null ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t.profileNoApplications}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => {
            const title =
              lang === "ar"
                ? r.opportunity_title_ar
                : r.opportunity_title_en || r.opportunity_title_ar;
            return (
              <li
                key={r.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link
                    to="/learning-management-system/internships/$slug"
                    params={{ slug: r.opportunity_slug }}
                    className="text-sm font-medium text-foreground hover:text-primary"
                    dir="auto"
                  >
                    {title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.submitted_at).toLocaleString(lang, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {r.attempt_number > 1 && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      title={lang === "ar" ? "رقم المحاولة" : "Attempt number"}
                    >
                      {lang === "ar" ? `محاولة #${r.attempt_number}` : `Attempt #${r.attempt_number}`}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {statusLabel(r.status)}
                  </span>
                  {canWithdraw(r.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onWithdraw(r.id)}
                      disabled={busy === r.id}
                    >
                      {busy === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        t.applyWithdraw
                      )}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


// ---------- Uploader (shared) ----------

function useAvatarOrCvUploader(kind: "avatar" | "cv", onDone: () => Promise<void>) {
  const prepare = useServerFn(prepareProfileFileUpload);
  const finalize = useServerFn(finalizeProfileFileUpload);
  return useCallback(
    async (file: File) => {
      // Client-side pre-check for a friendly error before hitting the server
      const cap = kind === "cv" ? CV_MAX_BYTES : AVATAR_MAX_BYTES;
      if (file.size > cap) throw new Error(kind === "cv" ? "cv_size" : "avatar_size");
      const allow = (kind === "cv" ? CV_MIME_TYPES : AVATAR_MIME_TYPES) as readonly string[];
      if (!allow.includes(file.type)) throw new Error(kind === "cv" ? "cv_mime" : "avatar_mime");

      const prep = await prepare({
        data: {
          kind,
          filename: file.name,
          mime: file.type,
          size: file.size,
        },
      });

      // Signed upload via fetch (PUT to signed_url)
      const uploadRes = await fetch(prep.signed_url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("upload_failed");

      await finalize({
        data: {
          kind,
          path: prep.path,
          mime: prep.mime,
          size: prep.size,
          original_filename: prep.original_filename,
        },
      });
      await onDone();
    },
    [kind, prepare, finalize, onDone],
  );
}

function mapUploadError(err: unknown, kind: "avatar" | "cv", lang: "ar" | "en"): string {
  const t = lmsInternshipsT[lang];
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("cv_size")) return t.profileCvTooLarge;
  if (msg.includes("cv_mime") || msg.includes("cv_ext")) return t.profileCvInvalidType;
  if (msg.includes("avatar_size")) return t.profileAvatarTooLarge;
  if (msg.includes("avatar_mime")) return t.profileAvatarInvalidType;
  if (msg.includes("magic_bytes")) return kind === "cv" ? t.profileCvInvalidType : t.profileAvatarInvalidType;
  return t.errorValidation;
}

// ---------- Skeleton ----------

function ProfileSkeleton({ isRtl }: { isRtl: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12" dir={isRtl ? "rtl" : "ltr"}>
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// suppress unused import warnings from lucide when tree-shaken
void Phone;
