import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Plus, Trash2, Users, CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";

export const Route = createFileRoute("/attendance-management-system/")({
  component: AmsDashboard,
});

type PaymentStatus = "paid" | "unpaid" | "partial" | "waived";

type Course = {
  id: string;
  name_ar: string;
  name_en: string | null;
  created_at: string;
};

type Registrant = {
  id: string;
  course_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  payment_status: PaymentStatus;
};

type Session = {
  id: string;
  course_id: string;
  title: string;
  session_date: string;
};

function AmsDashboard() {
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const tr = amsT[lang];
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [selected, setSelected] = useState<Course | null>(null);

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("ams_courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCourses(data ?? []);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  if (selected) {
    return (
      <CourseDetail
        course={selected}
        onBack={() => {
          setSelected(null);
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
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="text-start rounded-2xl border border-border bg-card p-5 shadow-soft hover:border-primary hover:shadow-md transition-all"
            >
              <div className="font-semibold text-base">
                {lang === "ar" ? c.name_ar : c.name_en || c.name_ar}
              </div>
              {((lang === "ar" && c.name_en) || (lang === "en" && c.name_ar)) && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {lang === "ar" ? c.name_en : c.name_ar}
                </div>
              )}
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                {tr.open}
                {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </div>
            </button>
          ))}
        </div>
      )}
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
      toast.error(error.message);
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
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<Session | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from("ams_registrants").select("*").eq("course_id", course.id).order("created_at"),
      supabase.from("ams_sessions").select("*").eq("course_id", course.id).order("session_date", { ascending: false }),
    ]);
    if (r.error) toast.error(r.error.message);
    if (s.error) toast.error(s.error.message);
    setRegistrants((r.data as Registrant[]) ?? []);
    setSessions((s.data as Session[]) ?? []);
    setLoading(false);
  }, [course.id]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteRegistrant = async (id: string) => {
    if (!confirm(tr.confirmDelete)) return;
    const { error } = await supabase.from("ams_registrants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const deleteSession = async (id: string) => {
    if (!confirm(tr.confirmDelete)) return;
    const { error } = await supabase.from("ams_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
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

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {lang === "ar" ? course.name_ar : course.name_en || course.name_ar}
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-2" />
          {tr.loading}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrants */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {tr.registrants}
              </h2>
              <AddRegistrantDialog courseId={course.id} onCreated={load} />
            </div>
            {registrants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{tr.noRegistrants}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tr.fullName}</TableHead>
                      <TableHead>{tr.emailField}</TableHead>
                      <TableHead>{tr.phone}</TableHead>
                      <TableHead>{tr.paymentStatus}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrants.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell className="text-xs" dir="ltr">{r.email || "—"}</TableCell>
                        <TableCell className="text-xs" dir="ltr">{r.phone || "—"}</TableCell>
                        <TableCell>
                          <PaymentBadge status={r.payment_status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRegistrant(r.id)}
                            aria-label={tr.delete}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Sessions */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {tr.sessions}
              </h2>
              <AddSessionDialog courseId={course.id} onCreated={load} />
            </div>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSession(s.id)}
                      aria-label={tr.delete}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          onClose={() => setOpenSession(null)}
        />
      )}
    </div>
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

function AddRegistrantDialog({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("unpaid");
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const { error } = await supabase.from("ams_registrants").insert({
      course_id: courseId,
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      payment_status: parsed.data.payment_status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(tr.saved);
    setFullName("");
    setEmail("");
    setPhone("");
    setStatus("unpaid");
    setOpen(false);
    onCreated();
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
          <div>
            <Label htmlFor="fn">{tr.fullName}</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
    if (error) return toast.error(error.message);
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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ams_attendance")
        .select("registrant_id, present")
        .eq("session_id", session.id);
      if (error) {
        toast.error(error.message);
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
    const { error } = await supabase
      .from("ams_attendance")
      .upsert(
        { session_id: session.id, registrant_id: registrantId, present: next },
        { onConflict: "session_id,registrant_id" },
      );
    setSavingId(null);
    if (error) toast.error(error.message);
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
                  <TableHead>{tr.fullName}</TableHead>
                  <TableHead className="w-24 text-end">{tr.present}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrants.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {savingId === r.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <Checkbox
                          checked={!!presentMap[r.id]}
                          onCheckedChange={(v) => toggle(r.id, v === true)}
                          aria-label={tr.present}
                        />
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
