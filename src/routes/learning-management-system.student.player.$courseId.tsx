import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, PlayCircle, Circle, Paperclip, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QAPanel } from "@/components/lms/QAPanel";
import { AssignmentsPanel } from "@/components/lms/AssignmentsPanel";
import { getBunnyPlayback } from "@/lib/bunny-stream.functions";
import Hls from "hls.js";
import { isOnsite } from "@/lib/lms-course-destination";

export const Route = createFileRoute("/learning-management-system/student/player/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Player" }] }),
  component: Player,
});

type Section = { id: string; title: string; title_ar: string | null; title_en: string | null; display_order: number };
type Lesson = { id: string; section_id: string; title: string; title_ar: string | null; title_en: string | null; video_url: string | null; video_provider: string; video_uid: string | null; video_ready: boolean; video_status: string; content_md: string | null; content_md_ar: string | null; content_md_en: string | null; attachments: unknown; display_order: number };

const pick = (lang: "ar" | "en", ar: string | null | undefined, en: string | null | undefined, fallback: string) => {
  if (lang === "en") return en || ar || fallback;
  return ar || en || fallback;
};
type Progress = { lesson_id: string; is_completed: boolean };

function Player() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isEmbedSrc, setIsEmbedSrc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseInstructorId, setCourseInstructorId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: course } = await supabase
        .from("lms_courses")
        .select("instructor_id,delivery_mode")
        .eq("id", courseId)
        .maybeSingle();
      const courseRow = course as { instructor_id: string; delivery_mode: string | null } | null;
      // Onsite courses have no online lessons: send deep links to the onsite course page.
      if (courseRow && isOnsite(courseRow.delivery_mode)) {
        navigate({ to: "/learning-management-system/courses/$id", params: { id: courseId }, replace: true });
        return;
      }
      setCourseInstructorId(courseRow?.instructor_id ?? null);

      const { data: secs } = await supabase.from("lms_sections")
        .select("id,title,title_ar,title_en,display_order").eq("course_id", courseId).order("display_order");
      const orderedSecs = ((secs as Section[]) ?? []).slice().sort((a, b) => a.display_order - b.display_order);
      setSections(orderedSecs);
      if (orderedSecs.length) {
        const ids = orderedSecs.map((s) => s.id);
        const [{ data: lss }, { data: prs }] = await Promise.all([
          supabase.from("lms_lessons").select("id,section_id,title,title_ar,title_en,video_url,video_provider,video_uid,video_ready,video_status,content_md,content_md_ar,content_md_en,attachments,display_order").in("section_id", ids),
          supabase.from("lms_lesson_progress").select("lesson_id,is_completed").eq("student_id", user.id),
        ]);
        const secOrder = new Map(orderedSecs.map((s, i) => [s.id, i]));
        const list = ((lss as Lesson[]) ?? []).slice().sort((a, b) => {
          const sa = secOrder.get(a.section_id) ?? 0;
          const sb = secOrder.get(b.section_id) ?? 0;
          if (sa !== sb) return sa - sb;
          return a.display_order - b.display_order;
        });
        setLessons(list);
        setProgress((prs as Progress[]) ?? []);
        if (list.length) setCurrentId(list[0].id);
      }
      setLoading(false);
    })();
  }, [courseId, user, navigate]);

  const current = useMemo(() => lessons.find((l) => l.id === currentId) ?? null, [lessons, currentId]);
  const isDone = (id: string) => progress.find((p) => p.lesson_id === id)?.is_completed === true;
  const isRtl = lang === "ar";
  const currentTitle = current ? pick(lang, current.title_ar, current.title_en, current.title) : "";
  const currentContent = current ? pick(lang, current.content_md_ar, current.content_md_en, current.content_md ?? "") : "";

  // Resolve playback source for the current lesson (Bunny HLS or legacy Supabase signed URL)
  useEffect(() => {
    let active = true;
    setVideoSrc(null);
    setIsEmbedSrc(false);
    (async () => {
      if (!current) return;
      if (current.video_provider === "bunny" && current.video_uid) {
        if (current.video_status && current.video_status !== "ready") return;
        try {
          const res = await getBunnyPlayback({ data: { lessonId: current.id } });
          if (!active) return;
          setVideoSrc(res.playbackUrl);
          setIsEmbedSrc(true);
        } catch (e) {
          if (!active) return;
          toast.error(toUserMessage(e));
        }
        return;
      }
      if (!current.video_url) return;
      if (current.video_url.startsWith("private:")) {
        const path = current.video_url.slice("private:".length);
        const { data, error } = await supabase.storage.from("lms-private").createSignedUrl(path, 60 * 60 * 2);
        if (!active) return;
        if (error) { toast.error(toUserMessage(error)); return; }
        setVideoSrc(data?.signedUrl ?? null);
      } else {
        setVideoSrc(current.video_url);
      }
    })();
    return () => { active = false; };
  }, [current]);

  // Attach HLS source to <video> when current lesson is a Bunny stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    const isHls = videoSrc.includes(".m3u8");
    if (!isHls) { video.src = videoSrc; return; }
    // Safari supports HLS natively
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      return () => { hls.destroy(); };
    }
    // Fallback
    video.src = videoSrc;
  }, [videoSrc]);

  const markCompleteRef = useRef<() => void>(() => {});

  // Auto-complete for streamed (Bunny) iframe lessons via player.js postMessage protocol
  useEffect(() => {
    if (!current || !isEmbedSrc || !videoSrc) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const listenerId = `saae-${current.id}`;

    const send = (msg: Record<string, unknown>) => {
      try { iframe.contentWindow?.postMessage(JSON.stringify({ context: "player.js", ...msg }), "*"); } catch { /* noop */ }
    };
    const onReady = () => {
      send({ method: "addEventListener", value: "ended", listener: listenerId });
    };
    const onMessage = (e: MessageEvent) => {
      try {
        const origin = e.origin || "";
        if (!/mediadelivery\.net|b-cdn\.net/i.test(origin)) return;
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data || data.context !== "player.js") return;
        if (data.event === "ready") onReady();
        if (data.event === "ended") markCompleteRef.current?.();
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", onMessage);
    // Ask for a ready ping in case we missed it
    send({ method: "addEventListener", value: "ready", listener: listenerId });
    // Also proactively subscribe (some player.js impls accept before ready)
    onReady();
    return () => { window.removeEventListener("message", onMessage); };
  }, [current, isEmbedSrc, videoSrc]);


  const markComplete = async () => {
    if (!user || !current) return;
    const { error } = await supabase.from("lms_lesson_progress").upsert({
      lesson_id: current.id,
      student_id: user.id,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "lesson_id,student_id" });
    if (error) { toast.error(toUserMessage(error)); return; }
    setProgress((p) => {
      const next = p.filter((x) => x.lesson_id !== current.id);
      next.push({ lesson_id: current.id, is_completed: true });
      return next;
    });
    toast.success(tr.completed);
    const idx = lessons.findIndex((l) => l.id === current.id);
    if (idx >= 0 && idx < lessons.length - 1) setCurrentId(lessons[idx + 1].id);
  };
  markCompleteRef.current = markComplete;


  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : "#");
  const attachments = Array.isArray(current?.attachments) ? (current!.attachments as { name: string; url?: string; path?: string }[]) : [];

  const openAttachment = async (a: { name: string; url?: string; path?: string }) => {
    if (a.path) {
      const { data, error } = await supabase.storage.from("lms-private").createSignedUrl(a.path, 300, { download: a.name });
      if (error || !data?.signedUrl) return;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.url) window.open(safeHref(a.url), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
          {current && videoSrc && isEmbedSrc ? (
            <iframe
              key={current.id}
              ref={iframeRef}
              src={videoSrc}
              title={currentTitle}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full border-0"
            />
          ) : current && videoSrc ? (
            <video
              key={current.id}
              ref={videoRef}
              controls
              controlsList="nodownload"
              playsInline
              onEnded={markComplete}
              className="w-full h-full"
            />
          ) : current && current.video_provider === "bunny" && current.video_uid && current.video_status !== "ready" ? (
            <div className="text-white/85 text-sm px-6 text-center">
              {current.video_status === "failed"
                ? (lang === "ar" ? "تعذّر معالجة الفيديو. يرجى إبلاغ المدرّب." : "Video processing failed. Please notify the instructor.")
                : (lang === "ar" ? "الفيديو قيد المعالجة، سيصبح جاهزاً خلال دقائق." : "Video is processing — it will be ready in a few minutes.")}
            </div>
          ) : (
            <div className="text-white/85 text-sm">{tr.selectLesson}</div>
          )}
        </div>

        {current && (
          <>
            <div className="mt-4 flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{currentTitle}</h1>
              <div className="flex gap-2">
                <Link to="/learning-management-system/student/quiz/$courseId" params={{ courseId }}>
                  <Button variant="outline" size="sm"><Award className="h-4 w-4 mx-1" />{tr.finalTest}</Button>
                </Link>
                <Button onClick={markComplete} disabled={isDone(current.id)} size="sm">
                  <CheckCircle2 className="h-4 w-4 mx-1" />
                  {isDone(current.id) ? tr.completed : tr.markCompleted}
                </Button>
              </div>
            </div>

            {currentContent && (
              <div className="mt-4 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {currentContent}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Paperclip className="h-4 w-4" />{tr.attachments}</h3>
                <ul className="mt-2 space-y-1.5">
                  {attachments.map((a, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => openAttachment(a)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Paperclip className="h-3.5 w-3.5" />{a.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <AssignmentsPanel lessonId={current.id} user={user} lang={lang} />

            <QAPanel
              lessonId={current.id}
              user={user}
              isInstructor={
                role === "lms_admin" || (!!user && !!courseInstructorId && user.id === courseInstructorId)
              }
              lang={lang}
            />
          </>
        )}
      </div>

      <aside dir={isRtl ? "rtl" : "ltr"} className="rounded-2xl border border-border bg-card overflow-hidden self-start lg:sticky lg:top-24 max-h-[80vh] overflow-y-auto">
        {sections.map((s) => (
          <div key={s.id}>
            <div className={cn("px-4 py-2.5 bg-muted/40 font-semibold text-foreground text-sm", isRtl && "text-right")}>{pick(lang, s.title_ar, s.title_en, s.title)}</div>
            <ul>
              {lessons.filter((l) => l.section_id === s.id).map((l) => {
                const done = isDone(l.id);
                const active = l.id === currentId;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setCurrentId(l.id)}
                      dir={isRtl ? "rtl" : "ltr"}
                      className={cn(
                        "w-full flex items-start gap-2 px-4 py-2.5 text-sm text-start hover:bg-muted/50 transition-colors border-b border-border/50",
                        isRtl && "text-right",
                        active && "bg-primary/10 text-primary font-semibold",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> :
                        active ? <PlayCircle className="h-4 w-4 mt-0.5 shrink-0" /> :
                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                      <span className="flex-1">{pick(lang, l.title_ar, l.title_en, l.title)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}
