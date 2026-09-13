import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trash2, Upload, User as UserIcon } from "lucide-react";

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
import { confirmDialog } from "@/hooks/useConfirm";
import { courseDestination } from "@/lib/lms-course-destination";
import { SubHero } from "@/components/lms-skin/SubHero";
import { IconDocument } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Training and Learning Platform" },
      { name: "description", content: "Manage your profile, CV, and applications." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: LMS_SKIN_LINKS,
  }),
  component: ProfilePage,
});

/** Signed preview URL for the profile photo, shared by the cover and the photo card. */
function useSignedPreview(fileId: string | null) {
  const signFn = useServerFn(getProfileFileSignedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(null);
    if (!fileId) return;
    let cancelled = false;
    setBusy(true);
    signFn({ data: { file_id: fileId, expires_in: 300 } })
      .then((res) => {
        if (!cancelled) setUrl(res.signed_url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, signFn]);

  return { url, busy };
}

function ProfilePage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const ar = lang === "ar";
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
      if (!overview?.profile) {
        setData(null);
        setLoadState("error");
        return;
      }
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

  const avatar = useSignedPreview(data?.profile.avatar_file_id ?? null);

  if (authLoading || (!data && loadState !== "error")) {
    return (
      <section className="profile-cover">
        <div className="page-shell">
          <p className="state-box">
            <Loader2 className="h-5 w-5 animate-spin" />
          </p>
        </div>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <SubHero
        id="profile-error-title"
        titleSpans={[t.errorLoad]}
        titleClassName="course-page-title"
        lede={errMsg ?? undefined}
        copyChildren={
          <p style={{ marginTop: 26 }}>
            <button type="button" className="action action-primary" onClick={load}>
              <RefreshCw className="h-4 w-4" /> {t.errorRetry}
            </button>
          </p>
        }
      />
    );
  }

  if (!data) return null;

  const name = data.profile.full_name?.trim() || data.email || "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
  const completedCount = data.enrollments.filter((e) => e.completed_at).length;
  const avg = data.enrollments.length
    ? Math.round(data.enrollments.reduce((s, e) => s + Number(e.progress ?? 0), 0) / data.enrollments.length)
    : 0;

  return (
    <>
      <section className="profile-cover" aria-labelledby="profile-name">
        <h1 className="sr-only">{t.profileTitle}</h1>
        <p className="ghost-initials" aria-hidden="true">
          {initials}
        </p>
        <div className="page-shell profile-head">
          <div className="profile-id">
            <span className="profile-avatar" aria-hidden="true">
              {avatar.url ? <img src={avatar.url} alt="" /> : initials || <UserIcon />}
            </span>
            <span className="profile-who">
              <span className="profile-name-row">
                <strong id="profile-name" dir="auto">{name}</strong>
              </span>
              {data.profile.organization && (
                <span className="profile-role" dir="auto">
                  {data.profile.organization}
                </span>
              )}
            </span>
            <span className="profile-actions">
              <a className="action action-primary" href="#profile-identity">
                <span>{ar ? "تعديل الملف" : "Edit profile"}</span>
              </a>
              <Link className="action action-secondary" to="/learning-management-system/trainer-apply">
                <span>{ar ? "كن مدرّباً" : "Be an instructor"}</span>
              </Link>
            </span>
          </div>
          <dl className="profile-stats">
            <div>
              <dt>{ar ? "ملتحق بها" : "Enrolled"}</dt>
              <dd><b>{data.enrollments.length}</b></dd>
            </div>
            <div>
              <dt>{ar ? "مكتملة" : "Completed"}</dt>
              <dd><b>{completedCount}</b></dd>
            </div>
            <div>
              <dt>{ar ? "شهادات" : "Certificates"}</dt>
              <dd><b>{data.certificates.length}</b></dd>
            </div>
            <div>
              <dt>{t.profileProgress}</dt>
              <dd><b>{avg}%</b></dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="lms-section" aria-label={t.profileTitle}>
        <div className="page-shell profile-grid">
          <div className="profile-main">
            <IdentityCard data={data} onSaved={load} lang={lang} />
            <CoursesCard data={data} lang={lang} />
            <CertificatesCard data={data} lang={lang} />
            <ApplicationsCard lang={lang} />
          </div>
          <aside className="profile-side">
            <ContactCard data={data} lang={lang} />
            <AvatarCard data={data} onChanged={load} lang={lang} previewUrl={avatar.url} previewBusy={avatar.busy} />
            <CvCard data={data} onChanged={load} lang={lang} />
          </aside>
        </div>
      </section>
    </>
  );
}

// ---------- Contact ----------

function ContactCard({ data, lang }: { data: ProfileOverview; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
  return (
    <article className="pro-card">
      <h2>{ar ? "التواصل" : "Contact"}</h2>
      <ul className="contact-list">
        <li>
          <span>{t.profileEmail}</span>
          {data.email ? (
            <a href={`mailto:${data.email}`} dir="ltr">
              {data.email}
            </a>
          ) : (
            <b>—</b>
          )}
        </li>
        <li>
          <span>{t.profilePhone}</span>
          {data.profile.phone ? (
            <a href={`tel:${data.profile.phone}`} dir="ltr">
              {data.profile.phone}
            </a>
          ) : (
            <b>—</b>
          )}
        </li>
        <li>
          <span>{t.profileOrganization}</span>
          <b dir="auto">{data.profile.organization || "—"}</b>
        </li>
      </ul>
    </article>
  );
}

// ---------- Identity ----------

function IdentityCard({
  data,
  onSaved,
  lang,
}: {
  data: ProfileOverview;
  onSaved: () => Promise<void>;
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
    <article className="pro-card" id="profile-identity">
      <h2>{t.profileIdentity}</h2>
      <form onSubmit={onSubmit} className="form-grid">
        <div className="field">
          <label>{t.profileEmail}</label>
          <div className="readonly-box" dir="ltr">
            <span>{data.email ?? "—"}</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="fullName">{t.profileFullName}</label>
          <input id="fullName" type="text" value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} dir="auto" />
        </div>
        <div className="field">
          <label htmlFor="phone">{t.profilePhone}</label>
          <input id="phone" type="text" value={phone} maxLength={40} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </div>
        <div className="field">
          <label htmlFor="org">{t.profileOrganization}</label>
          <input id="org" type="text" value={organization} maxLength={200} onChange={(e) => setOrganization(e.target.value)} dir="auto" />
        </div>
        <div className="field span-2">
          <label htmlFor="bio">{t.profileBiography}</label>
          <textarea id="bio" value={biography} maxLength={4000} onChange={(e) => setBiography(e.target.value)} dir="auto" />
          <span className="char-count">{biography.length}/4000</span>
        </div>
        <div className="form-actions span-2">
          <button type="submit" className="action action-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.profileSave}
          </button>
        </div>
      </form>
    </article>
  );
}

// ---------- Avatar ----------

function AvatarCard({
  data,
  onChanged,
  lang,
  previewUrl,
  previewBusy,
}: {
  data: ProfileOverview;
  onChanged: () => Promise<void>;
  lang: "ar" | "en";
  previewUrl: string | null;
  previewBusy: boolean;
}) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "upload" | "clear">(null);
  const uploader = useAvatarOrCvUploader("avatar", onChanged);
  const clearFn = useServerFn(clearProfilePointer);

  const fileId = data.profile.avatar_file_id;

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
    <article className="pro-card">
      <h2>{t.profileAvatar}</h2>
      <div className="avatar-preview">
        {previewUrl ? <img src={previewUrl} alt="" /> : <UserIcon />}
        {previewBusy && <Loader2 className="avatar-preview-busy h-5 w-5 animate-spin" />}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_MIME_TYPES.join(",")}
        hidden
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="card-actions">
        <button type="button" className="action action-secondary" onClick={onPick} disabled={busy === "upload"}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {fileId ? (ar ? "تغيير الصورة" : "Change photo") : ar ? "رفع صورة" : "Upload photo"}
        </button>
        {fileId && (
          <button type="button" className="action action-secondary is-danger" onClick={onClear} disabled={busy === "clear"}>
            {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {ar ? "إزالة" : "Remove"}
          </button>
        )}
      </div>
      <p className="file-hint">{ar ? "JPEG / PNG / WebP · حتى 5 ميغابايت" : "JPEG / PNG / WebP · up to 5 MB"}</p>
    </article>
  );
}

// ---------- CV ----------

function CvCard({
  data,
  onChanged,
  lang,
}: {
  data: ProfileOverview;
  onChanged: () => Promise<void>;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
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

  const onView = async () => {
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
  };

  return (
    <article className="pro-card cv-card">
      <IconDocument />
      <h2>{t.profileCv}</h2>
      <p>{fileId ? (ar ? "السيرة الذاتيّة الحاليّة" : "Current CV") : ar ? "لم تُضف سيرة ذاتيّة بعد" : "No CV uploaded yet"}</p>
      <input
        ref={inputRef}
        type="file"
        accept={CV_MIME_TYPES.join(",")}
        hidden
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="cv-actions">
        <button type="button" className="action action-primary" onClick={onPick} disabled={busy === "upload"}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {fileId ? t.profileReplaceCv : t.profileUploadCv}
        </button>
        {fileId && (
          <>
            <button type="button" className="action action-secondary" onClick={onView} disabled={busy === "view"}>
              {busy === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.profileViewCv}
            </button>
            <button type="button" className="action action-secondary is-danger" onClick={onClear} disabled={busy === "clear"}>
              {busy === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {ar ? "إزالة" : "Remove"}
            </button>
          </>
        )}
      </div>
      <p className="file-hint">{ar ? "PDF فقط · حتى 10 ميغابايت" : "PDF only · up to 10 MB"}</p>
    </article>
  );
}

// ---------- Courses ----------

function CoursesCard({ data, lang }: { data: ProfileOverview; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
  const courseMap = useMemo(() => new Map(data.courses.map((c) => [c.id, c])), [data.courses]);
  const active = data.enrollments.filter((e) => !e.completed_at);
  const completed = data.enrollments.filter((e) => e.completed_at);

  const avg = data.enrollments.length
    ? Math.round(
        data.enrollments.reduce((s, e) => s + Number(e.progress ?? 0), 0) / data.enrollments.length,
      )
    : 0;

  const titleOf = (id: string) => {
    const c = courseMap.get(id);
    return c ? (ar ? c.title_ar : c.title_en || c.title_ar) : id;
  };

  return (
    <article className="pro-card">
      <div className="card-head">
        <h2>{t.profileCurrentCourses}</h2>
        <span>
          {t.profileProgress}: <b>{avg}%</b>
        </span>
      </div>

      {active.length === 0 && <p>{ar ? "لا توجد دورات نشطة حاليًا" : "No active courses right now"}</p>}
      {active.map((e) => {
        const c = courseMap.get(e.course_id);
        const att = data.attendance.byCourse[e.course_id];
        const pct = Number(e.progress);
        return (
          <div key={e.id} className="pro-course">
            <div className="pro-course-head">
              <Link {...courseDestination(e.course_id, c?.delivery_mode)} dir="auto">
                {titleOf(e.course_id)}
              </Link>
              <b>{pct}%</b>
            </div>
            <span className="progress" role="img" aria-label={`${pct}%`}>
              <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </span>
            {att && (
              <small>
                {t.profileAttendance}: {att.present}/{att.total}
              </small>
            )}
          </div>
        );
      })}

      {completed.length > 0 && (
        <>
          <p className="pro-subtitle">{t.profileCompletedCourses}</p>
          <ul className="done-list">
            {completed.map((e) => (
              <li key={e.id} dir="auto">
                ✓ {titleOf(e.course_id)}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

// ---------- Certificates ----------

function CertificatesCard({ data, lang }: { data: ProfileOverview; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
  const courseMap = useMemo(() => new Map(data.courses.map((c) => [c.id, c])), [data.courses]);

  return (
    <article className="pro-card">
      <h2>{t.profileCertificates}</h2>
      {data.certificates.length === 0 ? (
        <p>{ar ? "لم تحصل على شهادات بعد" : "No certificates yet"}</p>
      ) : (
        <ul className="apply-list">
          {data.certificates.map((c) => {
            const co = courseMap.get(c.course_id);
            const title = co ? (ar ? co.title_ar : co.title_en || co.title_ar) : c.course_id;
            return (
              <li key={c.id}>
                <span className="apply-list-main">
                  <span dir="auto">{title}</span>
                  <small dir="ltr">{c.serial}</small>
                </span>
                <Link to="/learning-management-system/certificate/$id" params={{ id: c.id }}>
                  {ar ? "عرض" : "View"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

// ---------- Applications ----------

function ApplicationsCard({ lang }: { lang: "ar" | "en" }) {
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
    if (
      !(await confirmDialog({
        title: lang === "ar" ? "هل تريد سحب الطلب؟" : "Withdraw this application?",
        destructive: true,
      }))
    )
      return;
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
  const statusClass = (s: MyApplicationRow["status"]) =>
    s === "accepted" ? "is-open" : s === "rejected" ? "is-rejected" : s === "withdrawn" ? "is-cancelled" : "is-pending";

  const canWithdraw = (s: MyApplicationRow["status"]) =>
    s !== "accepted" && s !== "rejected" && s !== "withdrawn";

  return (
    <article className="pro-card">
      <h2>{t.profileApplications}</h2>
      {rows === null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : rows.length === 0 ? (
        <p>{t.profileNoApplications}</p>
      ) : (
        <ul className="req-list">
          {rows.map((r) => {
            const title =
              lang === "ar"
                ? r.opportunity_title_ar
                : r.opportunity_title_en || r.opportunity_title_ar;
            return (
              <li key={r.id} className="req-card">
                <span className="req-main">
                  <Link to="/learning-management-system/internships/$slug" params={{ slug: r.opportunity_slug }} dir="auto">
                    {title}
                  </Link>
                  <span>
                    {new Date(r.submitted_at).toLocaleString(lang, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <span className="req-side">
                  {r.attempt_number > 1 && (
                    <span className="attempt-chip">
                      {lang === "ar" ? `محاولة #${r.attempt_number}` : `Attempt #${r.attempt_number}`}
                    </span>
                  )}
                  <span className={`status ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                  {canWithdraw(r.status) && (
                    <button type="button" className="action action-secondary" onClick={() => onWithdraw(r.id)} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t.applyWithdraw}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
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
  if (msg.includes("magic_bytes"))
    return kind === "cv" ? t.profileCvInvalidType : t.profileAvatarInvalidType;
  return t.errorValidation;
}
