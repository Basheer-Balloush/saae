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
import { CourseFeedbackPrompt } from "@/components/lms/CourseFeedbackPrompt";
import { useLessonWatch } from "@/hooks/useLessonWatch";
import { COMPLETE_SHARE, watchedSeconds } from "@/lib/lesson-watch";
import { compareOrder, openLessonIds, orderLessons, upNextLesson } from "@/lib/lesson-sequence";
import { getBunnyPlayback } from "@/lib/bunny-stream.functions";
import { isOnsite } from "@/lib/lms-course-destination";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/student/player/$courseId")({
  head: () => ({
    meta: [{ title: "Lesson — SAAE Training and Learning Platform" }],
    links: [...LMS_SKIN_LINKS, { rel: "stylesheet", href: "/lms/css/player.css" }, { rel: "stylesheet", href: "/lms/css/feedback.css" }],
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

/** Seconds before a finished video moves the student on to the next lesson. */
const ADVANCE_SECONDS = 5;
const GOAL_PCT = Math.round(COMPLETE_SHARE * 100);

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
  // Not enrolled (an admin or instructor looking at the course): the database
  // keeps no progress for them, so completions last only for this visit.
  const [preview, setPreview] = useState(false);
  // The lesson whose video just played to the end, and the lesson to start
  // playing on arrival (after moving on from a finished one).
  const [endedId, setEndedId] = useState<string | null>(null);
  const [autoplayId, setAutoplayId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLElement | null>(null);
  const savingRef = useRef(false);
  const autoTriedRef = useRef<string | null>(null);
  const currentIdRef = useRef<string | null>(null);
  currentIdRef.current = currentId;

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
      const orderedSecs = ((secs as Section[]) ?? []).slice().sort(compareOrder);
      setSections(orderedSecs);
      if (orderedSecs.length) {
        const ids = orderedSecs.map((s) => s.id);
        const [{ data: lss }, { data: prs }, { data: enr, error: enrErr }] = await Promise.all([
          supabase.from("lms_lessons").select("id,section_id,title,title_ar,title_en,video_url,video_provider,video_uid,video_ready,video_status,content_md,content_md_ar,content_md_en,attachments,display_order").in("section_id", ids),
          supabase.from("lms_lesson_progress").select("lesson_id,is_completed").eq("student_id", user.id),
          supabase.from("lms_enrollments").select("id").eq("course_id", courseId).eq("student_id", user.id).maybeSingle(),
        ]);
        setPreview(!enrErr && !enr);
        const list = orderLessons(orderedSecs, (lss as Lesson[]) ?? []);
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
  // A lesson with a video completes once enough of it has been watched.
  const canFinish = !!current && !done && (!videoLesson || watch.enough);

  // The course instructor and admins answer in Q&A; it does not change the lock.
  const isStaff = role === "admin" || (!!user && !!course?.instructor_id && user.id === course.instructor_id);

  // Lessons open in order, for every account: any completed lesson can be
  // replayed, the first one not yet completed can be played, the rest are
  // locked. There is no way to skip ahead.
  const doneIds = useMemo(
    () => new Set(progress.filter((p) => p.is_completed).map((p) => p.lesson_id)),
    [progress],
  );
  const openIds = useMemo(() => openLessonIds(lessons, doneIds), [lessons, doneIds]);
  const isOpen = (id: string) => openIds.has(id);
  const lessonTitle = (l: Lesson) => pick(lang, l.title_ar, l.title_en, l.title);
  /** Where "Next lesson" leads once `lessonId` is completed. */
  const upNextAfter = (lessonId: string, done: ReadonlySet<string>) => upNextLesson(lessons, lessonId, done);
  const upNext = current ? upNextAfter(current.id, doneIds) : null;

  /** Opens a lesson. `unlocked` skips the lock check when the caller has just
      completed the lesson that opens it and state has not caught up yet. */
  const goTo = (id: string, opts: { autoplay?: boolean; unlocked?: boolean } = {}) => {
    if (!opts.unlocked && !isOpen(id)) {
      const blocker = lessons.find((l) => !isDone(l.id));
      toast.info(
        blocker
          ? ar ? `أكمل درس «${lessonTitle(blocker)}» أولاً لفتح هذا الدرس.` : `Finish “${lessonTitle(blocker)}” first to unlock this lesson.`
          : ar ? "هذا الدرس مقفل." : "This lesson is locked.",
      );
      return;
    }
    setEndedId(null);
    setAutoplayId(opts.autoplay ? id : null);
    setCurrentId(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  /** Records the current lesson as completed. `advance` moves on to the next
      lesson afterwards; the automatic save at 90% leaves the video playing. */
  const markComplete = async (advance: boolean) => {
    const lesson = current;
    if (!user || !lesson || isDone(lesson.id) || savingRef.current) return;
    if (hasVideo(lesson) && !watch.isWatchedNow()) return;
    const next = upNextAfter(lesson.id, new Set([...doneIds, lesson.id]));
    savingRef.current = true;
    setFinishing(true);
    const { error } = preview
      ? { error: null }
      : await supabase.from("lms_lesson_progress").upsert({
          lesson_id: lesson.id,
          student_id: user.id,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: "lesson_id,student_id" });
    savingRef.current = false;
    setFinishing(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setProgress((p) => [...p.filter((x) => x.lesson_id !== lesson.id), { lesson_id: lesson.id, is_completed: true }]);
    toast.success(
      preview
        ? ar ? "اكتمل الدرس في المعاينة (لا يُحفظ)." : "Lesson completed in preview (not saved)."
        : ar ? "أحسنت! اكتمل الدرس." : "Lesson completed.",
    );
    if (advance && next && currentIdRef.current === lesson.id) goToRef.current(next.id, { autoplay: true, unlocked: true });
  };
  const markRef = useRef(markComplete);
  markRef.current = markComplete;

  // Watching 90% of the video completes the lesson, once per visit to it.
  // If the save fails, "Finish lesson" stays available to try again.
  useEffect(() => {
    if (!current || done || !videoLesson || !watch.enough) return;
    if (autoTriedRef.current === current.id) return;
    autoTriedRef.current = current.id;
    void markRef.current(false);
  }, [current, done, videoLesson, watch.enough]);

  // When a completed lesson's video plays to the end, count down and move on.
  const nextId = upNext?.id ?? null;
  const advancing = !!current && endedId === current.id && done && !!nextId;
  useEffect(() => {
    if (!advancing || !nextId) {
      setCountdown(null);
      return;
    }
    let left = ADVANCE_SECONDS;
    setCountdown(left);
    const timer = window.setInterval(() => {
      left -= 1;
      if (left > 0) setCountdown(left);
      else {
        window.clearInterval(timer);
        goToRef.current(nextId, { autoplay: true });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [advancing, nextId]);

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
  const watchedPct = Math.floor(watch.share * 100);
  const duration = watch.progress.duration;
  const watched = Math.min(duration, watchedSeconds(watch.progress.spans));
  const nextTitle = upNext ? lessonTitle(upNext) : "";

  const finishState = done ? "done" : !videoLesson ? "free" : watch.enough ? "ready" : "locked";
  const finishNote =
    finishState === "done"
      ? countdown !== null
        ? ar ? `أكملت هذا الدرس. ننتقل بك إلى الدرس التالي: ${nextTitle}` : `Lesson complete. Taking you to the next lesson: ${nextTitle}`
        : upNext
          ? ar ? `أكملت هذا الدرس. التالي: ${nextTitle}` : `Lesson complete. Up next: ${nextTitle}`
          : doneCount === lessons.length
            ? ar ? "أكملت جميع دروس الدورة." : "You have completed every lesson in this course."
            : ar ? "أكملت هذا الدرس." : "You have completed this lesson."
      : finishState === "free"
        ? ar ? "لا يحتوي هذا الدرس على فيديو. أنهِه بعد مراجعة المحتوى." : "This lesson has no video. Finish it once you have gone through the content."
        : finishState === "ready"
          ? finishing
            ? ar ? `أحسنت! شاهدت ${GOAL_PCT}% من الفيديو. جارٍ حفظ إكمال الدرس…` : `Well done: you watched ${GOAL_PCT}% of the video. Saving your progress…`
            : ar ? `شاهدت ${GOAL_PCT}% من الفيديو. اضغط «إنهاء الدرس» لحفظ تقدّمك.` : `You watched ${GOAL_PCT}% of the video. Press “Finish lesson” to save your progress.`
          : !videoSrc
            ? ar ? `يكتمل الدرس بعد مشاهدة ${GOAL_PCT}% من الفيديو، حين يصبح متاحاً.` : `The lesson completes once ${GOAL_PCT}% of the video is watched, when the video is available.`
            : watchedPct > 0
              ? ar ? `شاهدت ${watchedPct}% من الفيديو. عند ${GOAL_PCT}% يكتمل الدرس ويُفتح الدرس التالي.` : `You have watched ${watchedPct}% of the video. At ${GOAL_PCT}% the lesson completes and the next one unlocks.`
              : ar ? `شاهد ${GOAL_PCT}% من الفيديو ليكتمل الدرس ويُفتح الدرس التالي.` : `Watch ${GOAL_PCT}% of the video to complete the lesson and unlock the next one.`;

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
            {preview ? (
              <p className="player-preview-note">
                {ar
                  ? "معاينة: لست مسجّلاً في هذه الدورة، لذلك لا يُحفظ تقدّمك. تُفتح الدروس بالترتيب كما يراها الطلاب."
                  : "Preview: you are not enrolled in this course, so your progress is not saved. Lessons open in order, as students see them."}
              </p>
            ) : null}
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

      {!preview && lessons.length > 0 && doneCount === lessons.length ? (
        <CourseFeedbackPrompt courseId={courseId} ar={ar} context="player" />
      ) : null}

      <div className="player-layout">
        <div className="player-stage-wrap">
          <div className="player-stage">
            {videoSrc ? (
              <LessonVideo
                key={current.id}
                title={currentTitle}
                src={videoSrc}
                embed={isEmbedSrc}
                autoplay={autoplayId === current.id}
                onTime={watch.report}
                onBreak={watch.interrupt}
                onEnded={() => {
                  setEndedId(current.id);
                  finishRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
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
                  aria-valuetext={ar ? `${watchedPct}% من ${GOAL_PCT}% المطلوبة` : `${watchedPct}% of the ${GOAL_PCT}% needed`}
                >
                  <span style={{ inlineSize: `${watchedPct}%` }} />
                  <i className="player-meter-goal" style={{ insetInlineStart: `${GOAL_PCT}%` }} aria-hidden="true" />
                </div>
                <span className="player-meter-time">
                  {duration > 0 ? `${clock(watched)} / ${clock(duration)}` : "0:00"}
                </span>
              </div>
            ) : null}
          </div>
          {done ? (
            upNext ? (
              <div className="player-finish-actions">
                {countdown !== null ? (
                  <button type="button" className="lms-reset player-stay" onClick={() => setEndedId(null)}>
                    {ar ? "ابقَ هنا" : "Stay here"}
                  </button>
                ) : null}
                <button type="button" className="action action-primary" onClick={() => goTo(upNext.id, { autoplay: true })}>
                  {upNext === nextLesson ? (ar ? "الدرس التالي" : "Next lesson") : ar ? "تابع التعلّم" : "Continue learning"}
                  {countdown !== null ? <span className="player-countdown" data-slot="countdown" aria-hidden="true">{countdown}</span> : null}
                </button>
              </div>
            ) : (
              <span className="player-done-chip">
                <CheckCircle2 aria-hidden="true" />
                {tr.completed}
              </span>
            )
          ) : finishState === "locked" ? (
            <button type="button" className="action action-primary" disabled>
              {nextLesson ? (ar ? "الدرس التالي" : "Next lesson") : ar ? "إنهاء الدرس" : "Finish lesson"}
            </button>
          ) : (
            <button type="button" className="action action-primary" onClick={() => markComplete(true)} disabled={!canFinish || finishing}>
              {ar ? "إنهاء الدرس" : "Finish lesson"}
            </button>
          )}
        </section>

        {prevLesson && isOpen(prevLesson.id) ? (
          <nav className="player-steps" aria-label={ar ? "التنقل بين الدروس" : "Lesson navigation"}>
            <button type="button" className="lms-reset" onClick={() => goTo(prevLesson.id)}>
              {ar ? "الدرس السابق" : "Previous lesson"}
            </button>
          </nav>
        ) : null}

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
                      const locked = !isOpen(l.id);
                      const n = lessons.findIndex((x) => x.id === l.id) + 1;
                      const kind = hasVideo(l) ? (ar ? "فيديو" : "Video") : ar ? "قراءة" : "Reading";
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            className={cn("player-lesson", active && "is-active", lessonDone && "is-done", locked && "is-locked")}
                            aria-current={active ? "step" : undefined}
                            aria-disabled={locked || undefined}
                            onClick={() => goTo(l.id)}
                          >
                            {lessonDone ? <CheckCircle2 aria-hidden="true" /> : active ? <PlayCircle aria-hidden="true" /> : locked ? <Lock aria-hidden="true" /> : <Circle aria-hidden="true" />}
                            <span className="player-lesson-text">
                              <span className="player-lesson-title">{n}. {lessonTitle(l)}</span>
                              <small>
                                {lessonDone ? tr.completed : locked ? `${kind} · ${ar ? "مقفل" : "Locked"}` : kind}
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
            isInstructor={isStaff}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
