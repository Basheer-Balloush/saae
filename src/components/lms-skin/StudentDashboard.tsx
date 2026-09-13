import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { courseDestination } from "@/lib/lms-course-destination";
import { isCourseEnded } from "@/lib/lms-course-ended";
import { SubHero } from "./SubHero";
import { Counter } from "./Reveal";
import { IconCategoryAI, IconCertificate } from "./icons";

type CourseRow = {
  id: string;
  title_ar: string;
  title_en: string | null;
  cover_url: string | null;
  delivery_mode: string | null;
  end_date: string | null;
};
type Row = {
  id: string;
  progress: number;
  course: CourseRow | null;
};
type Cert = { id: string; serial: string; issued_at: string; course_id: string; title?: string };
type Req = {
  id: string;
  course_id: string;
  payment_method: "manual" | "online";
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  course?: { title_ar: string; title_en: string | null; cover_url: string | null };
};

type Tab = "courses" | "requests";

const STATUS_CLASS: Record<Req["status"], string> = {
  pending: "is-pending",
  approved: "is-open",
  rejected: "is-rejected",
  cancelled: "is-cancelled",
};

/**
 * The student dashboard in Moaz's design: numbers band plus the My courses /
 * Registration requests tabs. /student opens on courses and
 * /student/requests on requests; the data and actions are those of the two
 * pages it replaces.
 */
export function StudentDashboard({ initialTab }: { initialTab: Tab }) {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ courses: null, requests: null });

  const [rows, setRows] = useState<Row[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: enrolls }, { data: cs }] = await Promise.all([
        supabase
          .from("lms_enrollments")
          .select("id, progress, course_id")
          .eq("student_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("lms_certificates")
          .select("id,serial,issued_at,course_id")
          .eq("student_id", user.id)
          .order("issued_at", { ascending: false }),
      ]);
      const list = (enrolls as { id: string; progress: number; course_id: string }[] | null) ?? [];
      const certList = (cs as Cert[] | null) ?? [];
      const ids = Array.from(
        new Set([...list.map((r) => r.course_id), ...certList.map((c) => c.course_id)]),
      );
      let courses: CourseRow[] = [];
      if (ids.length) {
        const { data: csR } = await supabase
          .from("lms_courses")
          .select("id,title_ar,title_en,cover_url,delivery_mode,end_date")
          .in("id", ids);
        courses = (csR as CourseRow[] | null) ?? [];
      }
      setRows(
        list.map((r) => ({
          id: r.id,
          progress: r.progress,
          course: courses.find((c) => c.id === r.course_id) ?? null,
        })),
      );
      setCerts(
        certList.map((c) => ({
          ...c,
          title: (() => {
            const co = courses.find((x) => x.id === c.course_id);
            return co ? (lang === "ar" ? co.title_ar : co.title_en || co.title_ar) : "";
          })(),
        })),
      );
      setLoading(false);
    })();
  }, [user, lang]);

  const loadReqs = async () => {
    if (!user) return;
    setReqLoading(true);
    const { data } = await supabase
      .from("lms_enrollment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data as Req[]) ?? [];
    if (list.length) {
      const ids = [...new Set(list.map((r) => r.course_id))];
      const { data: cs } = await supabase.from("lms_courses").select("id,title_ar,title_en,cover_url").in("id", ids);
      const map = new Map((cs ?? []).map((c) => [c.id, c]));
      list.forEach((r) => {
        const c = map.get(r.course_id);
        if (c) r.course = { title_ar: c.title_ar, title_en: c.title_en, cover_url: c.cover_url };
      });
    }
    setReqs(list);
    setReqLoading(false);
  };

  useEffect(() => { loadReqs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const cancel = async (id: string) => {
    if (!(await confirmDialog({ title: ar ? "إلغاء الطلب؟" : "Cancel this request?", destructive: true }))) return;
    setBusy(id);
    const { error } = await supabase.from("lms_enrollment_requests").update({ status: "cancelled" }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الإلغاء" : "Cancelled");
    loadReqs();
  };

  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + Number(r.progress), 0) / rows.length)
    : 0;
  const completed = rows.filter((r) => Number(r.progress) >= 100).length;

  const selectTab = (next: Tab) => {
    setTab(next);
    requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };
  /* Arrow keys move between the two tabs, reversed in RTL. */
  const onTabKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const forward = (event.key === "ArrowRight" ? 1 : -1) * (ar ? -1 : 1) === 1;
    selectTab(forward ? "requests" : "courses");
  };

  const courseTitle = (c: { title_ar: string; title_en: string | null }) => (ar ? c.title_ar : c.title_en || c.title_ar);

  return (
    <>
      <SubHero
        id="student-title"
        eyebrow={ar ? "لوحة الطالب" : "Student dashboard"}
        titleSpans={[tr.myCourses]}
        lede={
          ar
            ? "كل ما انضممت إليه، وتقدّمك في كل دورة، وحالة كل طلب تسجيل."
            : "Everything you joined, your progress in each course, and the status of every registration request."
        }
      />

      <section className="lms-stats" aria-label={ar ? "ملخّص التعلّم" : "Learning summary"}>
        <div className="page-shell">
          <div className="stats-wrap">
            <dl className="stats-band stats-band-4">
              <div>
                <dt>{tr.enrolledCourses}</dt>
                <dd><Counter value={rows.length} /></dd>
              </div>
              <div>
                <dt>{tr.avgProgress}</dt>
                <dd><Counter value={avg} suffix="%" /></dd>
              </div>
              <div>
                <dt>{tr.completed}</dt>
                <dd><Counter value={completed} /></dd>
              </div>
              <div>
                <dt>{ar ? "الشهادات" : "Certificates"}</dt>
                <dd><Counter value={certs.length} /></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="lms-section" aria-label={ar ? "الدورات والطلبات" : "Courses and requests"}>
        <div className="page-shell">
          <div className="lms-tabs" role="tablist" aria-label={ar ? "عروض الطالب" : "Student views"}>
            <button
              type="button"
              role="tab"
              id="tab-courses"
              ref={(el) => { tabRefs.current.courses = el; }}
              aria-selected={tab === "courses"}
              aria-controls="panel-courses"
              tabIndex={tab === "courses" ? 0 : -1}
              onKeyDown={onTabKeyDown}
              onClick={() => setTab("courses")}
            >
              <span>{tr.myCourses}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-requests"
              ref={(el) => { tabRefs.current.requests = el; }}
              aria-selected={tab === "requests"}
              aria-controls="panel-requests"
              tabIndex={tab === "requests" ? 0 : -1}
              onKeyDown={onTabKeyDown}
              onClick={() => setTab("requests")}
            >
              <span>{ar ? "طلبات التسجيل" : "Registration requests"}</span>
              <b className="tab-badge">{reqs.length}</b>
            </button>
          </div>

          <div id="panel-courses" role="tabpanel" aria-labelledby="tab-courses" hidden={tab !== "courses"}>
            {loading ? (
              <p className="state-box">
                <Loader2 className="h-5 w-5 animate-spin" />
              </p>
            ) : rows.length === 0 ? (
              <div className="state-box">
                <p>{tr.noEnrollments}</p>
                <Link to="/learning-management-system/catalog" className="action action-primary">
                  {tr.heroBrowse}
                </Link>
              </div>
            ) : (
              <ul className="study-grid">
                {rows.map((r) => {
                  if (!r.course) return null;
                  const pct = Math.round(Number(r.progress));
                  const done = pct >= 100;
                  const ended = isCourseEnded(r.course);
                  return (
                    <li key={r.id} className="study-card">
                      <span className="course-thumb cat-ai" aria-hidden="true">
                        {r.course.cover_url ? <img src={r.course.cover_url} alt="" /> : <IconCategoryAI />}
                        {ended ? <span className="course-ended">{tr.courseEndedShort}</span> : null}
                      </span>
                      <span className="study-body">
                        <span className="course-tags">
                          <span className={done ? "tag-free" : undefined}>
                            {done ? (ar ? "مكتملة" : "Completed") : ar ? "قيد التقدّم" : "In progress"}
                          </span>
                        </span>
                        <h3>{courseTitle(r.course)}</h3>
                        <span className="progress" role="img" aria-label={`${pct}%`}>
                          <i style={{ width: `${Math.min(100, Math.max(0, Number(r.progress)))}%` }} />
                        </span>
                        <span className="study-foot">
                          <b>{pct}%</b>
                          <Link {...courseDestination(r.course.id, r.course.delivery_mode)}>
                            <span>{ar ? "تابع" : "Continue"}</span> <span aria-hidden="true">{ar ? "←" : "→"}</span>
                          </Link>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {certs.length > 0 && (
              <>
                <h2 className="dash-subtitle">{ar ? "شهاداتي" : "My certificates"}</h2>
                <ul className="cert-grid">
                  {certs.map((c) => (
                    <li key={c.id} className="cert-card">
                      <IconCertificate />
                      <p className="cert-code" dir="ltr">
                        {c.serial}
                      </p>
                      <h3>{c.title}</h3>
                      <p className="cert-meta">{new Date(c.issued_at).toLocaleDateString(ar ? "ar" : "en")}</p>
                      <Link className="cert-link" to="/learning-management-system/certificate/$id" params={{ id: c.id }}>
                        <span>{ar ? "عرض الشهادة" : "View certificate"}</span> <span aria-hidden="true">{ar ? "←" : "→"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div id="panel-requests" role="tabpanel" aria-labelledby="tab-requests" hidden={tab !== "requests"}>
            {reqLoading ? (
              <p className="state-box">
                <Loader2 className="h-5 w-5 animate-spin" />
              </p>
            ) : reqs.length === 0 ? (
              <div className="state-box">
                <p>{ar ? "لا توجد طلبات بعد" : "No requests yet"}</p>
                <Link to="/learning-management-system/catalog" className="action action-secondary">
                  {ar ? "تصفح الدورات" : "Browse courses"}
                </Link>
              </div>
            ) : (
              <ul className="req-list">
                {reqs.map((r) => {
                  const title = r.course ? courseTitle(r.course) : r.course_id;
                  return (
                    <li key={r.id} className="req-card">
                      <span className="req-main">
                        <Link to="/learning-management-system/courses/$id" params={{ id: r.course_id }}>
                          {title}
                        </Link>
                        <span>
                          {new Date(r.created_at).toLocaleDateString(ar ? "ar" : "en")}
                          {" · "}
                          {r.payment_method === "manual" ? (ar ? "دفع يدوي" : "Manual payment") : ar ? "دفع إلكتروني" : "Online payment"}
                        </span>
                        {r.notes && <span className="req-note">{r.notes}</span>}
                        {r.admin_notes && (
                          <span className="req-admin">
                            {ar ? "ملاحظات الإدارة:" : "Admin notes:"} {r.admin_notes}
                          </span>
                        )}
                      </span>
                      <span className="req-side">
                        <span className={`status ${STATUS_CLASS[r.status]}`}>
                          {ar
                            ? { pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى" }[r.status]
                            : { pending: "Pending review", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" }[r.status]}
                        </span>
                        {r.status === "pending" && (
                          <button type="button" className="action action-secondary" onClick={() => cancel(r.id)} disabled={busy === r.id}>
                            {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : ar ? "إلغاء" : "Cancel"}
                          </button>
                        )}
                        {r.status === "approved" && (
                          <Link
                            to="/learning-management-system/student/player/$courseId"
                            params={{ courseId: r.course_id }}
                            className="action action-primary"
                          >
                            {ar ? "ابدأ التعلّم" : "Start learning"}
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
