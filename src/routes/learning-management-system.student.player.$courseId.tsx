import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, FileText, Lock, Paperclip, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QAPanel } from "@/components/lms/QAPanel";
import { AssignmentsPanel } from "@/components/lms/AssignmentsPanel";
import { LessonVideo } from "@/components/lms/player/LessonVideo";
import { useLessonWatch } from "@/hooks/useLessonWatch";
import { watchedSeconds } from "@/lib/lesson-watch";
import { getBunnyPlayback } from "@/lib/bunny-stream.functions";
import { isOnsite } from "@/lib/lms-course-destination";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/student/player/$courseId")({
  head: () => ({
    meta: [{ title: "Lesson — SAAE Training and Learning Platform" }],
    links: [...LMS_SKIN_LINKS, { rel: "stylesheet", href: "/lms/css/player.css" }],
  }),
  component: Player,
});

type Section = { id: string; title: string; title_ar: string | null; title_en: string | null; display_order: number };
type Lesson = { id: string; section_id: string; title: string; title_ar: string | null; title_en: string | null; video_url: string | null; video_provider: string; video_uid: string | null; video_ready: boolean; video_status: string; content_md: string | null; content_md_ar: string | null; content_md_en: string | null; attachments: unknown; display_order: number };
type CourseRow = { instructor_id: string; delivery_mode: string | null; title_ar: string; title_en: string | null };

const pick = (lang: "ar" | "en", ar: string | null | undefined, en: string | null | undefined, fallback: string) => {
  if (lang === "en") return en || ar || fallback;
  return ar || en || fallback;
};
type Progress = { lesson_id: string; is_completed: boolean };

const hasVideo = (l: Lesson) => (l.video_provider === "bunny" ? !!l.video_uid : !!l.video_url);

/** 75 -> "1:15", 3725 -> "1:02:05". */
const clock = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

function Player() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isEmbedSrc, setIsEmbedSrc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: courseData } = await supabase
        .from("lms_courses")
        .select("instructor_id,delivery_mode,title_ar,title_en")
        .eq("id", courseId)
        .maybeSingle();
      const courseRow = courseData as CourseRow | null;
      // Onsite courses have no online lessons: send deep links to the onsite course page.
      if (courseRow && isOnsite(courseRow.delivery_mode)) {
        navigate({ to: "/learning-management-system/courses/$id", params: { id: courseId }, replace: true });
        return;
      }
      setCourse(courseRow);

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
        const prog = (prs as Progress[]) ?? [];
        setLessons(list);
        setProgress(prog);
        // Pick up where the student left off: the first lesson not yet completed.
        const doneIds = new Set(prog.filter((p) => p.is_completed).map((p) => p.lesson_id));
        const resume = list.find((l) => !doneIds.has(l.id)) ?? list[0];
        if (resume) setCurrentId(resume.id);
      }
      setLoading(false);
    })();
  }, [courseId, user, navigate]);

  const current = useMemo(() => lessons.find((l) => l.id === currentId) ?? null, [lessons, currentId]);
  const isDone = (id: string) => progress.find((p) => p.lesson_id === id)?.is_completed === true;
  const currentTitle = current ? pick(lang, current.title_ar, current.title_en, current.title) : "";
  const currentContent = current ? pick(lang, current.content_md_ar, current.content_md_en, current.content_md ?? "") : "";
  const courseTitle = course ? pick(lang, course.title_ar, course.title_en, "") : "";

  const watch = useLessonWatch(user?.id, current?.id);

  // Resolve playback source for the current lesson (Bunny embed or legacy Supabase signed URL)
  useEffect(() => {
    let active = true;
    setVideoSrc(null);
    setIsEmbedSrc(false);
    (async () => {
      if (!current) return;
      if (current.video_provider === "bunny" && current.video_uid) {
        try {
          // The server checks Bunny itself when the lesson still reads as
          // processing, so a missed webhook does not hide a finished video.
          const res = await getBunnyPlayback({ data: { lessonId: current.id } });
          if (!active) return;
          if (!res.playbackUrl) {
            if (res.status !== current.video_status) {
              setLessons((curr) => curr.map((x) => x.id === current.id ? { ...x, video_status: res.status, video_ready: false } : x));
            }
            return;
          }
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

  useEffect(() => {
    if (!currentTitle) return;
    document.title = `${currentTitle} — ${courseTitle || (ar ? "منصة التعلّم" : "SAAE Training and Learning Platform")}`;
  }, [currentTitle, courseTitle, ar]);

  const index = current ? lessons.findIndex((l) => l.id === current.id) : -1;
  const prevLesson = index > 0 ? lessons[index - 1] : null;
  const nextLesson = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const doneCount = lessons.filter((l) => isDone(l.id)).length;
  const coursePct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  const done = current ? isDone(current.id) : false;
  const videoLesson = current ? hasVideo(current) : false;
  // A lesson with a video can be finished only once the video has been watched.
  const canFinish = !!current && !done && (!videoLesson || watch.unlocked);

  const goTo = (id: string) => {
    setCurrentId(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const markComplete = async () => {
    if (!user || !current || done || finishing) return;
    if (videoLesson && !watch.isWatchedNow()) return;
    setFinishing(true);
    const { error } = await supabase.from("lms_lesson_progress").upsert({
      lesson_id: current.id,
      student_id: user.id,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "lesson_id,student_id" });
    setFinishing(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setProgress((p) => [...p.filter((x) => x.lesson_id !== current.id), { lesson_id: current.id, is_completed: true }]);
    toast.success(ar ? "أحسنت! اكتمل الدرس." : "Lesson completed.");
    if (nextLesson) goTo(nextLesson.id);
  };

  if (loading) {
    return (
      <div className="player-page page-shell" dir={ar ? "rtl" : "ltr"}>
        <p className="state-box" role="status">{tr.loading}</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="player-page page-shell" dir={ar ? "rtl" : "ltr"}>
        <div className="state-box">
          <p>{ar ? "لا توجد دروس في هذه الدورة بعد." : "This course has no lessons yet."}</p>
          <Link to="/learning-management-system/student" className="action action-secondary">
            {ar ? "العودة إلى دوراتي" : "Back to my courses"}
          </Link>
        </div>
      </div>
    );
  }

  const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : "#");
  const attachments = Array.isArray(current.attachments) ? (current.attachments as { name: string; url?: string; path?: string }[]) : [];

  const openAttachment = async (a: { name: string; url?: string; path?: string }) => {
    if (a.path) {
      const { data, error } = await supabase.storage.from("lms-private").createSignedUrl(a.path, 300, { download: a.name });
      if (error || !data?.signedUrl) return;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.url) window.open(safeHref(a.url), "_blank", "noopener,noreferrer");
  };

  const section = sections.find((s) => s.id === current.section_id);
  const sectionTitle = section ? pick(lang, section.title_ar, section.title_en, section.title) : "";
  const watchedPct = Math.floor(watch.fraction * 100);
  const duration = watch.progress.duration;
  const watched = Math.min(duration, watchedSeconds(watch.progress.spans));

  const finishState = done ? "done" : !videoLesson ? "free" : watch.unlocked ? "ready" : "locked";
  const finishNote =
    finishState === "done"
      ? ar ? "أكملت هذا الدرس." : "You have completed this lesson."
      : finishState === "free"
        ? ar ? "لا يحتوي هذا الدرس على فيديو. أنهِه بعد مراجعة المحتوى." : "This lesson has no video. Finish it once you have gone through the content."
        : finishState === "ready"
          ? ar ? "أحسنت! شاهدت الفيديو كاملاً، يمكنك الآن إنهاء الدرس." : "Well done: you watched the whole video. You can finish the lesson now."
          : !videoSrc
            ? ar ? "يُفتح زر الإنهاء بعد مشاهدة الفيديو كاملاً، حين يصبح متاحاً." : "“Finish lesson” unlocks once the video is available and watched in full."
            : watchedPct > 0
              ? ar ? `شاهدت ${watchedPct}% من الفيديو. أكمل المشاهدة لفتح زر الإنهاء.` : `You have watched ${watchedPct}% of the video. Keep watching to unlock “Finish lesson”.`
              : ar ? "شاهد الفيديو حتى النهاية لفتح زر إنهاء الدرس." : "Watch the video to the end to unlock “Finish lesson”.";

  return (
    <div className="player-page page-shell" dir={ar ? "rtl" : "ltr"} ref={topRef}>
      <header className="player-head">
        <nav className="course-crumbs" aria-label={ar ? "مسار التنقل" : "Breadcrumb"}>
          <Link to="/learning-management-system/student">{ar ? "دوراتي" : "My courses"}</Link>
          <span aria-hidden="true">/</span>
          <span>{courseTitle}</span>
        </nav>
        <div className="player-head-row">
          <div className="player-head-copy">
            <p className="player-eyebrow">
              {sectionTitle ? <span>{sectionTitle}</span> : null}
              <span>{ar ? `الدرس ${index + 1} من ${lessons.length}` : `Lesson ${index + 1} of ${lessons.length}`}</span>
            </p>
            <h1 className="player-title">{currentTitle}</h1>
          </div>
          <Link
            to="/learning-management-system/student/quiz/$courseId"
            params={{ courseId }}
            search={{ quiz: undefined, review: undefined }}
            className="action action-secondary player-quiz-link"
          >
            {tr.quizzes}
          </Link>
        </div>
      </header>

      <div className="player-layout">
        <div className="player-stage-wrap">
          <div className="player-stage">
            {videoSrc ? (
              <LessonVideo
                key={current.id}
                title={currentTitle}
                src={videoSrc}
                embed={isEmbedSrc}
                onTime={watch.report}
                onBreak={watch.interrupt}
                onEnded={() => finishRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
              />
            ) : (
              <div className="player-stage-note">
                {videoLesson ? (
                  current.video_provider === "bunny" && current.video_status === "failed" ? (
                    ar ? "تعذّر تجهيز الفيديو. يرجى إبلاغ المدرّب." : "The video could not be processed. Please tell the instructor."
                  ) : current.video_provider === "bunny" && current.video_status !== "ready" ? (
                    ar ? "الفيديو قيد التجهيز، وسيصبح جاهزاً خلال دقائق." : "The video is being processed and will be ready in a few minutes."
                  ) : (
                    ar ? "جارٍ تحميل الفيديو…" : "Loading the video…"
                  )
                ) : (
                  <>
                    <FileText aria-hidden="true" />
                    <span>{ar ? "درس مقروء: تجد محتواه أدناه." : "A reading lesson: the content is below."}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <section ref={finishRef} className={cn("player-finish", `is-${finishState}`)} aria-label={ar ? "إنهاء الدرس" : "Finish the lesson"}>
          <div className="player-finish-copy">
            <p className="player-finish-note" role="status" aria-live="polite">
              {finishState === "done" ? <CheckCircle2 aria-hidden="true" /> : finishState === "locked" ? <Lock aria-hidden="true" /> : null}
              <span>{finishNote}</span>
            </p>
            {videoLesson && !done ? (
              <div className="player-meter">
                <div
                  className="player-meter-track"
                  role="progressbar"
                  aria-label={ar ? "نسبة المشاهدة" : "Watched"}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={watchedPct}
                >
                  <span style={{ inlineSize: `${watchedPct}%` }} />
                </div>
                <span className="player-meter-time">
                  {duration > 0 ? `${clock(watched)} / ${clock(duration)}` : "0:00"}
                </span>
              </div>
            ) : null}
          </div>
          {done ? (
            nextLesson ? (
              <button type="button" className="action action-primary" onClick={() => goTo(nextLesson.id)}>
                {ar ? "الدرس التالي" : "Next lesson"}
              </button>
            ) : (
              <span className="player-done-chip">
                <CheckCircle2 aria-hidden="true" />
                {tr.completed}
              </span>
            )
          ) : (
            <button type="button" className="action action-primary" onClick={markComplete} disabled={!canFinish || finishing}>
              {ar ? "إنهاء الدرس" : "Finish lesson"}
            </button>
          )}
        </section>

        <nav className="player-steps" aria-label={ar ? "التنقل بين الدروس" : "Lesson navigation"}>
          {prevLesson ? (
            <button type="button" className="lms-reset" onClick={() => goTo(prevLesson.id)}>
              {ar ? "الدرس السابق" : "Previous lesson"}
            </button>
          ) : <span />}
          {nextLesson && !done ? (
            <button type="button" className="lms-reset" onClick={() => goTo(nextLesson.id)}>
              {ar ? "تخطَّ إلى الدرس التالي" : "Skip to next lesson"}
            </button>
          ) : null}
        </nav>

        <aside className="player-outline" aria-label={ar ? "محتوى الدورة" : "Course content"}>
          <div className="player-outline-head">
            <h2>{ar ? "محتوى الدورة" : "Course content"}</h2>
            <p>
              {ar ? `أكملت ${doneCount} من ${lessons.length} دروس` : `${doneCount} of ${lessons.length} lessons completed`}
            </p>
            <div
              className="player-meter-track"
              role="progressbar"
              aria-label={ar ? "تقدّمك في الدورة" : "Course progress"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={coursePct}
            >
              <span style={{ inlineSize: `${coursePct}%` }} />
            </div>
          </div>
          <div className="player-outline-body">
            {sections.map((s) => {
              const sectionLessons = lessons.filter((l) => l.section_id === s.id);
              if (!sectionLessons.length) return null;
              const sectionDone = sectionLessons.filter((l) => isDone(l.id)).length;
              return (
                <div key={s.id} className="player-outline-section">
                  <h3>
                    <span>{pick(lang, s.title_ar, s.title_en, s.title)}</span>
                    <small>{sectionDone}/{sectionLessons.length}</small>
                  </h3>
                  <ul>
                    {sectionLessons.map((l) => {
                      const lessonDone = isDone(l.id);
                      const active = l.id === current.id;
                      const n = lessons.findIndex((x) => x.id === l.id) + 1;
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            className={cn("player-lesson", active && "is-active", lessonDone && "is-done")}
                            aria-current={active ? "step" : undefined}
                            onClick={() => goTo(l.id)}
                          >
                            {lessonDone ? <CheckCircle2 aria-hidden="true" /> : active ? <PlayCircle aria-hidden="true" /> : <Circle aria-hidden="true" />}
                            <span className="player-lesson-text">
                              <span className="player-lesson-title">{n}. {pick(lang, l.title_ar, l.title_en, l.title)}</span>
                              <small>
                                {lessonDone
                                  ? tr.completed
                                  : hasVideo(l)
                                    ? ar ? "فيديو" : "Video"
                                    : ar ? "قراءة" : "Reading"}
                              </small>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="player-panels">
          {currentContent ? (
            <article className="pro-card player-content">
              <h2>{ar ? "عن هذا الدرس" : "About this lesson"}</h2>
              <p className="course-desc">{currentContent}</p>
            </article>
          ) : null}

          {attachments.length > 0 ? (
            <section className="pro-card player-files">
              <h2>
                <Paperclip aria-hidden="true" />
                {tr.attachments}
              </h2>
              <ul>
                {attachments.map((a, i) => (
                  <li key={i}>
                    <button type="button" className="action action-secondary" onClick={() => openAttachment(a)}>
                      {a.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AssignmentsPanel lessonId={current.id} user={user} lang={lang} />

          <QAPanel
            lessonId={current.id}
            user={user}
            isInstructor={role === "admin" || (!!user && !!course?.instructor_id && user.id === course.instructor_id)}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
