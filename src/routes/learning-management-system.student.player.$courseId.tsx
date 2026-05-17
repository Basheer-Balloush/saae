import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PlayCircle, Circle, MessageSquare, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learning-management-system/student/player/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Player" }] }),
  component: Player,
});

type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; video_url: string | null; content_md: string | null; attachments: unknown; display_order: number };
type Progress = { lesson_id: string; is_completed: boolean };

function Player() {
  const { courseId } = Route.useParams();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: secs } = await supabase.from("lms_sections")
        .select("id,title,display_order").eq("course_id", courseId).order("display_order");
      setSections((secs as Section[]) ?? []);
      if (secs && secs.length) {
        const ids = secs.map((s) => s.id);
        const [{ data: lss }, { data: prs }] = await Promise.all([
          supabase.from("lms_lessons").select("id,section_id,title,video_url,content_md,attachments,display_order").in("section_id", ids).order("display_order"),
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

  const attachments = Array.isArray(current?.attachments) ? (current!.attachments as { name: string; url: string }[]) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
          {current?.video_url ? (
            <video
              key={current.id}
              src={current.video_url}
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
            <div className="mt-4 flex items-start justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{current.title}</h1>
              <Button onClick={markComplete} disabled={isDone(current.id)} size="sm">
                <CheckCircle2 className="h-4 w-4 mx-1" />
                {isDone(current.id) ? tr.completed : tr.markCompleted}
              </Button>
            </div>

            {current.content_md && (
              <div className="mt-4 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {current.content_md}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Paperclip className="h-4 w-4" />{tr.attachments}</h3>
                <ul className="mt-2 space-y-1.5">
                  {attachments.map((a, i) => (
                    <li key={i}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
              <h3 className="mt-2 font-bold text-foreground">{tr.qa}</h3>
              <p className="text-sm text-muted-foreground">{tr.qaComingSoon}</p>
            </div>
          </>
        )}
      </div>

      <aside className="rounded-2xl border border-border bg-card overflow-hidden self-start lg:sticky lg:top-24 max-h-[80vh] overflow-y-auto">
        {sections.map((s) => (
          <div key={s.id}>
            <div className="px-4 py-2.5 bg-muted/40 font-semibold text-foreground text-sm">{s.title}</div>
            <ul>
              {lessons.filter((l) => l.section_id === s.id).map((l) => {
                const done = isDone(l.id);
                const active = l.id === currentId;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setCurrentId(l.id)}
                      className={cn(
                        "w-full flex items-start gap-2 px-4 py-2.5 text-sm text-start hover:bg-muted/50 transition-colors border-b border-border/50",
                        active && "bg-primary/10 text-primary font-semibold",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> :
                        active ? <PlayCircle className="h-4 w-4 mt-0.5 shrink-0" /> :
                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                      <span className="flex-1">{l.title}</span>
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
