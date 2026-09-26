import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  StickyNote,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { selectInBatches } from "@/lib/select-in-batches";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useCourseParticipantNames } from "@/hooks/useCourseParticipantNames";
import { exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";
import { sendEnrollmentApprovedEmail } from "@/lib/lms-enrollment-email.functions";
import { getEmailsForUsers } from "@/lib/lms-admin-users.functions";
import { enrollmentErrorMessage } from "@/lib/lms-enrollment-errors";
import { BASE_FIELD_IDS } from "@/components/lms/EnrollmentFormDialog";
import { EnrollmentResponseViewer } from "@/components/lms/EnrollmentResponseViewer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import {
  EmptyState,
  Loading,
  Pill,
  RequestStatusPill,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { ConfirmationMessagesDialog } from "./ConfirmationMessagesDialog";

type ReqStatus = "pending" | "approved" | "rejected" | "cancelled";
type Filter = ReqStatus | "all";

type Req = {
  id: string;
  course_id: string;
  user_id: string;
  payment_method: "manual" | "online";
  status: ReqStatus;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
};

type CourseInfo = {
  title_ar: string;
  title_en: string | null;
  slug: string | null;
  price: number;
  students_count: number;
  enrollment_deadline: string | null;
  max_students: number | null;
  approval_whatsapp_message_ar: string | null;
  approval_whatsapp_message_en: string | null;
};

type Profile = { full_name: string | null; phone: string | null; email: string | null };

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function normalizePhone(raw: string): string {
  let p = (raw || "").trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  else if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = "963" + p.slice(1); // default Syria
  return p.replace(/\D/g, "");
}

/* Enrollment requests for one course. Admins decide (approve with email or
   WhatsApp, reject, add notes, export, edit the confirmation messages);
   instructors see the same list read-only, since only admins may approve. */
export function EnrollmentRequestsPanel({
  courseId,
  canDecide,
  onChanged,
  initialFilter = "pending",
}: {
  courseId: string;
  canDecide: boolean;
  /** Called after a decision, so the page can refresh its own numbers. */
  onChanged?: () => void;
  initialFilter?: Filter;
}) {
  const { t, ar, lang } = useT();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useLmsAuth();
  const participants = useCourseParticipantNames(courseId, user?.id, authLoading);
  const sendApprovedEmail = useServerFn(sendEnrollmentApprovedEmail);
  const fetchEmails = useServerFn(getEmailsForUsers);

  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState<string | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [{ data: list }, { data: c }] = await Promise.all([
      supabase
        .from("lms_enrollment_requests")
        .select(
          "id,course_id,user_id,payment_method,status,notes,admin_notes,created_at,decided_at",
        )
        .eq("course_id", courseId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lms_courses")
        .select(
          "title_ar,title_en,slug,price,students_count,enrollment_deadline,max_students,approval_whatsapp_message_ar,approval_whatsapp_message_en",
        )
        .eq("id", courseId)
        .maybeSingle(),
    ]);
    const rows = (list as Req[]) ?? [];
    setReqs(rows);
    setCourse((c as CourseInfo | null) ?? null);
    if (canDecide && rows.length) {
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const [profs, emails] = await Promise.all([
        selectInBatches<{ user_id: string; full_name: string | null; phone: string | null }>(
          "lms_user_profiles",
          "user_id,full_name,phone",
          "user_id",
          ids,
        ),
        fetchEmails({ data: { userIds: ids } }).catch(() => ({
          emails: {} as Record<string, string>,
          names: {} as Record<string, string>,
        })),
      ]);
      const emailMap = (emails?.emails ?? {}) as Record<string, string>;
      const nameMap = ((emails as { names?: Record<string, string> })?.names ?? {}) as Record<
        string,
        string
      >;
      const map: Record<string, Profile> = {};
      for (const id of ids)
        map[id] = { full_name: nameMap[id] ?? null, phone: null, email: emailMap[id] ?? null };
      for (const p of (profs as {
        user_id: string;
        full_name: string | null;
        phone: string | null;
      }[]) ?? []) {
        map[p.user_id] = {
          ...map[p.user_id],
          full_name: p.full_name || map[p.user_id]?.full_name || null,
          phone: p.phone,
        };
      }
      setProfiles(map);
    }
  }, [courseId, canDecide, fetchEmails]);

  useEffect(() => {
    setReqs(null);
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, cancelled: 0, all: 0 };
    for (const r of reqs ?? []) {
      c[r.status]++;
      c.all++;
    }
    return c;
  }, [reqs]);

  const shown = (reqs ?? []).filter((r) => filter === "all" || r.status === filter);
  const nameOf = (uid: string) =>
    profiles[uid]?.full_name ||
    participants.names[uid]?.trim() ||
    profiles[uid]?.email ||
    (participants.loading
      ? t("جارٍ تحميل الاسم…", "Loading name…")
      : t("مستخدم غير معروف", "Unknown user"));

  const deadlinePassed =
    !!course?.enrollment_deadline && new Date(course.enrollment_deadline) < new Date();
  const isFull =
    course?.max_students != null && (course?.students_count ?? 0) >= course.max_students;

  const openWhatsApp = async (req: Req) => {
    const { data: resp } = await supabase
      .from("lms_enrollment_form_responses")
      .select("answers")
      .eq("request_id", req.id)
      .maybeSingle();
    const answers = (resp?.answers as { field_id: string; value: unknown }[] | null) ?? [];
    const get = (id: string) => {
      const a = answers.find((x) => x.field_id === id);
      return typeof a?.value === "string" ? a.value : "";
    };
    const phone = normalizePhone(get(BASE_FIELD_IDS.phone));
    const studentName = get(BASE_FIELD_IDS.fullName);
    if (!phone) {
      toast.warning(t("لا يوجد رقم هاتف صالح للطالب", "Student has no valid phone number"));
      return;
    }
    const courseTitle = ar
      ? course?.title_ar || course?.title_en || ""
      : course?.title_en || course?.title_ar || "";
    const siteName = ar ? "الجمعية السورية للذكاء الاصطناعي" : "AI Syria";
    const courseUrl = course?.slug
      ? `${window.location.origin}/learning-management-system/courses/${course.slug}`
      : "";
    const defaultAr = `مرحباً ${studentName || ""}،\nيسعدنا إخبارك بأنه قد تمت الموافقة على تسجيلك في دورة "${courseTitle}".\nمرحباً بك في ${siteName}.`;
    const defaultEn = `Hi ${studentName || ""},\nYour enrollment in "${courseTitle}" has been approved.\nWelcome to ${siteName}.`;
    const tpl = ar
      ? course?.approval_whatsapp_message_ar || defaultAr
      : course?.approval_whatsapp_message_en || defaultEn;
    const message = renderTemplate(tpl, {
      student_name: studentName,
      course_title: courseTitle,
      site_name: siteName,
      course_url: courseUrl,
    });
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const decide = async (req: Req, action: "approve" | "reject", notify?: "email" | "whatsapp") => {
    if (busy) return; // one decision at a time
    setBusy(req.id);
    try {
      if (action === "approve") {
        const { error } = await supabase.rpc("lms_approve_enrollment_request", {
          _request_id: req.id,
          _admin_notes: notes[req.id] || undefined,
        });
        if (error) throw error;
        // Notifications run only after the approval transaction succeeded.
        if (notify === "email") {
          try {
            await sendApprovedEmail({ data: { requestId: req.id, lang } });
          } catch (mailErr) {
            console.error("Failed to send approval email", mailErr);
            toast.warning(
              t(
                "تمت الموافقة لكن تعذّر إرسال البريد الإلكتروني",
                "Approved but failed to send notification email",
              ),
            );
          }
        } else if (notify === "whatsapp") {
          await openWhatsApp(req).catch((e) => console.error("Failed to open WhatsApp", e));
        }
      } else {
        const { error } = await supabase.rpc("lms_reject_enrollment_request", {
          _request_id: req.id,
          _admin_notes: notes[req.id] || undefined,
        });
        if (error) throw error;
      }
      toast.success(
        action === "approve" ? t("تمت الموافقة", "Approved") : t("تم الرفض", "Rejected"),
      );
      await load();
      qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
      onChanged?.();
    } catch (e) {
      toast.error(enrollmentErrorMessage(e, ar));
    } finally {
      setBusy(null);
    }
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase
        .from("lms_enrollment_requests")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (all as Req[]) ?? [];
      const { data: formRow } = await supabase
        .from("lms_course_forms")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();
      type FieldRow = {
        id: string;
        field_type: string;
        label_ar: string;
        label_en: string | null;
        display_order: number;
      };
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
      const byReq = new Map(responses.map((r) => [r.request_id, r.answers ?? []]));
      type ExportRow = { req: Req; ans: Map<string, unknown> };
      const rows: ExportRow[] = list.map((r) => ({
        req: r,
        ans: new Map((byReq.get(r.id) ?? []).map((a) => [a.field_id, a.value])),
      }));
      const text = (ans: Map<string, unknown>, id: string): string => {
        const v = ans.get(id);
        if (v === null || v === undefined) return "";
        if (Array.isArray(v)) return v.join(", ");
        if (typeof v === "boolean") return v ? t("نعم", "Yes") : t("لا", "No");
        if (typeof v === "object") {
          try {
            return JSON.stringify(v);
          } catch {
            return "";
          }
        }
        return String(v);
      };
      // Export the course enrollment-form answers (not the account profile data).
      const columns: XlsxColumn<ExportRow>[] = [
        {
          header: t("الاسم الكامل", "Full name"),
          type: "text",
          width: 26,
          get: ({ ans }) => text(ans, BASE_FIELD_IDS.fullName),
        },
        {
          header: t("البريد الإلكتروني", "Email"),
          type: "text",
          width: 32,
          get: ({ ans }) => text(ans, BASE_FIELD_IDS.email),
        },
        {
          header: t("رقم الهاتف", "Phone"),
          type: "text",
          width: 20,
          get: ({ ans }) => text(ans, BASE_FIELD_IDS.phone),
        },
        {
          header: t("تاريخ الطلب", "Created at"),
          type: "date",
          width: 20,
          get: ({ req }) => req.created_at,
        },
        { header: t("الحالة", "Status"), type: "text", width: 14, get: ({ req }) => req.status },
        {
          header: t("طريقة الدفع", "Payment method"),
          type: "text",
          width: 18,
          get: ({ req }) => req.payment_method,
        },
        {
          header: t("ملاحظات الطالب", "Student notes"),
          type: "text",
          width: 32,
          get: ({ req }) => req.notes ?? "",
        },
        {
          header: t("ملاحظات الإدارة", "Admin notes"),
          type: "text",
          width: 32,
          get: ({ req }) => req.admin_notes ?? "",
        },
        {
          header: t("تاريخ القرار", "Decided at"),
          type: "date",
          width: 20,
          get: ({ req }) => req.decided_at,
        },
        ...fields.map((f): XlsxColumn<ExportRow> => ({
          header: ar ? f.label_ar : f.label_en || f.label_ar,
          type: "text",
          width: 24,
          get: ({ ans }) => text(ans, f.id),
        })),
      ];
      const courseTitle = course
        ? ar
          ? course.title_ar
          : course.title_en || course.title_ar
        : "course";
      await exportRowsToXlsx<ExportRow>({
        filenameBase: `enrollment-requests-${courseTitle}`,
        sheetName: t("طلبات التسجيل", "Enrollment requests"),
        rtl: ar,
        columns,
        rows,
      });
      toast.success(t("تم التصدير", "Exported"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: t("بانتظار القرار", "Pending"), count: counts.pending },
            { value: "approved", label: t("مقبولة", "Approved"), count: counts.approved },
            { value: "rejected", label: t("مرفوضة", "Rejected"), count: counts.rejected },
            { value: "cancelled", label: t("ملغاة", "Cancelled"), count: counts.cancelled },
            { value: "all", label: t("الكل", "All"), count: counts.all },
          ]}
        />
        {canDecide && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setMessagesOpen(true)}>
              <Mail className="h-4 w-4" />
              {t("رسائل التأكيد", "Confirmation messages")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportXlsx}
              disabled={exporting || !reqs?.length}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("تصدير Excel", "Export Excel")}
            </Button>
          </div>
        )}
      </div>

      {canDecide && filter === "pending" && counts.pending > 0 && (deadlinePassed || isFull) && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--cx-orange-50)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--cx-orange-ink)]">
          <AlertTriangle className="h-4 w-4" />
          {[
            deadlinePassed && t("انتهى موعد التسجيل", "The enrollment deadline has passed"),
            isFull && t("اكتمل عدد الطلاب", "The course is full"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {reqs === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cx-line)]">
          <EmptyState
            compact
            icon={Inbox}
            title={
              filter === "pending"
                ? t("لا توجد طلبات بانتظار القرار", "No requests waiting")
                : t("لا توجد طلبات", "No requests")
            }
          />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((r) => {
            const p = profiles[r.user_id];
            const pending = r.status === "pending";
            return (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--cx-line)] bg-[var(--cx-field)] p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[15px] font-extrabold text-[var(--cx-teal)]">
                    {nameOf(r.user_id).slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold">{nameOf(r.user_id)}</span>
                      <RequestStatusPill status={r.status} />
                      <Pill tone="gray">
                        {r.payment_method === "manual"
                          ? t("دفع يدوي", "Manual payment")
                          : t("دفع إلكتروني", "Online payment")}
                      </Pill>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-[var(--cx-muted)]">
                      {p?.email && (
                        <span dir="ltr" className="me-2">
                          {p.email}
                        </span>
                      )}
                      {p?.phone && (
                        <span dir="ltr" className="me-2">
                          {p.phone}
                        </span>
                      )}
                      {t("طلب في", "Requested")} {fmtDate(r.created_at, lang)}
                      {r.decided_at &&
                        ` · ${t("القرار", "Decided")} ${fmtDate(r.decided_at, lang)}`}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setViewing(r.id)}>
                    <FileText className="h-4 w-4" />
                    {t("بيانات التسجيل", "Form answers")}
                  </Button>
                </div>

                {(r.notes || r.admin_notes) && (
                  <div className="mt-3 space-y-1.5">
                    {r.notes && (
                      <p className="rounded-lg bg-[var(--cx-raise-2)] px-3 py-2 text-[13.5px]">
                        <span className="text-[12px] font-bold text-[var(--cx-muted)]">
                          {t("ملاحظة الطالب: ", "Student note: ")}
                        </span>
                        {r.notes}
                      </p>
                    )}
                    {r.admin_notes && (
                      <p className="rounded-lg bg-[var(--cx-teal-50)] px-3 py-2 text-[13.5px]">
                        <span className="text-[12px] font-bold text-[var(--cx-teal-700)]">
                          {t("ملاحظة الإدارة: ", "Admin note: ")}
                        </span>
                        {r.admin_notes}
                      </p>
                    )}
                  </div>
                )}

                {canDecide && pending && (
                  <div className="mt-3 border-t border-[var(--cx-line-2)] pt-3">
                    {noteOpen[r.id] && (
                      <Textarea
                        className="mb-2"
                        rows={2}
                        autoFocus
                        placeholder={t(
                          "ملاحظة الإدارة (يراها الطالب مع القرار)",
                          "Admin note (the student sees it with the decision)",
                        )}
                        value={notes[r.id] ?? ""}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => decide(r, "approve", "email")}
                        disabled={busy === r.id}
                      >
                        {busy === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        {t("قبول + بريد", "Approve + email")}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[var(--cx-olive)] text-white hover:bg-[#5a7c35]"
                        onClick={() => decide(r, "approve", "whatsapp")}
                        disabled={busy === r.id}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("قبول + واتساب", "Approve + WhatsApp")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(r, "reject")}
                        disabled={busy === r.id}
                      >
                        <X className="h-4 w-4" />
                        {t("رفض", "Reject")}
                      </Button>
                      {!noteOpen[r.id] && (
                        <button
                          type="button"
                          className="ms-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
                          onClick={() => setNoteOpen({ ...noteOpen, [r.id]: true })}
                        >
                          <StickyNote className="h-4 w-4" />
                          {t("إضافة ملاحظة", "Add a note")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {canDecide && r.status === "approved" && (
                  <div className="mt-3 border-t border-[var(--cx-line-2)] pt-3">
                    <Button size="sm" variant="outline" onClick={() => openWhatsApp(r)}>
                      <MessageCircle className="h-4 w-4 text-[var(--cx-green)]" />
                      {t("إرسال عبر واتساب", "Send via WhatsApp")}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!reqs?.length && (
        <p className="mt-3 text-[12.5px] text-[var(--cx-muted)]">
          {t(
            `المسجّلون حالياً: ${fmtNum(course?.students_count, lang)}`,
            `Currently enrolled: ${fmtNum(course?.students_count, lang)}`,
          )}
          {course?.max_students != null && ` / ${fmtNum(course.max_students, lang)}`}
        </p>
      )}

      {viewing && (
        <EnrollmentResponseViewer
          open
          onOpenChange={(v) => {
            if (!v) setViewing(null);
          }}
          requestId={viewing}
          courseId={courseId}
        />
      )}
      {canDecide && (
        <ConfirmationMessagesDialog
          courseId={courseId}
          open={messagesOpen}
          onOpenChange={(v) => {
            setMessagesOpen(v);
            if (!v) load();
          }}
        />
      )}
    </div>
  );
}
