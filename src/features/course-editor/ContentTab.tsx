import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileVideo,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import {
  createBunnyUpload,
  setLessonBunnyVideo,
  refreshBunnyLessonStatus,
} from "@/lib/bunny-stream.functions";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmDialog } from "@/hooks/useConfirm";
import { QuizzesPanel } from "./QuizzesPanel";
import { EmptyState, Field, Panel, Pill, ToggleRow } from "@/components/console/ui";
import type { EditorCtx, Lesson, Section } from "./types";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
type Progress = { pct: number; loaded: number; total: number; name: string };

export function ContentTab({
  ctx,
  sections,
  setSections,
  lessons,
  setLessons,
  onOpenGrading,
}: {
  ctx: EditorCtx;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  onOpenGrading: () => void;
}) {
  const { course, t, ar, lang, user } = ctx;
  const online = course.delivery_mode !== "onsite";
  const [addDialog, setAddDialog] = useState<{
    kind: "section" | "lesson" | "edit";
    sectionId?: string;
  } | null>(null);
  // What hangs off each section: its attendance session date and its quizzes.
  const [sessionDate, setSessionDate] = useState<Record<string, string>>({});
  const [quizCount, setQuizCount] = useState<Record<string, number>>({});
  const loadLinks = useCallback(async () => {
    const [{ data: qz }, { data: ams }] = await Promise.all([
      supabase.from("lms_quizzes").select("lms_section_id").eq("course_id", course.id),
      supabase.from("ams_courses").select("id").eq("lms_course_id", course.id).maybeSingle(),
    ]);
    const qc: Record<string, number> = {};
    for (const q of (qz as { lms_section_id: string | null }[]) ?? [])
      if (q.lms_section_id) qc[q.lms_section_id] = (qc[q.lms_section_id] ?? 0) + 1;
    setQuizCount(qc);
    if (ams) {
      const { data: ss } = await supabase
        .from("ams_sessions")
        .select("lms_section_id,session_date")
        .eq("course_id", (ams as { id: string }).id);
      const d: Record<string, string> = {};
      for (const x of (ss as { lms_section_id: string | null; session_date: string }[]) ?? [])
        if (x.lms_section_id) d[x.lms_section_id] = x.session_date;
      setSessionDate(d);
    }
  }, [course.id]);
  useEffect(() => {
    loadLinks();
  }, [loadLinks, sections.length]);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<
    Record<string, { pct: number; speedMbps: number; etaSec: number }>
  >({});
  const [attachPct, setAttachPct] = useState<Record<string, Progress>>({});

  // Bunny's webhook is the main signal that encoding finished, but when it is
  // missing or late the lesson would sit at "processing" forever. While any
  // lesson is processing, ask Bunny directly every 20 seconds.
  const processingIds = lessons
    .filter(
      (l) =>
        l.video_provider === "bunny" &&
        l.video_uid &&
        (l.video_status === "processing" || l.video_status === "uploading"),
    )
    .map((l) => l.id)
    .join(",");
  useEffect(() => {
    if (!processingIds) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      for (const lessonId of processingIds.split(",")) {
        try {
          const r = await refreshBunnyLessonStatus({ data: { lessonId } });
          if (cancelled || r.status === "processing") continue;
          setLessons((curr) =>
            curr.map((x) =>
              x.id === lessonId
                ? { ...x, video_status: r.status, video_ready: r.status === "ready" }
                : x,
            ),
          );
        } catch (e) {
          console.warn("[bunny status poll]", e);
        }
      }
    }, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [processingIds, setLessons]);

  const openAdd = (kind: "section" | "lesson", sectionId?: string) => {
    setTitleAr("");
    setTitleEn("");
    setAddDialog({ kind, sectionId });
  };
  const openEdit = (sec: Section) => {
    setTitleAr(sec.title_ar ?? "");
    setTitleEn(sec.title_en ?? "");
    setAddDialog({ kind: "edit", sectionId: sec.id });
  };
  const moveSection = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next.map((x, k) => ({ ...x, display_order: k })));
    const res = await Promise.all([
      supabase.from("lms_sections").update({ display_order: i }).eq("id", next[i].id),
      supabase.from("lms_sections").update({ display_order: j }).eq("id", next[j].id),
    ]);
    const err = res.find((r) => r.error)?.error;
    if (err) toast.error(toUserMessage(err));
  };

  const confirmAdd = async () => {
    if (!addDialog) return;
    const title_ar = titleAr.trim();
    const title_en = titleEn.trim();
    const fallback = title_ar || title_en;
    if (!fallback) {
      toast.error(
        addDialog.kind === "section"
          ? t("أدخل عنوان القسم", "Enter a section title")
          : t("أدخل عنوان الدرس", "Enter a lesson title"),
      );
      return;
    }
    if (addDialog.kind === "edit") {
      const sec = sections.find((x) => x.id === addDialog.sectionId);
      if (sec && (title_ar !== (sec.title_ar ?? "") || title_en !== (sec.title_en ?? ""))) {
        await updateSection(sec.id, {
          title_ar: title_ar || null,
          title_en: title_en || null,
          title: fallback,
        });
      }
      setAddDialog(null);
      return;
    }
    if (addDialog.kind === "section") {
      const { data, error } = await supabase
        .from("lms_sections")
        .insert({
          course_id: course.id,
          title: fallback,
          title_ar: title_ar || null,
          title_en: title_en || null,
          display_order: sections.length,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        toast.error(toUserMessage(error));
        return;
      }
      if (data) setSections((s) => [...s, data as Section]);
    } else {
      const sid = addDialog.sectionId!;
      const order = lessons.filter((l) => l.section_id === sid).length;
      const { data, error } = await supabase
        .from("lms_lessons")
        .insert({
          section_id: sid,
          title: fallback,
          title_ar: title_ar || null,
          title_en: title_en || null,
          display_order: order,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        toast.error(toUserMessage(error));
        return;
      }
      if (data) {
        setLessons((l) => [...l, data as Lesson]);
        setOpenLessonId((data as Lesson).id);
      }
    }
    setAddDialog(null);
  };

  const updateSection = async (sid: string, patch: Partial<Section>) => {
    setSections((s) => s.map((x) => (x.id === sid ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("lms_sections").update(patch).eq("id", sid);
    if (error) toast.error(toUserMessage(error));
  };

  const deleteSection = async (s: Section) => {
    const count = lessons.filter((l) => l.section_id === s.id).length;
    if (
      !(await confirmDialog({
        title: online ? t("حذف القسم؟", "Delete section?") : t("حذف الجلسة؟", "Delete session?"),
        description: count
          ? t(
              `سيُحذف معه ${count} درس. لا يمكن التراجع.`,
              `Its ${count} lessons are deleted too. This cannot be undone.`,
            )
          : t("لا يمكن التراجع عن هذا الإجراء.", "This action cannot be undone."),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("lms_sections").delete().eq("id", s.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    setSections((all) => all.filter((x) => x.id !== s.id));
    setLessons((all) => all.filter((l) => l.section_id !== s.id));
  };

  const updateLesson = async (lid: string, patch: Partial<Lesson>) => {
    setLessons((all) => all.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
    await supabase.from("lms_lessons").update(patch).eq("id", lid);
  };

  const deleteLesson = async (l: Lesson) => {
    if (
      !(await confirmDialog({
        title: t("حذف الدرس؟", "Delete lesson?"),
        description: t("لا يمكن التراجع عن هذا الإجراء.", "This action cannot be undone."),
        destructive: true,
      }))
    )
      return;
    await supabase.from("lms_lessons").delete().eq("id", l.id);
    setLessons((all) => all.filter((x) => x.id !== l.id));
    setOpenLessonId(null);
  };

  const uploadVideo = async (lesson: Lesson, file: File) => {
    if (!user) return;
    try {
      setVideoProgress((p) => ({ ...p, [lesson.id]: { pct: 0, speedMbps: 0, etaSec: 0 } }));
      toast.info(t("جاري تجهيز الرفع...", "Preparing upload..."));
      const creds = await createBunnyUpload({
        data: {
          lessonId: lesson.id,
          title: (lesson.title || lesson.title_ar || lesson.title_en || file.name).slice(0, 255),
        },
      });
      const startedAt = Date.now();
      let lastSent = 0;
      let lastAt = startedAt;
      let smoothed = 0; // bytes/sec
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: creds.tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          // Single stream: parallelUploads needs the TUS concatenation
          // extension, which Bunny's endpoint does not document.
          headers: {
            AuthorizationSignature: creds.authorizationSignature,
            AuthorizationExpire: String(creds.authorizationExpire),
            VideoId: creds.videoId,
            LibraryId: String(creds.libraryId),
          },
          metadata: {
            filetype: file.type || "video/mp4",
            title: lesson.title || lesson.title_ar || lesson.title_en || file.name,
          },
          // Every attempt creates a fresh Bunny video, so an old upload URL
          // for the same file must never be reused.
          storeFingerprintForResuming: false,
          onError: (err) => reject(err),
          onProgress: (sent, total) => {
            const now = Date.now();
            const dt = (now - lastAt) / 1000;
            if (dt >= 0.5) {
              const inst = (sent - lastSent) / Math.max(dt, 0.001);
              smoothed = smoothed === 0 ? inst : smoothed * 0.7 + inst * 0.3;
              lastSent = sent;
              lastAt = now;
            }
            const pct = total ? Math.round((sent / total) * 100) : 0;
            const etaSec = smoothed > 0 ? Math.round(Math.max(total - sent, 0) / smoothed) : 0;
            setVideoProgress((p) => ({
              ...p,
              [lesson.id]: { pct, speedMbps: (smoothed * 8) / (1024 * 1024), etaSec },
            }));
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });
      await setLessonBunnyVideo({ data: { lessonId: lesson.id, videoId: creds.videoId } });
      setLessons((curr) =>
        curr.map((x) =>
          x.id === lesson.id
            ? {
                ...x,
                video_provider: "bunny",
                video_uid: creds.videoId,
                video_ready: false,
                video_status: "processing",
                video_url: null,
              }
            : x,
        ),
      );
      toast.success(
        t(
          "تم رفع الفيديو — جاري المعالجة على Bunny (1-3 دقائق)",
          "Video uploaded — Bunny is encoding (1-3 minutes)",
        ),
      );
    } catch (e) {
      console.error("[bunny upload]", e);
      toast.error(toUserMessage(e));
    } finally {
      setVideoProgress((p) => {
        const { [lesson.id]: _omit, ...rest } = p;
        void _omit;
        return rest;
      });
    }
  };

  const recheckVideo = async (l: Lesson) => {
    try {
      const r = await refreshBunnyLessonStatus({ data: { lessonId: l.id } });
      setLessons((curr) =>
        curr.map((x) =>
          x.id === l.id ? { ...x, video_status: r.status, video_ready: r.status === "ready" } : x,
        ),
      );
      toast.success(
        r.status === "ready"
          ? t("الفيديو جاهز", "Video ready")
          : r.status === "failed"
            ? t("فشلت معالجة الفيديو على Bunny", "Bunny failed to process the video")
            : t("ما زال الفيديو قيد المعالجة", "The video is still processing"),
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const uploadAttachments = async (lesson: Lesson, files: FileList | null) => {
    if (!user || !files || files.length === 0) return;
    const next = [...(Array.isArray(lesson.attachments) ? lesson.attachments : [])];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name}: ${t("الحجم أكبر من 50 ميجابايت", "larger than 50MB")}`);
        continue;
      }
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${user.id}/${course.id}/attachments/${lesson.id}/${Date.now()}-${safe}`;
      const key = `${lesson.id}::${path}`;
      setAttachPct((p) => ({
        ...p,
        [key]: { pct: 0, loaded: 0, total: file.size, name: file.name },
      }));
      try {
        await uploadToSupabaseStorage({
          bucket: "lms-private",
          path,
          file,
          upsert: true,
          contentType: file.type || undefined,
          onProgress: (pct, loaded, total) =>
            setAttachPct((p) => ({ ...p, [key]: { pct, loaded, total, name: file.name } })),
        });
        next.push({ name: file.name, path, url: "" });
      } catch (err) {
        toast.error(`${file.name}: ${toUserMessage(err)}`);
      } finally {
        setAttachPct((p) => {
          const n = { ...p };
          delete n[key];
          return n;
        });
      }
    }
    await updateLesson(lesson.id, { attachments: next });
    toast.success(t("تم رفع المرفقات", "Attachments uploaded"));
  };

  const removeAttachment = async (lesson: Lesson, idx: number) => {
    const next = (Array.isArray(lesson.attachments) ? lesson.attachments : []).filter(
      (_, i) => i !== idx,
    );
    await updateLesson(lesson.id, { attachments: next });
  };

  const lessonTitle = (l: Lesson) =>
    ar ? l.title_ar || l.title_en || l.title : l.title_en || l.title_ar || l.title;
  const openLesson = lessons.find((l) => l.id === openLessonId) ?? null;

  const videoState = (l: Lesson) => {
    if (videoProgress[l.id])
      return (
        <Pill tone="teal" icon={Loader2}>
          {t("يُرفع", "Uploading")} {videoProgress[l.id].pct}%
        </Pill>
      );
    if (l.video_provider === "bunny" && l.video_uid) {
      if (l.video_status === "ready")
        return (
          <Pill tone="green" icon={CheckCircle2}>
            {t("فيديو جاهز", "Video ready")}
          </Pill>
        );
      if (l.video_status === "failed")
        return (
          <Pill tone="red" icon={XCircle}>
            {t("فشل الفيديو", "Video failed")}
          </Pill>
        );
      return (
        <Pill tone="orange" icon={Loader2}>
          {t("قيد المعالجة", "Processing")}
        </Pill>
      );
    }
    if (l.video_url)
      return (
        <Pill tone="orange" icon={AlertTriangle}>
          {t("فيديو قديم", "Legacy video")}
        </Pill>
      );
    return (
      <Pill tone="gray" icon={FileVideo}>
        {t("بدون فيديو", "No video")}
      </Pill>
    );
  };

  return (
    <div className="space-y-5">
      <Panel
        title={online ? t("الأقسام والدروس", "Sections and lessons") : t("الجلسات", "Sessions")}
        description={
          online
            ? t(
                "رتّب الدورة في أقسام، وأضف الدروس داخل كل قسم. افتح أي درس لإضافة الفيديو والنص والمرفقات.",
                "Arrange the course in sections and add lessons inside each. Open a lesson to add its video, text and attachments.",
              )
            : t(
                "دورة حضورية: كل قسم هنا جلسة، ويظهر في تبويب الحضور.",
                "In-person course: each section here is a session, and shows in the Attendance tab.",
              )
        }
        actions={
          <Button size="sm" onClick={() => openAdd("section")}>
            <Plus className="h-4 w-4" />
            {online ? t("قسم جديد", "New section") : t("جلسة جديدة", "New session")}
          </Button>
        }
      >
        {sections.length === 0 ? (
          <EmptyState
            compact
            icon={ClipboardList}
            title={
              online
                ? t("لا توجد أقسام بعد", "No sections yet")
                : t("لا توجد جلسات بعد", "No sessions yet")
            }
            text={
              online
                ? t(
                    "ابدأ بقسم مثل «مقدّمة»، ثم أضف دروسه.",
                    "Start with a section such as “Introduction”, then add its lessons.",
                  )
                : undefined
            }
          />
        ) : (
          <ol className="space-y-3">
            {sections.map((s, i) => {
              const sl = lessons.filter((l) => l.section_id === s.id);
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-xl border border-[var(--cx-line)]"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[14px] font-extrabold text-[var(--cx-teal)]">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="min-w-0 flex-1 text-start"
                    >
                      <span
                        className="block truncate text-[15px] font-extrabold hover:text-[var(--cx-teal)]"
                        dir="auto"
                      >
                        {(ar ? s.title_ar || s.title_en : s.title_en || s.title_ar) || s.title}
                      </span>
                      {(ar ? s.title_en : s.title_ar) ? (
                        <span
                          className="block truncate text-[12.5px] text-[var(--cx-muted)]"
                          dir="auto"
                        >
                          {ar ? s.title_en : s.title_ar}
                        </span>
                      ) : (
                        <span className="block text-[12.5px] text-[var(--cx-orange-ink)]">
                          {ar ? "No English title yet" : "لا عنوان بالعربية بعد"}
                        </span>
                      )}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!online && sessionDate[s.id] && (
                        <Pill tone="gray" icon={CalendarDays}>
                          {new Date(sessionDate[s.id]).toLocaleDateString(ar ? "ar-SY" : "en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </Pill>
                      )}
                      {online && (
                        <Pill tone="gray">{t(`${sl.length} درس`, `${sl.length} lessons`)}</Pill>
                      )}
                      {quizCount[s.id] ? (
                        <Pill tone="teal" icon={ClipboardList}>
                          {t("اختبار", "Quiz")}
                        </Pill>
                      ) : null}
                    </div>
                    <div className="flex items-center">
                      {online && (
                        <Button size="sm" variant="ghost" onClick={() => openAdd("lesson", s.id)}>
                          <Plus className="h-4 w-4" />
                          {t("درس", "Lesson")}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={i === 0}
                        onClick={() => moveSection(i, -1)}
                        aria-label={t("أعلى", "Move up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={i === sections.length - 1}
                        onClick={() => moveSection(i, 1)}
                        aria-label={t("أسفل", "Move down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(s)}
                        aria-label={t("تعديل العنوان", "Edit title")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                        onClick={() => deleteSection(s)}
                        aria-label={
                          online
                            ? t("حذف القسم", "Delete section")
                            : t("حذف الجلسة", "Delete session")
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {online &&
                    (sl.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openAdd("lesson", s.id)}
                        className="w-full px-4 py-3 text-start text-[13px] font-semibold text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
                      >
                        + {t("أضف أول درس في هذا القسم", "Add the first lesson in this section")}
                      </button>
                    ) : (
                      <ul>
                        {sl.map((l) => {
                          const files = Array.isArray(l.attachments) ? l.attachments.length : 0;
                          return (
                            <li key={l.id} className="border-t border-[var(--cx-line-2)]">
                              <button
                                type="button"
                                onClick={() => setOpenLessonId(l.id)}
                                className="flex w-full flex-wrap items-center gap-2 px-4 py-2.5 text-start hover:bg-[var(--cx-hover)]"
                              >
                                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                                  {lessonTitle(l)}
                                </span>
                                {videoState(l)}
                                {files > 0 && (
                                  <Pill tone="gray" icon={Paperclip}>
                                    {files}
                                  </Pill>
                                )}
                                {l.is_preview && (
                                  <Pill tone="teal" icon={Eye}>
                                    {t("معاينة مجانية", "Free preview")}
                                  </Pill>
                                )}
                                <ChevronLeft className="h-4 w-4 text-[var(--cx-muted)] ltr:rotate-180" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ))}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <QuizzesPanel courseId={course.id} onChange={loadLinks} />

      <Panel
        title={t("الواجبات", "Assignments")}
        description={t(
          "إنشاء الواجبات وتصحيح ما يرسله الطلاب.",
          "Create assignments and grade what students hand in.",
        )}
        actions={
          <Button size="sm" variant="outline" onClick={onOpenGrading}>
            <ClipboardList className="h-4 w-4" />
            {t("فتح الواجبات", "Open assignments")}
          </Button>
        }
      />

      <Dialog open={!!addDialog} onOpenChange={(v) => !v && setAddDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addDialog?.kind === "lesson"
                ? t("درس جديد", "New lesson")
                : addDialog?.kind === "edit"
                  ? online
                    ? t("تعديل القسم", "Edit section")
                    : t("تعديل الجلسة", "Edit session")
                  : online
                    ? t("قسم جديد", "New section")
                    : t("جلسة جديدة", "New session")}
            </DialogTitle>
            <DialogDescription>
              {t("اكتب العنوان بالعربية والإنجليزية.", "Write the title in Arabic and English.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label={t("العنوان بالعربية", "Title in Arabic")}>
              <Input
                autoFocus
                dir="rtl"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={addDialog?.kind === "lesson" ? "مثال: الدرس الأول" : "مثال: مقدمة"}
              />
            </Field>
            <Field label={t("العنوان بالإنجليزية", "Title in English")}>
              <Input
                dir="ltr"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAdd();
                  }
                }}
                placeholder={addDialog?.kind === "lesson" ? "e.g. Lesson 1" : "e.g. Introduction"}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(null)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={confirmAdd}>
              {addDialog?.kind === "edit" ? t("حفظ", "Save") : t("إضافة", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!openLesson} onOpenChange={(v) => !v && setOpenLessonId(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-xl"
          dir={ar ? "rtl" : "ltr"}
        >
          {openLesson && (
            <div className="space-y-5 pb-10">
              <SheetHeader className="text-start">
                <SheetTitle>{lessonTitle(openLesson)}</SheetTitle>
                <SheetDescription>
                  {t(
                    "تُحفظ التعديلات تلقائياً عند مغادرة كل حقل.",
                    "Changes save automatically when you leave each field.",
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("العنوان بالعربية", "Title in Arabic")}>
                  <Input
                    dir="rtl"
                    value={openLesson.title_ar ?? ""}
                    onChange={(e) =>
                      setLessons((all) =>
                        all.map((x) =>
                          x.id === openLesson.id ? { ...x, title_ar: e.target.value } : x,
                        ),
                      )
                    }
                    onBlur={() =>
                      updateLesson(openLesson.id, {
                        title_ar: openLesson.title_ar,
                        title: openLesson.title_ar || openLesson.title_en || openLesson.title,
                      })
                    }
                  />
                </Field>
                <Field label={t("العنوان بالإنجليزية", "Title in English")}>
                  <Input
                    dir="ltr"
                    value={openLesson.title_en ?? ""}
                    onChange={(e) =>
                      setLessons((all) =>
                        all.map((x) =>
                          x.id === openLesson.id ? { ...x, title_en: e.target.value } : x,
                        ),
                      )
                    }
                    onBlur={() =>
                      updateLesson(openLesson.id, {
                        title_en: openLesson.title_en,
                        title: openLesson.title_ar || openLesson.title_en || openLesson.title,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-[var(--cx-line)] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-extrabold">{t("الفيديو", "Video")}</span>
                  {videoState(openLesson)}
                </div>
                {videoProgress[openLesson.id] ? (
                  <UploadProgress
                    percent={videoProgress[openLesson.id].pct}
                    label={
                      t("رفع الفيديو", "Video upload") +
                      (videoProgress[openLesson.id].speedMbps > 0
                        ? ` · ${videoProgress[openLesson.id].speedMbps.toFixed(1)} Mbps`
                        : "") +
                      (videoProgress[openLesson.id].etaSec > 0
                        ? ` · ${t("متبقي", "ETA")} ${videoProgress[openLesson.id].etaSec >= 60 ? `${Math.ceil(videoProgress[openLesson.id].etaSec / 60)} ${t("د", "min")}` : `${videoProgress[openLesson.id].etaSec} ${t("ث", "s")}`}`
                        : "")
                    }
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[13px] font-bold hover:border-[var(--cx-teal)]">
                      <FileVideo className="h-4 w-4 text-[var(--cx-teal)]" />
                      {openLesson.video_uid || openLesson.video_url
                        ? t("استبدال الفيديو", "Replace video")
                        : t("اختر فيديو", "Choose video")}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          // Clear the input so picking the same file again (after a failure) fires onChange.
                          e.target.value = "";
                          if (f) uploadVideo(openLesson, f);
                        }}
                      />
                    </label>
                    {openLesson.video_provider === "bunny" &&
                      openLesson.video_uid &&
                      openLesson.video_status !== "ready" && (
                        <Button size="sm" variant="ghost" onClick={() => recheckVideo(openLesson)}>
                          <RefreshCw className="h-4 w-4" />
                          {t("تحديث الحالة", "Refresh status")}
                        </Button>
                      )}
                  </div>
                )}
                {openLesson.video_provider !== "bunny" && openLesson.video_url && (
                  <p className="mt-2 text-[12.5px] text-[var(--cx-orange-ink)]">
                    {t(
                      "فيديو قديم — أعد رفعه للحصول على بث سريع",
                      "Legacy video — re-upload for fast streaming",
                    )}
                  </p>
                )}
              </div>

              <Field label={t("نص الدرس بالعربية (Markdown)", "Lesson text in Arabic (Markdown)")}>
                <Textarea
                  dir="rtl"
                  rows={6}
                  value={openLesson.content_md_ar ?? ""}
                  onChange={(e) =>
                    setLessons((all) =>
                      all.map((x) =>
                        x.id === openLesson.id ? { ...x, content_md_ar: e.target.value } : x,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateLesson(openLesson.id, {
                      content_md_ar: openLesson.content_md_ar,
                      content_md:
                        openLesson.content_md_ar ||
                        openLesson.content_md_en ||
                        openLesson.content_md,
                    })
                  }
                />
              </Field>
              <Field
                label={t("نص الدرس بالإنجليزية (Markdown)", "Lesson text in English (Markdown)")}
              >
                <Textarea
                  dir="ltr"
                  rows={6}
                  value={openLesson.content_md_en ?? ""}
                  onChange={(e) =>
                    setLessons((all) =>
                      all.map((x) =>
                        x.id === openLesson.id ? { ...x, content_md_en: e.target.value } : x,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateLesson(openLesson.id, {
                      content_md_en: openLesson.content_md_en,
                      content_md:
                        openLesson.content_md_ar ||
                        openLesson.content_md_en ||
                        openLesson.content_md,
                    })
                  }
                />
              </Field>

              <div className="rounded-xl border border-[var(--cx-line)] p-4">
                <div className="mb-2 text-[14px] font-extrabold">
                  {t("المرفقات", "Attachments")}
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[13px] font-bold hover:border-[var(--cx-teal)]">
                  <Paperclip className="h-4 w-4 text-[var(--cx-teal)]" />
                  {t("أضف ملفات", "Add files")}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      uploadAttachments(openLesson, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="ms-2 text-[12px] text-[var(--cx-muted)]">
                  {t(
                    "PDF / صور / مستندات — حتى 50 ميجابايت لكل ملف",
                    "PDF / images / docs — up to 50MB each",
                  )}
                </span>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(attachPct)
                    .filter(([k]) => k.startsWith(`${openLesson.id}::`))
                    .map(([k, p]) => (
                      <UploadProgress
                        key={k}
                        percent={p.pct}
                        loaded={p.loaded}
                        total={p.total}
                        label={p.name}
                        compact
                      />
                    ))}
                </div>
                {Array.isArray(openLesson.attachments) && openLesson.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {openLesson.attachments.map((a, i) => (
                      <li
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cx-line)] bg-[var(--cx-raise)] px-2 py-1 text-[12.5px]"
                      >
                        <span className="max-w-[220px] truncate">{a.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(openLesson, i)}
                          className="text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                          aria-label={t("إزالة", "Remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <ToggleRow
                id="lesson-preview"
                label={t("معاينة مجانية", "Free preview")}
                hint={t(
                  "يستطيع أي زائر مشاهدة هذا الدرس قبل التسجيل.",
                  "Any visitor can watch this lesson before enrolling.",
                )}
                checked={openLesson.is_preview}
                onChange={(v) => updateLesson(openLesson.id, { is_preview: v })}
              />

              <div className="border-t border-[var(--cx-line)] pt-4">
                <Button
                  variant="outline"
                  className="border-[var(--cx-red-line)] text-[var(--cx-red)]"
                  onClick={() => deleteLesson(openLesson)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("حذف الدرس", "Delete lesson")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
