import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/learning-management-system/student/player/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Player" }] }),
  component: Player,
});

type Section = { id: string; title: string; title_ar: string | null; title_en: string | null; display_order: number };
type Lesson = { id: string; section_id: string; title: string; title_ar: string | null; title_en: string | null; video_url: string | null; content_md: string | null; content_md_ar: string | null; content_md_en: string | null; attachments: unknown; display_order: number };

const pick = (lang: "ar" | "en", ar: string | null | undefined, en: string | null | undefined, fallback: string) => {
  if (lang === "en") return en || ar || fallback;
  return ar || en || fallback;
};
type Progress = { lesson_id: string; is_completed: boolean };

function Player() {
  const { courseId } = Route.useParams();
  const { user, role } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseInstructorId, setCourseInstructorId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: course } = await supabase.from("lms_courses").select("instructor_id").eq("id", courseId).maybeSingle();
      setCourseInstructorId((course as { instructor_id: string } | null)?.instructor_id ?? null);

      const { data: secs } = await supabase.from("lms_sections")
        .select("id,title,title_ar,title_en,display_order").eq("course_id", courseId).order("display_order");
      setSections((secs as Section[]) ?? []);
      if (secs && secs.length) {
        const ids = secs.map((s) => s.id);
        const [{ data: lss }, { data: prs }] = await Promise.all([
          supabase.from("lms_lessons").select("id,section_id,title,title_ar,title_en,video_url,content_md,content_md_ar,content_md_en,attachments,display_order").in("section_id", ids).order("display_order"),
          supabase.from("lms_lesson_progress").select("lesson_id,is_completed").eq("student_id", user.id),
        ]);
        const list = (lss as Lesson[]) ?? [];
        setLessons(list);
        setProgress((prs as Progress[]) ?? []);
        if (list.length) setCurrentId(list[0].id);
      }
      setLoading(false);
    })();
  }, [courseId, user]);

  const current = useMemo(() => lessons.find((l) => l.id === currentId) ?? null, [lessons, currentId]);
  const isDone = (id: string) => progress.find((p) => p.lesson_id === id)?.is_completed === true;
  const isRtl = lang === "ar";
  const currentTitle = current ? pick(lang, current.title_ar, current.title_en, current.title) : "";
  const currentContent = current ? pick(lang, current.content_md_ar, current.content_md_en, current.content_md ?? "") : "";

  // Resolve private video paths to fresh short-lived signed URLs
  useEffect(() => {
    let active = true;
    (async () => {
      if (!current?.video_url) { setVideoSrc(null); return; }
      if (current.video_url.startsWith("private:")) {
        const path = current.video_url.slice("private:".length);
        const { data, error } = await supabase.storage.from("lms-private").createSignedUrl(path, 60 * 60 * 2);
        if (!active) return;
        if (error) { toast.error(error.message); setVideoSrc(null); return; }
        setVideoSrc(data?.signedUrl ?? null);
      } else {
        setVideoSrc(current.video_url);
      }
    })();
    return () => { active = false; };
  }, [current]);

  const markComplete = async () => {
    if (!user || !current) return;
    const { error } = await supabase.from("lms_lesson_progress").upsert({
      lesson_id: current.id,
      student_id: user.id,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "lesson_id,student_id" });
    if (error) { toast.error(error.message); return; }
    setProgress((p) => {
      const next = p.filter((x) => x.lesson_id !== current.id);
      next.push({ lesson_id: current.id, is_completed: true });
      return next;
    });
    toast.success(tr.completed);
    const idx = lessons.findIndex((l) => l.id === current.id);
    if (idx >= 0 && idx < lessons.length - 1) setCurrentId(lessons[idx + 1].id);
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : "#");
  const attachments = Array.isArray(current?.attachments) ? (current!.attachments as { name: string; url: string }[]) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
          {current?.video_url && videoSrc ? (
            <video
              key={current.id}
              src={videoSrc}
              controls
              controlsList="nodownload"
              onEnded={markComplete}
              className="w-full h-full"
            />
          ) : (
            <div className="text-white/60 text-sm">{tr.selectLesson}</div>
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
                      <a href={safeHref(a.url)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        {a.name}
                      </a>
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
