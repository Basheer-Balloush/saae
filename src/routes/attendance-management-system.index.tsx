import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toUserMessage } from "@/lib/safe-error";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Plus, Trash2, Users, CalendarDays, Loader2, Eye, FileSpreadsheet, Link2 } from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { addAmsRegistrantWithLms } from "@/lib/ams-registrant.functions";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/attendance-management-system/")({
  head: () => ({
    meta: [
      { title: "Attendance Management System — SAAE" },
      { name: "description", content: "Private SAAE attendance management dashboard for instructors to track courses, sessions, and student attendance." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Attendance Management System — SAAE" },
      { property: "og:description", content: "Private SAAE attendance dashboard for instructors." },
      { property: "og:url", content: "https://aisyria.org/attendance-management-system" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    course: typeof search.course === "string" ? search.course : undefined,
  }),
  component: AmsDashboard,
});

type PaymentStatus = "paid" | "unpaid" | "partial" | "waived";

type Course = {
  id: string;
  name_ar: string;
  name_en: string | null;
  created_at: string;
  lms_course_id: string | null;
};

type Registrant = {
  id: string;
  course_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  payment_status: PaymentStatus;
  lms_enrollment_id?: string | null;
};

type Session = {
  id: string;
  course_id: string;
  title: string;
  session_date: string;
  lms_section_id: string | null;
};

function AmsDashboard() {
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const tr = amsT[lang];
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [selected, setSelected] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const confirmDeleteCourse = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const { error } = await supabase.from("ams_courses").delete().eq("id", deleting.id);
    setDeletingBusy(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(tr.saved);
    setDeleting(null);
    loadCourses();
  };

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("ams_courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    setCourses(data ?? []);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Auto-select when ?course=<id> is provided
  useEffect(() => {
    if (!search.course || !courses || selected) return;
    const match = courses.find((c) => c.id === search.course);
    if (match) setSelected(match);
  }, [search.course, courses, selected]);

  if (selected) {
    return (
      <CourseDetail
        course={selected}
        onBack={() => {
          setSelected(null);
          if (search.course) navigate({ search: {} });
          loadCourses();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-10" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tr.courses}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr.welcome}</p>
        </div>
        <AddCourseDialog onCreated={loadCourses} />
      </div>

      {courses === null ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-2" />
          {tr.loading}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">{tr.noCourses}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div
              key={c.id}
              className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-primary hover:shadow-md transition-all"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(c);
                }}
                className="absolute top-2 end-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={tr.delete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelected(c)}
                className="w-full text-start"
              >
                <div className="font-semibold text-base pe-8">
                  {lang === "ar" ? c.name_ar : c.name_en || c.name_ar}
                </div>
                {((lang === "ar" && c.name_en) || (lang === "en" && c.name_ar)) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {lang === "ar" ? c.name_en : c.name_ar}
                  </div>
                )}
                {(c as { lms_course_id?: string | null }).lms_course_id && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {isRtl ? "مربوطة بمنصّة التدريب والتعلّم" : "Linked to Training and Learning Platform"}
                  </span>
                )}
                <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                  {tr.open}
                  {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent
          dir={isRtl ? "rtl" : "ltr"}
          className="bg-card text-card-foreground border-border max-w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6 gap-3 rounded-xl"
        >
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base sm:text-lg text-foreground">
              {tr.confirmDeleteCourse}
            </AlertDialogTitle>
            {deleting && (
              <AlertDialogDescription className="text-sm text-muted-foreground">
                {lang === "ar" ? deleting.name_ar : deleting.name_en || deleting.name_ar}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 sm:space-x-2">
            <AlertDialogCancel
              disabled={deletingBusy}
              className="mt-0 w-full sm:w-auto h-10 bg-transparent border-border text-foreground hover:bg-muted"
            >
              {tr.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingBusy}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteCourse();
              }}
              className="w-full sm:w-auto h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBusy && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {tr.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Add Course ---------------- */

const courseSchema = z.object({
  name_ar: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200).optional(),
});

function AddCourseDialog({ onCreated }: { onCreated: () => void }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [open, setOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = courseSchema.safeParse({ name_ar: nameAr, name_en: nameEn || undefined });
    if (!parsed.success) {
      toast.error(tr.required);
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("ams_courses").insert({
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en ?? null,
      created_by: uid,
    });
    setSaving(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(tr.saved);
    setNameAr("");
    setNameEn("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mx-1" />
          {tr.addCourse}
        </Button>
      </DialogTrigger>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tr.addCourse}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="name_ar">{tr.courseNameAr}</Label>
            <Input id="name_ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="name_en">{tr.courseNameEn}</Label>
            <Input id="name_en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tr.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {tr.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Course Detail ---------------- */

function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const tr = amsT[lang];
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Array<{ registrant_id: string; session_id: string; present: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [exportingSessions, setExportingSessions] = useState(false);
  const [viewing, setViewing] = useState<Registrant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from("ams_registrants").select("*").eq("course_id", course.id).order("created_at"),
      supabase.from("ams_sessions").select("*").eq("course_id", course.id).order("session_date", { ascending: false }),
    ]);
    if (r.error) toast.error(toUserMessage(r.error));
    if (s.error) toast.error(toUserMessage(s.error));
    const sessIds = (s.data ?? []).map((x) => x.id);
    let att: Array<{ registrant_id: string; session_id: string; present: boolean }> = [];
    if (sessIds.length > 0) {
      const a = await supabase
        .from("ams_attendance")
        .select("registrant_id, session_id, present")
        .in("session_id", sessIds);
      if (a.error) toast.error(toUserMessage(a.error));
      att = (a.data as typeof att) ?? [];
    }
    setRegistrants((r.data as Registrant[]) ?? []);
    setSessions((s.data as Session[]) ?? []);
    setAttendance(att);
    setLoading(false);
  }, [course.id]);

  useEffect(() => {
    load();
  }, [load]);

  const attendanceFor = (registrantId: string) =>
    attendance.filter((a) => a.registrant_id === registrantId && a.present).length;

  const deleteRegistrant = async (id: string) => {
    if (!(await confirmDialog({ title: tr.confirmDelete, destructive: true }))) return;
    const { error } = await supabase.from("ams_registrants").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error));
    load();
  };

  const deleteSession = async (id: string) => {
    if (!(await confirmDialog({ title: tr.confirmDelete, destructive: true }))) return;
    const { error } = await supabase.from("ams_sessions").delete().eq("id", id);
    if (error) return toast.error(toUserMessage(error));
    load();
  };

  const paymentLabel = (s: PaymentStatus) =>
    ({ paid: tr.paid, unpaid: tr.unpaid, partial: tr.partial, waived: tr.waived })[s];

  const courseName = lang === "ar" ? course.name_ar : course.name_en || course.name_ar;

  const downloadBlob = (buffer: ArrayBuffer, filename: string) => {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeSheetName = (name: string, fallback: string) => {
    const cleaned = (name || fallback).replace(/[\\\/\?\*\[\]:]/g, "-").trim().slice(0, 31);
    return cleaned || fallback;
  };

  const exportRegistrants = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sanitizeSheetName(tr.registrants, "Sheet1"));
    ws.addRow([tr.fullName, tr.emailField, tr.phone, tr.paymentStatus, tr.attendanceCount]);
    registrants.forEach((r) => {
      ws.addRow([
        r.full_name,
        r.email || "",
        r.phone || "",
        paymentLabel(r.payment_status),
        `${attendanceFor(r.id)} / ${sessions.length}`,
      ]);
    });
    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(buffer as ArrayBuffer, `${courseName}-${tr.registrants}.xlsx`);
  };

  const exportSessions = async (selectedIds: string[]) => {
    try {
      const wb = new ExcelJS.Workbook();
      const chosen = sessions.filter((s) => selectedIds.includes(s.id));
      if (chosen.length === 0) return;
      const used = new Set<string>();
      chosen.forEach((s, idx) => {
        const base = sanitizeSheetName(s.title || `Session ${idx + 1}`, `Session ${idx + 1}`).slice(0, 28);
        let name = base;
        let n = 2;
        while (used.has(name.toLowerCase())) {
          name = `${base} ${n++}`;
        }
        used.add(name.toLowerCase());
        const ws = wb.addWorksheet(name);
        ws.addRow([tr.fullName, tr.present]);
        registrants.forEach((r) => {
          const att = attendance.find((a) => a.session_id === s.id && a.registrant_id === r.id);
          ws.addRow([r.full_name, att?.present ? tr.present : tr.absent]);
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      downloadBlob(buffer as ArrayBuffer, `${courseName}-${tr.sessions}.xlsx`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir={isRtl ? "rtl" : "ltr"}>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {tr.back}
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{courseName}</h1>
        {course.lms_course_id && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Link2 className="h-3 w-3" />
            {tr.linkedFromLms}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-2" />
          {tr.loading}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrants */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="font-semibold inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {tr.registrants}
              </h2>
              <div className="flex items-center gap-2">
                {registrants.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportRegistrants}>
                    <FileSpreadsheet className="h-4 w-4 mx-1" />
                    {tr.exportExcel}
                  </Button>
                )}
                <AddRegistrantDialog courseId={course.id} isLinked={!!course.lms_course_id} onCreated={load} />
              </div>
            </div>
            {registrants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{tr.noRegistrants}</p>
            ) : (
              <ul className="space-y-2">
                {registrants.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {r.full_name}
                        {r.lms_enrollment_id && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                            {isRtl ? "من المنصّة" : "Platform"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tr.attendanceCount}: {attendanceFor(r.id)} / {sessions.length}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setViewing(r)} aria-label={tr.view}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!r.lms_enrollment_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRegistrant(r.id)}
                        aria-label={tr.delete}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sessions */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="font-semibold inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {tr.sessions}
              </h2>
              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setExportingSessions(true)}>
                    <FileSpreadsheet className="h-4 w-4 mx-1" />
                    {tr.exportExcel}
                  </Button>
                )}
                {!course.lms_course_id && <AddSessionDialog courseId={course.id} onCreated={load} />}
              </div>
            </div>
            {course.lms_course_id && (
              <p className="text-xs text-muted-foreground mb-3 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                {tr.sessionsFromSectionsHint}
              </p>
            )}
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{tr.noSessions}</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"
                  >
                    <button
                      onClick={() => setOpenSession(s)}
                      className="flex-1 text-start"
                    >
                      <div className="font-medium text-sm">{s.title}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{s.session_date}</div>
                    </button>
                    {!s.lms_section_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSession(s.id)}
                        aria-label={tr.delete}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {openSession && (
        <SessionAttendanceDialog
          session={openSession}
          registrants={registrants}
          onClose={() => { setOpenSession(null); load(); }}
        />
      )}

      {viewing && (
        <RegistrantDetailsDialog
          registrant={viewing}
          attendanceCount={attendanceFor(viewing.id)}
          totalSessions={sessions.length}
          onClose={() => setViewing(null)}
        />
      )}

      {exportingSessions && (
        <ExportSessionsDialog
          sessions={sessions}
          onClose={() => setExportingSessions(false)}
          onExport={(ids) => {
            exportSessions(ids);
            setExportingSessions(false);
          }}
        />
      )}
    </div>
  );
}

function RegistrantDetailsDialog({
  registrant,
  attendanceCount,
  totalSessions,
  onClose,
}: {
  registrant: Registrant;
  attendanceCount: number;
  totalSessions: number;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const tr = amsT[lang];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tr.details}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label={tr.fullName} value={registrant.full_name} />
          <Row label={tr.emailField} value={registrant.email || "—"} ltr />
          <Row label={tr.phone} value={registrant.phone || "—"} ltr />
          <Row
            label={tr.paymentStatus}
            value={<PaymentBadge status={registrant.payment_status} />}
          />
          <Row label={tr.attendanceCount} value={`${attendanceCount} / ${totalSessions}`} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {tr.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function ExportSessionsDialog({
  sessions,
  onClose,
  onExport,
}: {
  sessions: Session[];
  onClose: () => void;
  onExport: (ids: string[]) => void;
}) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sessions.map((s) => [s.id, true])),
  );
  const allChecked = sessions.every((s) => selected[s.id]);
  const toggleAll = (next: boolean) => {
    setSelected(Object.fromEntries(sessions.map((s) => [s.id, next])));
  };
  const selectedIds = sessions.filter((s) => selected[s.id]).map((s) => s.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tr.selectSessionsToExport}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 cursor-pointer">
            <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(v === true)} />
            <span className="font-medium text-sm">{tr.selectAll}</span>
          </label>
          {sessions.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 cursor-pointer"
            >
              <Checkbox
                checked={!!selected[s.id]}
                onCheckedChange={(v) =>
                  setSelected((p) => ({ ...p, [s.id]: v === true }))
                }
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {s.session_date}
                </div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {tr.cancel}
          </Button>
          <Button
            onClick={() => onExport(selectedIds)}
            disabled={selectedIds.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mx-1" />
            {tr.export}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    paid: { label: tr.paid, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    unpaid: { label: tr.unpaid, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    partial: { label: tr.partial, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    waived: { label: tr.waived, cls: "bg-muted text-muted-foreground border-border" },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

/* ---------------- Add Registrant ---------------- */

const registrantSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  payment_status: z.enum(["paid", "unpaid", "partial", "waived"]),
});

function AddRegistrantDialog({ courseId, isLinked, onCreated }: { courseId: string; isLinked: boolean; onCreated: () => void }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const addWithLms = useServerFn(addAmsRegistrantWithLms);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("unpaid");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Registrant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced lookup of previous registrants by name (across courses).
  useEffect(() => {
    if (!open) return;
    const q = fullName.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from("ams_registrants")
        .select("*")
        .ilike("full_name", `%${q}%`)
        .neq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return;
      // Keep only the most recent record per unique full_name.
      const seen = new Set<string>();
      const unique: Registrant[] = [];
      for (const r of (data as Registrant[]) ?? []) {
        const key = r.full_name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(r);
        if (unique.length >= 6) break;
      }
      setSuggestions(unique);
    }, 200);
    return () => clearTimeout(handle);
  }, [fullName, courseId, open]);

  const applySuggestion = (r: Registrant) => {
    setFullName(r.full_name);
    setEmail(r.email ?? "");
    setPhone(r.phone ?? "");
    setShowSuggestions(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registrantSchema.safeParse({
      full_name: fullName,
      email,
      phone,
      payment_status: status,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? tr.required);
      return;
    }
    if (isLinked && !parsed.data.email) {
      toast.error(tr.emailRequired);
      return;
    }
    setSaving(true);
    try {
      if (isLinked) {
        const res = await addWithLms({
          data: {
            amsCourseId: courseId,
            fullName: parsed.data.full_name,
            email: parsed.data.email!,
            phone: parsed.data.phone || null,
            paymentStatus: parsed.data.payment_status,
            lang,
          },
        });
        toast.success(res.isNewUser ? tr.accountCreated : tr.saved);
      } else {
        const { error } = await supabase.from("ams_registrants").insert({
          course_id: courseId,
          full_name: parsed.data.full_name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          payment_status: parsed.data.payment_status,
        });
        if (error) throw error;
        toast.success(tr.saved);
      }
      setFullName("");
      setEmail("");
      setPhone("");
      setStatus("unpaid");
      setSuggestions([]);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mx-1" />
          {tr.addRegistrant}
        </Button>
      </DialogTrigger>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tr.addRegistrant}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Label htmlFor="fn">{tr.fullName}</Label>
            <Input
              id="fn"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-56 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                  {tr.previousRegistrants}
                </div>
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySuggestion(s);
                    }}
                    className="w-full text-start px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.full_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate" dir="ltr">
                        {s.email || ""}{s.email && s.phone ? " · " : ""}{s.phone || ""}
                      </div>
                    </div>
                    <span className="text-[11px] text-primary shrink-0">{tr.useDetails}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="em">{tr.emailField}</Label>
            <Input id="em" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ph">{tr.phone}</Label>
            <Input id="ph" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>{tr.paymentStatus}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">{tr.unpaid}</SelectItem>
                <SelectItem value="paid">{tr.paid}</SelectItem>
                <SelectItem value="partial">{tr.partial}</SelectItem>
                <SelectItem value="waived">{tr.waived}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tr.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {tr.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Add Session ---------------- */

const sessionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  session_date: z.string().min(1),
});

function AddSessionDialog({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = sessionSchema.safeParse({ title, session_date: date });
    if (!parsed.success) return toast.error(tr.required);
    setSaving(true);
    const { error } = await supabase.from("ams_sessions").insert({
      course_id: courseId,
      title: parsed.data.title,
      session_date: parsed.data.session_date,
    });
    setSaving(false);
    if (error) return toast.error(toUserMessage(error));
    toast.success(tr.saved);
    setTitle("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mx-1" />
          {tr.addSession}
        </Button>
      </DialogTrigger>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tr.addSession}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="st">{tr.sessionTitle}</Label>
            <Input id="st" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="sd">{tr.sessionDate}</Label>
            <Input id="sd" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tr.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {tr.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Session Attendance ---------------- */

function SessionAttendanceDialog({
  session,
  registrants,
  onClose,
}: {
  session: Session;
  registrants: Registrant[];
  onClose: () => void;
}) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const sendCertEmail = useServerFn(sendCertificateEmail);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ams_attendance")
        .select("registrant_id, present")
        .eq("session_id", session.id);
      if (error) {
        toast.error(toUserMessage(error));
        setLoading(false);
        return;
      }
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) map[row.registrant_id] = row.present;
      setPresentMap(map);
      setLoading(false);
    })();
  }, [session.id]);

  const toggle = async (registrantId: string, next: boolean) => {
    setPresentMap((p) => ({ ...p, [registrantId]: next }));
    setSavingId(registrantId);
    const { error } = await supabase.rpc("ams_mark_attendance_and_complete", {
      _session_id: session.id,
      _registrant_id: registrantId,
      _present: next,
    });
    setSavingId(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    // If marking present, opportunistically try to send the cert email; the
    // server fn is idempotent — it silently returns when no certificate exists.
    if (next) {
      const reg = registrants.find((r) => r.id === registrantId);
      if (reg?.lms_enrollment_id) {
        const { data: enr } = await supabase
          .from("lms_enrollments")
          .select("student_id, course_id")
          .eq("id", reg.lms_enrollment_id)
          .maybeSingle();
        if (enr?.student_id && enr?.course_id) {
          sendCertEmail({
            data: { courseId: enr.course_id, studentId: enr.student_id, lang },
          }).catch((e) => console.error("cert email failed", e));
        }
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tr.attendance} — {session.title}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-2" />
            {tr.loading}
          </div>
        ) : registrants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tr.noRegistrants}</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{tr.fullName}</TableHead>
                  <TableHead className="w-24 text-center">{tr.present}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrants.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-start">{r.full_name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Checkbox
                          checked={!!presentMap[r.id]}
                          onCheckedChange={(v) => toggle(r.id, v === true)}
                          aria-label={tr.present}
                        />
                        {savingId === r.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {tr.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
