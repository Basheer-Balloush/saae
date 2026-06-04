import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, X, Clock, FileText, ArrowLeft, ArrowRight, ChevronRight, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EnrollmentResponseViewer } from "@/components/lms/EnrollmentResponseViewer";
import { sendEnrollmentApprovedEmail } from "@/lib/lms-enrollment-email.functions";

export const Route = createFileRoute("/learning-management-system/admin/enrollment-requests")({
  head: () => ({ meta: [{ title: "LMS · Enrollment requests" }] }),
  component: AdminEnrollmentRequests,
});

type Req = {
  id: string;
  course_id: string;
  user_id: string;
  payment_method: "manual" | "online";
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  course?: { title_ar: string; title_en: string | null; price: number; students_count: number; enrollment_deadline: string | null; max_students: number | null };
};

type CourseSummary = {
  id: string;
  title_ar: string;
  title_en: string | null;
  price: number;
  students_count: number;
  enrollment_deadline: string | null;
  max_students: number | null;
  counts: { pending: number; approved: number; rejected: number; cancelled: number; total: number };
};

function AdminEnrollmentRequests() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const sendApprovedEmail = useServerFn(sendEnrollmentApprovedEmail);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "cancelled" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<{ requestId: string; courseId: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportXlsx = async () => {
    if (!selectedCourseId) return;
    setExporting(true);
    try {
      const { data: allReqs, error } = await supabase
        .from("lms_enrollment_requests")
        .select("*")
        .eq("course_id", selectedCourseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (allReqs as Req[]) ?? [];

      const { data: formRow } = await supabase
        .from("lms_course_forms").select("id").eq("course_id", selectedCourseId).maybeSingle();
      type FieldRow = { id: string; field_type: string; label_ar: string; label_en: string | null; display_order: number };
      let fields: FieldRow[] = [];
      if (formRow) {
        const { data: ff } = await supabase
          .from("lms_course_form_fields")
          .select("id,field_type,label_ar,label_en,display_order")
          .eq("form_id", formRow.id)
          .order("display_order");
        fields = (ff as FieldRow[]) ?? [];
      }

      type RespRow = { request_id: string; answers: { field_id: string; value: unknown }[] | null };
      const ids = list.map((r) => r.id);
      let responses: RespRow[] = [];
      if (ids.length) {
        const { data: rr } = await supabase
          .from("lms_enrollment_form_responses")
          .select("request_id,answers")
          .in("request_id", ids);
        responses = (rr as RespRow[]) ?? [];
      }
      const respByReq = new Map(responses.map((r) => [r.request_id, r.answers ?? []]));

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(ar ? "طلبات التسجيل" : "Enrollment requests");
      const headers = [
        ar ? "تاريخ الطلب" : "Created at",
        ar ? "الحالة" : "Status",
        ar ? "معرّف المستخدم" : "User ID",
        ar ? "طريقة الدفع" : "Payment method",
        ar ? "ملاحظات الطالب" : "Student notes",
        ar ? "ملاحظات الإدارة" : "Admin notes",
        ar ? "تاريخ القرار" : "Decided at",
        ...fields.map((f) => (ar ? f.label_ar : (f.label_en || f.label_ar))),
      ];
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };

      for (const r of list) {
        const ans = respByReq.get(r.id) ?? [];
        const ansMap = new Map(ans.map((a) => [a.field_id, a.value]));
        const fieldCells = fields.map((f) => {
          const v = ansMap.get(f.id);
          if (v === null || v === undefined || v === "") return "";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "boolean") return v ? (ar ? "نعم" : "Yes") : (ar ? "لا" : "No");
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        });
        ws.addRow([
          new Date(r.created_at).toLocaleString(ar ? "ar" : "en"),
          r.status,
          r.user_id,
          r.payment_method,
          r.notes ?? "",
          r.admin_notes ?? "",
          r.decided_at ? new Date(r.decided_at).toLocaleString(ar ? "ar" : "en") : "",
          ...fieldCells,
        ]);
      }
      ws.columns.forEach((col) => { col.width = 22; });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const courseTitle = selectedCourse ? (ar ? selectedCourse.title_ar : (selectedCourse.title_en || selectedCourse.title_ar)) : "course";
      a.href = url;
      a.download = `enrollment-requests-${courseTitle}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(ar ? "تم التصدير" : "Exported");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const loadCourses = async () => {
    setLoadingCourses(true);
    const { data: allReqs } = await supabase
      .from("lms_enrollment_requests")
      .select("course_id,status");
    const list = (allReqs as { course_id: string; status: Req["status"] }[]) ?? [];
    const courseIds = [...new Set(list.map((r) => r.course_id))];
    if (!courseIds.length) {
      setCourses([]);
      setLoadingCourses(false);
      return;
    }
    const { data: cs } = await supabase
      .from("lms_courses")
      .select("id,title_ar,title_en,price,students_count,enrollment_deadline,max_students")
      .in("id", courseIds);
    const cMap = new Map((cs ?? []).map((c) => [c.id, c]));
    const summaries: CourseSummary[] = courseIds.map((id) => {
      const c = cMap.get(id);
      const reqsForCourse = list.filter((r) => r.course_id === id);
      const counts = {
        pending: reqsForCourse.filter((r) => r.status === "pending").length,
        approved: reqsForCourse.filter((r) => r.status === "approved").length,
        rejected: reqsForCourse.filter((r) => r.status === "rejected").length,
        cancelled: reqsForCourse.filter((r) => r.status === "cancelled").length,
        total: reqsForCourse.length,
      };
      return {
        id,
        title_ar: c?.title_ar ?? id,
        title_en: c?.title_en ?? null,
        price: Number(c?.price ?? 0),
        students_count: c?.students_count ?? 0,
        enrollment_deadline: c?.enrollment_deadline ?? null,
        max_students: c?.max_students ?? null,
        counts,
      };
    }).sort((a, b) => b.counts.pending - a.counts.pending || b.counts.total - a.counts.total);
    setCourses(summaries);
    setLoadingCourses(false);
  };

  const loadReqs = async (courseId: string) => {
    setLoading(true);
    let q = supabase.from("lms_enrollment_requests").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const list = (data as Req[]) ?? [];
    if (list.length) {
      const { data: c } = await supabase
        .from("lms_courses")
        .select("id,title_ar,title_en,price,students_count,enrollment_deadline,max_students")
        .eq("id", courseId)
        .single();
      list.forEach((r) => {
        if (c) r.course = { title_ar: c.title_ar, title_en: c.title_en, price: Number(c.price), students_count: c.students_count, enrollment_deadline: c.enrollment_deadline, max_students: c.max_students };
      });
    }
    setReqs(list);
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => {
    if (selectedCourseId) loadReqs(selectedCourseId);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selectedCourseId, filter]);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === selectedCourseId) ?? null, [courses, selectedCourseId]);

  const decide = async (req: Req, action: "approve" | "reject") => {
    setBusy(req.id);
    try {
      const fn = action === "approve" ? "lms_approve_enrollment_request" : "lms_reject_enrollment_request";
      const { error } = await supabase.rpc(fn, { _request_id: req.id, _admin_notes: noteDraft[req.id] || undefined });
      if (error) throw error;
      if (action === "approve") {
        try {
          await sendApprovedEmail({ data: { requestId: req.id, lang: ar ? "ar" : "en" } });
        } catch (mailErr) {
          console.error("Failed to send approval email", mailErr);
          toast.warning(ar ? "تمت الموافقة لكن تعذّر إرسال البريد الإلكتروني" : "Approved but failed to send notification email");
        }
      }
      toast.success(ar ? (action === "approve" ? "تمت الموافقة" : "تم الرفض") : (action === "approve" ? "Approved" : "Rejected"));
      if (selectedCourseId) await loadReqs(selectedCourseId);
      await loadCourses();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally { setBusy(null); }
  };

  // ===== Course picker view =====
  if (!selectedCourseId) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">{ar ? "طلبات الاشتراك" : "Enrollment requests"}</h1>
          <p className="text-sm text-muted-foreground">{ar ? "اختر دورة لعرض طلبات التسجيل الخاصة بها." : "Pick a course to view its enrollment requests."}</p>
        </header>

        {loadingCourses ? (
          <p className="text-center py-10 text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
        ) : courses.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">{ar ? "لا توجد طلبات" : "No requests"}</p>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => {
              const title = ar ? c.title_ar : c.title_en || c.title_ar;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className="w-full text-start rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground truncate">{title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-semibold">
                        <Clock className="h-3 w-3" />
                        {ar ? "قيد المراجعة" : "Pending"}: {c.counts.pending}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-semibold">
                        {ar ? "موافَق" : "Approved"}: {c.counts.approved}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 font-semibold">
                        {ar ? "مرفوض" : "Rejected"}: {c.counts.rejected}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-muted text-muted-foreground font-semibold">
                        {ar ? "الإجمالي" : "Total"}: {c.counts.total}
                      </span>
                    </div>
                  </div>
                  {ar ? <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180 shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===== Requests for a selected course =====
  const headerTitle = selectedCourse ? (ar ? selectedCourse.title_ar : selectedCourse.title_en || selectedCourse.title_ar) : "";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedCourseId(null); setReqs([]); }} className="-ms-2">
          {ar ? <ArrowRight className="h-4 w-4 mx-1" /> : <ArrowLeft className="h-4 w-4 mx-1" />}
          {ar ? "كل الدورات" : "All courses"}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{headerTitle}</h1>
            <p className="text-sm text-muted-foreground">{ar ? "راجع وافق أو ارفض طلبات التسجيل." : "Review, approve, or reject enrollment requests."}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["pending", "approved", "rejected", "cancelled", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/70 hover:border-primary"}`}>
                {ar ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى", all: "الكل" }[f]) : f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
      ) : reqs.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">{ar ? "لا توجد طلبات" : "No requests"}</p>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => {
            const deadlinePassed = !!r.course?.enrollment_deadline && new Date(r.course.enrollment_deadline) < new Date();
            const isFull = r.course?.max_students != null && (r.course?.students_count ?? 0) >= r.course.max_students;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground font-mono">{r.user_id}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ar ? "السعر" : "Price"}: {r.course ? `${r.course.price.toLocaleString()} ${ar ? "ل.س" : "SYP"}` : "—"}
                      {" · "}{ar ? "العدد" : "Enrolled"}: {r.course?.students_count ?? "—"}{r.course?.max_students != null ? ` / ${r.course.max_students}` : ""}{r.course?.enrollment_deadline ? ` · ${ar ? "آخر موعد" : "Deadline"}: ${new Date(r.course.enrollment_deadline).toLocaleDateString(ar ? "ar" : "en")}` : ""}
                      {" · "}{new Date(r.created_at).toLocaleDateString(ar ? "ar" : "en")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                      r.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" :
                      r.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {r.status === "pending" && <Clock className="h-3 w-3" />}
                      {ar ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى" }[r.status]) : r.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase font-semibold">{r.payment_method}</span>
                  </div>
                </div>

                {r.notes && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{ar ? "ملاحظات الطالب:" : "Student notes:"}</span> {r.notes}
                  </div>
                )}
                {r.admin_notes && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{ar ? "ملاحظات الإدارة:" : "Admin notes:"}</span> {r.admin_notes}
                  </div>
                )}

                {r.status === "pending" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {deadlinePassed && <p className="text-xs text-amber-600">{ar ? "تنبيه: انتهى موعد التسجيل" : "Warning: enrollment deadline passed"}</p>}
                    {isFull && <p className="text-xs text-amber-600">{ar ? "تنبيه: اكتمل العدد" : "Warning: course is full"}</p>}
                    <Textarea
                      placeholder={ar ? "ملاحظات للإدارة (اختياري)" : "Admin notes (optional)"}
                      value={noteDraft[r.id] ?? ""}
                      onChange={(e) => setNoteDraft({ ...noteDraft, [r.id]: e.target.value })}
                      rows={2}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="secondary" onClick={() => setViewing({ requestId: r.id, courseId: r.course_id })}>
                        <FileText className="h-4 w-4 mx-1" />
                        {ar ? "عرض بيانات التسجيل" : "View form answers"}
                      </Button>
                      <Button size="sm" onClick={() => decide(r, "approve")} disabled={busy === r.id} className="flex-1 min-w-[100px]">
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Check className="h-4 w-4 mx-1" />}
                        {ar ? "موافقة" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r, "reject")} disabled={busy === r.id} className="flex-1 min-w-[100px]">
                        <X className="h-4 w-4 mx-1" />
                        {ar ? "رفض" : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
                {r.status !== "pending" && (
                  <div className="pt-2 border-t border-border">
                    <Button size="sm" variant="secondary" onClick={() => setViewing({ requestId: r.id, courseId: r.course_id })}>
                      <FileText className="h-4 w-4 mx-1" />
                      {ar ? "عرض بيانات التسجيل" : "View form answers"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <EnrollmentResponseViewer
          open={!!viewing}
          onOpenChange={(v) => { if (!v) setViewing(null); }}
          requestId={viewing.requestId}
          courseId={viewing.courseId}
        />
      )}
    </div>
  );
}
