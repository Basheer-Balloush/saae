import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCheck,
  Download,
  Loader2,
  Mail,
  Phone,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";
import { addAmsRegistrantWithLms } from "@/lib/ams-registrant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Field,
  Loading,
  Panel,
  Pill,
  StatTile,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import "@/components/console/console.css";

export type PaymentStatus = "paid" | "unpaid" | "partial" | "waived";
type Session = { id: string; title: string; session_date: string; lms_section_id: string | null };
type Registrant = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  payment_status: PaymentStatus;
  lms_enrollment_id: string | null;
};
type Mark = boolean | undefined;

export const PAY_UI: Record<
  PaymentStatus,
  { ar: string; en: string; tone: "green" | "red" | "orange" | "gray" }
> = {
  paid: { ar: "مدفوع", en: "Paid", tone: "green" },
  unpaid: { ar: "غير مدفوع", en: "Unpaid", tone: "red" },
  partial: { ar: "دفع جزئي", en: "Partly paid", tone: "orange" },
  waived: { ar: "معفى", en: "Waived", tone: "gray" },
};

/* The attendance register for one AMS course: people down the side,
   sessions across the top, one click per cell (present, then absent). On a
   phone it becomes one session at a time. Marks go through the same RPC as
   before, so course completion and certificates follow. */
export function Register({
  amsId,
  lmsCourseId,
  canDelete = true,
}: {
  amsId: string;
  lmsCourseId: string | null;
  canDelete?: boolean;
}) {
  const { t, ar, lang } = useT();
  const sendCertEmail = useServerFn(sendCertificateEmail);
  const linked = !!lmsCourseId;
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [people, setPeople] = useState<Registrant[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [studentOf, setStudentOf] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [bulk, setBulk] = useState<string | null>(null);
  const [phoneSession, setPhoneSession] = useState<string | null>(null);
  const [person, setPerson] = useState<Registrant | null>(null);
  const [adding, setAdding] = useState<"person" | "session" | null>(null);

  const load = useCallback(async () => {
    const [{ data: ss, error: e1 }, { data: rs, error: e2 }] = await Promise.all([
      supabase
        .from("ams_sessions")
        .select("id,title,session_date,lms_section_id")
        .eq("course_id", amsId)
        .order("session_date")
        .order("created_at"),
      supabase
        .from("ams_registrants")
        .select("id,full_name,email,phone,payment_status,lms_enrollment_id")
        .eq("course_id", amsId)
        .order("full_name"),
    ]);
    if (e1 || e2) toast.error(toUserMessage(e1 ?? e2));
    const sList = (ss as Session[]) ?? [];
    const rList = (rs as Registrant[]) ?? [];
    if (lmsCourseId) {
      const { data: ens } = await supabase
        .from("lms_enrollments")
        .select("id,student_id")
        .eq("course_id", lmsCourseId);
      setStudentOf(
        Object.fromEntries(
          ((ens as { id: string; student_id: string }[]) ?? []).map((e) => [e.id, e.student_id]),
        ),
      );
    }
    const m: Record<string, Mark> = {};
    if (sList.length) {
      const { data: att } = await supabase
        .from("ams_attendance")
        .select("session_id,registrant_id,present")
        .in(
          "session_id",
          sList.map((s) => s.id),
        );
      for (const a of (att as { session_id: string; registrant_id: string; present: boolean }[]) ??
        [])
        m[`${a.session_id}:${a.registrant_id}`] = a.present;
    }
    setMarks(m);
    setPeople(rList);
    setSessions(sList);
    // On a phone, start with today's session, or the latest one.
    const today = new Date().toISOString().slice(0, 10);
    setPhoneSession(
      (cur) =>
        cur ?? (sList.find((s) => s.session_date === today) ?? sList[sList.length - 1])?.id ?? null,
    );
  }, [amsId, lmsCourseId]);
  useEffect(() => {
    load();
  }, [load]);

  const mark = async (s: Session, r: Registrant, present: boolean) => {
    const key = `${s.id}:${r.id}`;
    const prev = marks[key];
    setMarks((m) => ({ ...m, [key]: present }));
    setSaving((x) => ({ ...x, [key]: true }));
    const { error } = await supabase.rpc("ams_mark_attendance_and_complete", {
      _session_id: s.id,
      _registrant_id: r.id,
      _present: present,
    });
    setSaving((x) => ({ ...x, [key]: false }));
    if (error) {
      setMarks((m) => ({ ...m, [key]: prev }));
      toast.error(toUserMessage(error));
      return false;
    }
    // Marking present may complete the course: try the certificate email (idempotent).
    const studentId = r.lms_enrollment_id ? studentOf[r.lms_enrollment_id] : undefined;
    if (present && lmsCourseId && studentId) {
      sendCertEmail({ data: { courseId: lmsCourseId, studentId, lang } }).catch((e) =>
        console.error("cert email failed", e),
      );
    }
    return true;
  };
  const allPresent = async (s: Session) => {
    const todo = people.filter((r) => marks[`${s.id}:${r.id}`] !== true);
    if (!todo.length) return;
    setBulk(s.id);
    let ok = 0;
    for (const r of todo) if (await mark(s, r, true)) ok++;
    setBulk(null);
    toast.success(t(`سُجّل حضور ${ok}`, `${ok} marked present`));
  };

  const removeSession = async (s: Session) => {
    const ok = await confirmDialog({
      title: t(`حذف جلسة «${s.title}»؟`, `Delete the session “${s.title}”?`),
      description: t("يُحذف حضورها أيضاً.", "Its attendance goes too."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("ams_sessions").delete().eq("id", s.id);
    if (error) return void toast.error(toUserMessage(error));
    load();
  };
  const removePerson = async (r: Registrant) => {
    const ok = await confirmDialog({
      title: t(`حذف ${r.full_name} من الدورة؟`, `Remove ${r.full_name} from the course?`),
      confirmLabel: t("حذف", "Remove"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("ams_registrants").delete().eq("id", r.id);
    if (error) return void toast.error(toUserMessage(error));
    setPerson(null);
    load();
  };

  const count = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of people)
      out[r.id] = (sessions ?? []).filter((s) => marks[`${s.id}:${r.id}`] === true).length;
    return out;
  }, [people, sessions, marks]);

  const exportXlsx = async () => {
    if (!sessions) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const clean = (s: string, fb: string) =>
      (s || fb)
        .replace(/[\\/?*[\]:]/g, "-")
        .trim()
        .slice(0, 28) || fb;
    const sum = wb.addWorksheet(clean(t("الملخص", "Summary"), "Summary"));
    sum.views = [{ rightToLeft: ar }];
    sum.addRow([
      t("الاسم", "Name"),
      t("البريد", "Email"),
      t("الهاتف", "Phone"),
      t("الدفع", "Payment"),
      ...sessions.map((s) => `${s.title} (${s.session_date})`),
      t("المجموع", "Total"),
    ]);
    for (const r of people)
      sum.addRow([
        r.full_name,
        r.email ?? "",
        r.phone ?? "",
        ar ? PAY_UI[r.payment_status].ar : PAY_UI[r.payment_status].en,
        ...sessions.map((s) =>
          marks[`${s.id}:${r.id}`] === true ? "✓" : marks[`${s.id}:${r.id}`] === false ? "✗" : "",
        ),
        `${count[r.id] ?? 0}/${sessions.length}`,
      ]);
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buf as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessions === null) return <Loading />;
  const avg =
    people.length && sessions.length
      ? Math.round(
          (Object.values(count).reduce((a, b) => a + b, 0) / (people.length * sessions.length)) *
            100,
        )
      : 0;
  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(ar ? "ar-SY" : "en-GB", { day: "numeric", month: "short" });
  const ps = sessions.find((s) => s.id === phoneSession) ?? null;

  const cell = (s: Session, r: Registrant, big = false) => {
    const key = `${s.id}:${r.id}`;
    const m = marks[key];
    return (
      <button
        type="button"
        className={`cx-att ${big ? "h-11 w-11" : ""}`}
        data-state={m === true ? "present" : m === false ? "absent" : "none"}
        disabled={!!saving[key]}
        onClick={() => mark(s, r, m !== true)}
        aria-label={`${r.full_name} — ${s.title}: ${m === true ? t("حاضر", "present") : m === false ? t("غائب", "absent") : t("غير مسجّل", "not marked")}`}
      >
        {saving[key] ? (
          <Loader2 className="animate-spin" />
        ) : m === true ? (
          <Check />
        ) : m === false ? (
          <X />
        ) : null}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={CalendarCheck}
          label={t("جلسات", "Sessions")}
          value={fmtNum(sessions.length, lang)}
        />
        <StatTile
          icon={Users}
          tone="green"
          label={t("أشخاص", "People")}
          value={fmtNum(people.length, lang)}
        />
        <StatTile
          icon={CheckCheck}
          tone={avg >= 75 ? "green" : "orange"}
          label={t("متوسط الحضور", "Average attendance")}
          value={`${avg}%`}
        />
      </div>

      <Panel
        title={t("سجل الحضور", "Attendance register")}
        description={t(
          "اضغط الخانة: مرة للحضور، ومرة أخرى للغياب. يُحفظ فوراً.",
          "Click a cell once for present, again for absent. It saves at once.",
        )}
        actions={
          <>
            <Button size="sm" onClick={() => setAdding("person")}>
              <UserPlus className="h-4 w-4" />
              {t("إضافة شخص", "Add person")}
            </Button>
            {!linked && (
              <Button size="sm" variant="outline" onClick={() => setAdding("session")}>
                <CalendarPlus className="h-4 w-4" />
                {t("جلسة جديدة", "New session")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!people.length}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </>
        }
        flush
      >
        {linked && (
          <p className="border-b border-[var(--cx-line-2)] px-5 py-2.5 text-[12.5px] text-[var(--cx-muted)]">
            {t(
              "الجلسات تأتي من أقسام الدورة على منصّة التعلّم.",
              "Sessions come from the course's sections on the learning platform.",
            )}
          </p>
        )}
        {sessions.length === 0 || people.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarCheck}
            title={
              sessions.length === 0
                ? t("لا توجد جلسات بعد", "No sessions yet")
                : t("لا يوجد أشخاص بعد", "No people yet")
            }
            text={
              sessions.length === 0
                ? linked
                  ? t(
                      "أضف أقساماً للدورة؛ كل قسم جلسة.",
                      "Add sections to the course; each section is a session.",
                    )
                  : t("أضف أول جلسة من الأعلى.", "Add the first session above.")
                : t("أضف أول شخص من الأعلى.", "Add the first person above.")
            }
          />
        ) : (
          <>
            {/* Phone: one session at a time, big buttons. */}
            <div className="md:hidden">
              <div className="flex gap-2 overflow-x-auto border-b border-[var(--cx-line-2)] px-4 py-3">
                {sessions.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPhoneSession(s.id)}
                    className={`shrink-0 rounded-xl border px-3 py-1.5 text-start text-[12.5px] ${phoneSession === s.id ? "border-[var(--cx-teal)] bg-[var(--cx-teal-50)]" : "border-[var(--cx-line)]"}`}
                  >
                    <div className="font-extrabold">{t(`ج${i + 1}`, `S${i + 1}`)}</div>
                    <div className="text-[var(--cx-muted)]">{shortDate(s.session_date)}</div>
                  </button>
                ))}
              </div>
              {ps && (
                <>
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="truncate text-[13.5px] font-bold">{ps.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bulk !== null}
                      onClick={() => allPresent(ps)}
                    >
                      {bulk === ps.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                      {t("الكل حاضر", "All present")}
                    </Button>
                  </div>
                  <ul className="divide-y divide-[var(--cx-line-2)]">
                    {people.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-start font-semibold"
                          onClick={() => setPerson(r)}
                        >
                          {r.full_name}
                        </button>
                        {cell(ps, r, true)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Wider screens: the whole register. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="cx-table" style={{ minWidth: 280 + sessions.length * 86 }}>
                <thead>
                  <tr>
                    <th className="sticky start-0 z-10 min-w-[210px] bg-[var(--cx-card-solid)]">
                      {t("الاسم", "Name")}
                    </th>
                    {sessions.map((s, i) => (
                      <th key={s.id} className="group text-center" title={s.title}>
                        <div className="flex items-center justify-center gap-1 font-extrabold text-[var(--cx-ink)]">
                          {t(`ج${i + 1}`, `S${i + 1}`)}
                          {canDelete && !s.lms_section_id && (
                            <button
                              type="button"
                              onClick={() => removeSession(s)}
                              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--cx-red)]"
                              aria-label={t("حذف الجلسة", "Delete session")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold">{shortDate(s.session_date)}</div>
                        <button
                          type="button"
                          className="mt-1 text-[11px] font-bold text-[var(--cx-teal)] hover:underline disabled:opacity-50"
                          onClick={() => allPresent(s)}
                          disabled={bulk !== null}
                        >
                          {bulk === s.id ? (
                            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                          ) : (
                            t("الكل حاضر", "All present")
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="text-center">{t("المجموع", "Total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((r) => {
                    const done = count[r.id] ?? 0;
                    const pct = Math.round((done / sessions.length) * 100);
                    return (
                      <tr key={r.id}>
                        <td className="sticky start-0 z-10 bg-[var(--cx-card-solid)]">
                          <button
                            type="button"
                            onClick={() => setPerson(r)}
                            className="text-start font-semibold hover:text-[var(--cx-teal)]"
                          >
                            {r.full_name}
                          </button>
                          {!linked && r.payment_status !== "paid" && (
                            <span className="ms-2">
                              <Pill tone={PAY_UI[r.payment_status].tone}>
                                {ar ? PAY_UI[r.payment_status].ar : PAY_UI[r.payment_status].en}
                              </Pill>
                            </span>
                          )}
                        </td>
                        {sessions.map((s) => (
                          <td key={s.id} className="text-center">
                            <div className="flex justify-center">{cell(s, r)}</div>
                          </td>
                        ))}
                        <td className="text-center">
                          <Pill tone={pct >= 100 ? "green" : pct >= 50 ? "orange" : "red"}>
                            {done}/{sessions.length} · {pct}%
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Sheet open={!!person} onOpenChange={(v) => !v && setPerson(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-md"
          dir={ar ? "rtl" : "ltr"}
        >
          {person && (
            <div className="space-y-4 pb-8">
              <SheetHeader className="text-start">
                <SheetTitle>{person.full_name}</SheetTitle>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={PAY_UI[person.payment_status].tone}>
                    {ar ? PAY_UI[person.payment_status].ar : PAY_UI[person.payment_status].en}
                  </Pill>
                  {person.lms_enrollment_id && (
                    <Pill tone="teal">{t("من منصّة التعلّم", "From the learning platform")}</Pill>
                  )}
                </div>
              </SheetHeader>
              <ul className="space-y-2 text-[14px]">
                <li className="flex items-center gap-2" dir="ltr">
                  <Mail className="h-4 w-4 text-[var(--cx-teal)]" />
                  {person.email || "—"}
                </li>
                <li className="flex items-center gap-2" dir="ltr">
                  <Phone className="h-4 w-4 text-[var(--cx-teal)]" />
                  {person.phone || "—"}
                </li>
              </ul>
              <div className="rounded-xl bg-[var(--cx-raise)] p-3">
                <div className="text-[13px] font-bold">
                  {t(
                    `حضر ${count[person.id] ?? 0} من ${sessions.length}`,
                    `Attended ${count[person.id] ?? 0} of ${sessions.length}`,
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sessions.map((s, i) => {
                    const m = marks[`${s.id}:${person.id}`];
                    return (
                      <span
                        key={s.id}
                        title={`${s.title} · ${fmtDate(s.session_date, lang)}`}
                        className={`rounded-md px-2 py-0.5 text-[11.5px] font-bold ${m === true ? "bg-[var(--cx-olive)] text-white" : m === false ? "bg-[var(--cx-red-50)] text-[var(--cx-red)]" : "bg-[var(--cx-raise-2)] text-[var(--cx-muted)]"}`}
                      >
                        {t(`ج${i + 1}`, `S${i + 1}`)}
                      </span>
                    );
                  })}
                </div>
              </div>
              {canDelete && !person.lms_enrollment_id && (
                <Button
                  variant="ghost"
                  className="text-[var(--cx-red)]"
                  onClick={() => removePerson(person)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("حذف من الدورة", "Remove from the course")}
                </Button>
              )}
              {person.lms_enrollment_id && (
                <p className="text-[12.5px] text-[var(--cx-muted)]">
                  {t(
                    "يُدار تسجيله من منصّة التعلّم.",
                    "Their enrolment is managed on the learning platform.",
                  )}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddPerson
        open={adding === "person"}
        onClose={() => setAdding(null)}
        amsId={amsId}
        linked={linked}
        onDone={load}
      />
      <AddSession
        open={adding === "session"}
        onClose={() => setAdding(null)}
        amsId={amsId}
        onDone={load}
      />
    </div>
  );
}

function AddPerson({
  open,
  onClose,
  amsId,
  linked,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  amsId: string;
  linked: boolean;
  onDone: () => void;
}) {
  const { t, ar, lang } = useT();
  const addWithLms = useServerFn(addAmsRegistrantWithLms);
  const [f, setF] = useState({
    full_name: "",
    email: "",
    phone: "",
    payment_status: "unpaid" as PaymentStatus,
  });
  const [hints, setHints] = useState<Registrant[]>([]);
  const [saving, setSaving] = useState(false);

  // People from other courses with a similar name, to fill their details in one click.
  useEffect(() => {
    const q = f.full_name.trim();
    if (!open || q.length < 2) return void setHints([]);
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("ams_registrants")
        .select("*")
        .ilike("full_name", `%${q}%`)
        .neq("course_id", amsId)
        .order("created_at", { ascending: false })
        .limit(20);
      const seen = new Set<string>();
      const out: Registrant[] = [];
      for (const r of (data as Registrant[]) ?? []) {
        const k = r.full_name.trim().toLowerCase();
        if (seen.has(k) || k === q.toLowerCase()) continue;
        seen.add(k);
        out.push(r);
        if (out.length >= 5) break;
      }
      setHints(out);
    }, 250);
    return () => clearTimeout(id);
  }, [f.full_name, amsId, open]);

  const submit = async () => {
    const name = f.full_name.trim();
    const email = f.email.trim();
    if (name.length < 2) return void toast.error(t("اكتب الاسم الكامل", "Enter the full name"));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return void toast.error(t("البريد غير صالح", "That email isn't valid"));
    if (linked && !email)
      return void toast.error(
        t(
          "البريد مطلوب: سيُنشأ له حساب على منصّة التعلّم",
          "Email is required: an account on the learning platform is created for them",
        ),
      );
    setSaving(true);
    try {
      if (linked) {
        const res = await addWithLms({
          data: {
            amsCourseId: amsId,
            fullName: name,
            email,
            phone: f.phone.trim() || null,
            paymentStatus: f.payment_status,
            lang,
          },
        });
        toast.success(
          res.isNewUser
            ? t("أُضيف، وأُنشئ له حساب", "Added, and an account was created")
            : t("أُضيف", "Added"),
        );
      } else {
        const { error } = await supabase
          .from("ams_registrants")
          .insert({
            course_id: amsId,
            full_name: name,
            email: email || null,
            phone: f.phone.trim() || null,
            payment_status: f.payment_status,
          });
        if (error) throw error;
        toast.success(t("أُضيف", "Added"));
      }
      setF({ full_name: "", email: "", phone: "", payment_status: "unpaid" });
      onClose();
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-md" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("إضافة شخص", "Add a person")}</DialogTitle>
          {linked && (
            <DialogDescription>
              {t(
                "يُسجَّل أيضاً في الدورة على منصّة التعلّم.",
                "They are also enrolled in the course on the learning platform.",
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("الاسم الكامل", "Full name")}>
            <Input
              autoFocus
              autoComplete="off"
              value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })}
            />
          </Field>
          {hints.length > 0 && (
            <div className="rounded-xl border border-[var(--cx-line)] p-1.5">
              <div className="px-2 pb-1 text-[11.5px] font-bold text-[var(--cx-muted)]">
                {t("من دورات سابقة", "From earlier courses")}
              </div>
              {hints.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setF({
                      ...f,
                      full_name: h.full_name,
                      email: h.email ?? "",
                      phone: h.phone ?? "",
                    });
                    setHints([]);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-start hover:bg-[var(--cx-hover)]"
                >
                  <div className="text-[13.5px] font-bold">{h.full_name}</div>
                  <div className="text-[12px] text-[var(--cx-muted)]" dir="ltr">
                    {[h.email, h.phone].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={linked ? t("البريد (مطلوب)", "Email (required)") : t("البريد", "Email")}>
              <Input
                type="email"
                dir="ltr"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </Field>
            <Field label={t("الهاتف", "Phone")}>
              <Input
                type="tel"
                dir="ltr"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t("الدفع", "Payment")}>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PAY_UI) as PaymentStatus[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setF({ ...f, payment_status: p })}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-bold ${f.payment_status === p ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white" : "border-[var(--cx-line)] text-[var(--cx-ink-2)]"}`}
                >
                  {ar ? PAY_UI[p].ar : PAY_UI[p].en}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إضافة", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSession({
  open,
  onClose,
  amsId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  amsId: string;
  onDone: () => void;
}) {
  const { t, ar } = useT();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!title.trim() || !date)
      return void toast.error(t("العنوان والتاريخ مطلوبان", "Title and date are required"));
    setSaving(true);
    const { error } = await supabase
      .from("ams_sessions")
      .insert({ course_id: amsId, title: title.trim().slice(0, 200), session_date: date });
    setSaving(false);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("أُضيفت الجلسة", "Session added"));
    setTitle("");
    onClose();
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-sm" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("جلسة جديدة", "New session")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("العنوان", "Title")}>
            <Input
              autoFocus
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("مثال: الجلسة الأولى", "e.g. Session one")}
            />
          </Field>
          <Field label={t("التاريخ", "Date")}>
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إضافة", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
