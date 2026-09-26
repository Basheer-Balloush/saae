import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ClipboardList,
  Download,
  GraduationCap,
  Bot,
  Globe,
  MessageSquareText,
  Star,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  StatTile,
  Tabs,
  fmtDate,
  useT,
} from "@/components/console/ui";
import {
  ALL_QUESTIONS,
  COMMENT_GROUPS,
  DEVICES,
  FREQUENCIES,
  GOVERNORATES,
  NA_LABEL,
  NOTE_FIELDS,
  QUESTION_BY_KEY,
  RATING_LABELS,
  REVIEW_STATUSES,
  SECTIONS,
  SERVICES,
  USER_TYPES,
  choiceLabel,
  type Choice,
  type Lang,
} from "@/lib/feedback-survey";
import type { Database } from "@/integrations/supabase/types";

type Sub = Database["public"]["Tables"]["feedback_survey_submissions"]["Row"];
type Ans = { submission_id: string; section_key: string; question_key: string; rating: number | null; not_applicable: boolean };
type Row = Sub & { answers: Ans[]; sectionAvg: Record<string, number | null>; avgAll: number | null; hasComments: boolean };

const TEAL = "#048090";
const GREEN = "#698F3F";
const PALETTE = [TEAL, GREEN, "#2E2E2E", "#4FA8B3", "#9BBB72", "#7A7A7A", "#036674", "#4E6B2F", "#B0C9CC", "#C9D9B4"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f1 = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toFixed(2));
const NOTE_KEYS = NOTE_FIELDS.map((n) => n.key);

async function fetchAll() {
  const subs: Sub[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .from("feedback_survey_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    subs.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const answers: Ans[] = [];
  for (let from = 0; from < 500000; from += 1000) {
    const { data, error } = await supabase
      .from("feedback_survey_answers")
      .select("submission_id, section_key, question_key, rating, not_applicable")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    answers.push(...((data ?? []) as Ans[]));
    if (!data || data.length < 1000) break;
  }
  const bySub = new Map<string, Ans[]>();
  for (const a of answers) {
    const l = bySub.get(a.submission_id) ?? [];
    l.push(a);
    bySub.set(a.submission_id, l);
  }
  return subs.map((s): Row => {
    const ans = bySub.get(s.id) ?? [];
    const sectionAvg: Record<string, number | null> = {};
    for (const sec of SECTIONS) {
      sectionAvg[sec.key] = avg(ans.filter((a) => a.section_key === sec.key && a.rating).map((a) => a.rating!));
    }
    return {
      ...s,
      answers: ans,
      sectionAvg,
      avgAll: avg(ans.filter((a) => a.rating).map((a) => a.rating!)),
      hasComments: NOTE_KEYS.some((k) => !!s[k]),
    };
  });
}

type Filters = {
  from: string;
  to: string;
  user_type: string;
  governorate: string;
  device_type: string;
  usage_frequency: string;
  service: string;
  rating: string;
  contact: boolean;
  comments: boolean;
  status: string;
};
const NO_FILTERS: Filters = {
  from: "",
  to: "",
  user_type: "",
  governorate: "",
  device_type: "",
  usage_frequency: "",
  service: "",
  rating: "",
  contact: false,
  comments: false,
  status: "",
};

export function FeedbackSurveyAdmin() {
  const { t, lang } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState<"overview" | "responses" | "comments">("overview");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(false);
    fetchAll()
      .then(setRows)
      .catch(() => setErr(true));
  }, []);
  useEffect(load, [load]);

  const all = rows ?? [];
  const completed = useMemo(() => all.filter((r) => r.completed), [all]);
  const filtered = useMemo(() => {
    return completed.filter((r) => {
      const d = r.submitted_at ?? r.created_at;
      if (filters.from && d < filters.from) return false;
      if (filters.to && d.slice(0, 10) > filters.to) return false;
      if (filters.user_type && r.user_type !== filters.user_type) return false;
      if (filters.governorate && r.governorate !== filters.governorate) return false;
      if (filters.device_type && r.device_type !== filters.device_type) return false;
      if (filters.usage_frequency && r.usage_frequency !== filters.usage_frequency) return false;
      if (filters.service && !r.services_used.includes(filters.service)) return false;
      if (filters.rating && r.overall_rating !== Number(filters.rating)) return false;
      if (filters.contact && !r.wants_contact) return false;
      if (filters.comments && !r.hasComments) return false;
      if (filters.status && r.review_status !== filters.status) return false;
      return true;
    });
  }, [completed, filters]);

  const updateRow = (id: string, patch: Partial<Sub>) =>
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);

  const open = all.find((r) => r.id === openId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع · استبيان", "Website · Survey")}
        title={t("استبيان التجربة الرقمية", "Digital experience survey")}
        description={t(
          "إجابات الزوار والمتعلمين عن الموقع والمنصة التعليمية والمساعد الذكي. الرابط العام: /feedback",
          "Visitor and learner answers about the website, learning platform and assistant. Public link: /feedback",
        )}
        actions={
          <button type="button" className="cx-btn cx-btn-primary" onClick={() => exportCsv(filtered, lang)} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> {t("تصدير CSV", "Export CSV")}
          </button>
        }
      />
      {err ? (
        <ErrorNote onRetry={load} />
      ) : !rows ? (
        <Loading />
      ) : (
        <>
          <FilterBar filters={filters} setFilters={setFilters} lang={lang} />
          <div className="mb-4">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: t("نظرة عامة", "Overview") },
                { value: "responses", label: t("الإجابات", "Responses"), count: filtered.length },
                { value: "comments", label: t("التعليقات", "Comments") },
              ]}
            />
          </div>
          {tab === "overview" && <Overview rows={filtered} all={all} lang={lang} />}
          {tab === "responses" && <Responses rows={filtered} lang={lang} onOpen={setOpenId} />}
          {tab === "comments" && <Comments rows={filtered} lang={lang} onOpen={setOpenId} />}
        </>
      )}
      {open && <Detail row={open} lang={lang} onClose={() => setOpenId(null)} onUpdate={updateRow} />}
    </div>
  );
}

/* ---------------- Filters ---------------- */

function Sel({ label, value, onChange, options, lang }: { label: string; value: string; onChange: (v: string) => void; options: Choice[]; lang: Lang }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
      {label}
      <select className="cx-input h-10" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{lang === "ar" ? "الكل" : "All"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o[lang]}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterBar({ filters, setFilters, lang }: { filters: Filters; setFilters: (f: Filters) => void; lang: Lang }) {
  const t = (a: string, e: string) => (lang === "ar" ? a : e);
  const up = (k: keyof Filters, v: string | boolean) => setFilters({ ...filters, [k]: v });
  const ratings: Choice[] = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), ar: `${n} · ${RATING_LABELS.ar[n]}`, en: `${n} · ${RATING_LABELS.en[n]}` }));
  return (
    <Panel className="mb-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <label className="flex flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
          {t("من تاريخ", "From")}
          <input type="date" className="cx-input h-10" value={filters.from} onChange={(e) => up("from", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
          {t("إلى تاريخ", "To")}
          <input type="date" className="cx-input h-10" value={filters.to} onChange={(e) => up("to", e.target.value)} />
        </label>
        <Sel label={t("الصفة", "User type")} value={filters.user_type} onChange={(v) => up("user_type", v)} options={USER_TYPES} lang={lang} />
        <Sel label={t("المحافظة", "Governorate")} value={filters.governorate} onChange={(v) => up("governorate", v)} options={GOVERNORATES} lang={lang} />
        <Sel label={t("الجهاز", "Device")} value={filters.device_type} onChange={(v) => up("device_type", v)} options={DEVICES} lang={lang} />
        <Sel label={t("تكرار الاستخدام", "Frequency")} value={filters.usage_frequency} onChange={(v) => up("usage_frequency", v)} options={FREQUENCIES} lang={lang} />
        <Sel label={t("الخدمة", "Service")} value={filters.service} onChange={(v) => up("service", v)} options={SERVICES} lang={lang} />
        <Sel label={t("الرضا العام", "Overall rating")} value={filters.rating} onChange={(v) => up("rating", v)} options={ratings} lang={lang} />
        <Sel label={t("الحالة", "Status")} value={filters.status} onChange={(v) => up("status", v)} options={REVIEW_STATUSES} lang={lang} />
        <label className="flex items-center gap-2 text-[13px] font-bold">
          <input type="checkbox" checked={filters.contact} onChange={(e) => up("contact", e.target.checked)} className="h-5 w-5" />
          {t("طلبوا التواصل", "Requested contact")}
        </label>
        <label className="flex items-center gap-2 text-[13px] font-bold">
          <input type="checkbox" checked={filters.comments} onChange={(e) => up("comments", e.target.checked)} className="h-5 w-5" />
          {t("لديهم تعليقات", "Has comments")}
        </label>
        <button type="button" className="cx-btn cx-btn-ghost self-end" onClick={() => setFilters(NO_FILTERS)}>
          {t("مسح الفلاتر", "Clear filters")}
        </button>
      </div>
    </Panel>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ rows, all, lang }: { rows: Row[]; all: Row[]; lang: Lang }) {
  const t = (a: string, e: string) => (lang === "ar" ? a : e);
  const [trend, setTrend] = useState<"day" | "week" | "month">("day");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const dayAgo = new Date(now.getTime() - 864e5).toISOString();
  const started = all.filter((r) => r.completed || r.created_at < dayAgo).length;
  const done = all.filter((r) => r.completed).length;
  const secAvg = (k: string) => avg(rows.map((r) => r.sectionAvg[k]).filter((x): x is number => x !== null));

  const allRatings = rows.flatMap((r) => r.answers.filter((a) => a.rating).map((a) => a.rating!));
  const dist = [1, 2, 3, 4, 5].map((n) => ({ name: `${n} · ${RATING_LABELS[lang][n]}`, value: allRatings.filter((x) => x === n).length }));
  const sections = SECTIONS.map((s) => ({ name: s[lang], value: Number((secAvg(s.key) ?? 0).toFixed(2)) }));
  const questions = ALL_QUESTIONS.map((q) => {
    const xs = rows.flatMap((r) => r.answers.filter((a) => a.question_key === q.key && a.rating).map((a) => a.rating!));
    return { key: q.key, name: q[lang], value: avg(xs), n: xs.length };
  }).filter((q) => q.n > 0);
  const sorted = [...questions].sort((a, b) => (a.value ?? 0) - (b.value ?? 0));

  const bucket = (iso: string) => {
    const d = new Date(iso);
    if (trend === "month") return iso.slice(0, 7);
    if (trend === "week") {
      const s = new Date(d);
      s.setUTCDate(d.getUTCDate() - d.getUTCDay());
      return s.toISOString().slice(0, 10);
    }
    return iso.slice(0, 10);
  };
  const trendMap = new Map<string, number>();
  for (const r of rows) {
    const k = bucket(r.submitted_at ?? r.created_at);
    trendMap.set(k, (trendMap.get(k) ?? 0) + 1);
  }
  const trendData = [...trendMap.entries()].sort().map(([name, value]) => ({ name, value }));

  const countBy = (list: Choice[], get: (r: Row) => string[]) =>
    list
      .map((c) => ({ name: c[lang], value: rows.filter((r) => get(r).includes(c.value)).length }))
      .filter((x) => x.value > 0);

  const compare = [
    { name: t("الموقع", "Website"), value: Number((secAvg("website") ?? 0).toFixed(2)) },
    { name: t("المنصة التعليمية", "Platform"), value: Number((secAvg("platform") ?? 0).toFixed(2)) },
    { name: t("المساعد الذكي", "Chatbot"), value: Number((secAvg("chatbot") ?? 0).toFixed(2)) },
    { name: t("التسجيل والتواصل", "Registration"), value: Number((secAvg("registration") ?? 0).toFixed(2)) },
  ];

  const rec = rows.map((r) => r.recommendation_rating).filter((x): x is number => !!x);
  const recScore = rec.length ? Math.round(((rec.filter((x) => x >= 4).length - rec.filter((x) => x <= 2).length) / rec.length) * 100) : null;

  if (!rows.length) {
    return <EmptyState title={t("لا توجد إجابات مطابقة بعد", "No matching responses yet")} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={ClipboardList} label={t("إجمالي الإجابات", "Total responses")} value={rows.length} />
        <StatTile icon={CalendarDays} label={t("إجابات اليوم", "Today")} value={rows.filter((r) => (r.submitted_at ?? "").slice(0, 10) === today).length} tone="green" />
        <StatTile icon={CalendarDays} label={t("هذا الأسبوع", "This week")} value={rows.filter((r) => (r.submitted_at ?? "") >= weekAgo).length} tone="green" />
        <StatTile icon={Star} label={t("متوسط الرضا العام", "Avg. overall")} value={f1(avg(rows.map((r) => r.overall_rating).filter((x): x is number => !!x)))} hint="/ 5" />
        <StatTile icon={Globe} label={t("متوسط الموقع", "Avg. website")} value={f1(secAvg("website"))} hint="/ 5" />
        <StatTile icon={GraduationCap} label={t("متوسط المنصة", "Avg. platform")} value={f1(secAvg("platform"))} hint="/ 5" />
        <StatTile icon={Bot} label={t("متوسط المساعد", "Avg. chatbot")} value={f1(secAvg("chatbot"))} hint="/ 5" />
        <StatTile
          icon={ThumbsUp}
          label={t("مؤشر التوصية", "Recommendation score")}
          value={recScore === null ? "—" : `${recScore}`}
          hint={t("(4–5) ناقص (1–2)، من −100 إلى 100", "% 4–5 minus % 1–2, −100 to 100")}
          tone="orange"
        />
        <StatTile
          icon={Users}
          label={t("مكتمل / متروك", "Completed / abandoned")}
          value={started ? `${Math.round((done / started) * 100)}%` : "—"}
          hint={t(`${done} مكتمل · ${Math.max(started - done, 0)} متروك (كل الفترات)`, `${done} completed · ${Math.max(started - done, 0)} abandoned (all time)`)}
          tone="gray"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("توزيع التقييمات من 1 إلى 5", "Rating distribution 1–5")}>
          <HBar data={dist} />
        </Panel>
        <Panel title={t("مقارنة الخدمات", "Service comparison")} description={t("متوسط من 5", "Average out of 5")}>
          <HBar data={compare} max={5} />
        </Panel>
        <Panel title={t("متوسط كل قسم", "Average per section")}>
          <HBar data={sections} max={5} />
        </Panel>
        <Panel
          title={t("اتجاه الإجابات", "Response trend")}
          actions={
            <select className="cx-input h-9" value={trend} onChange={(e) => setTrend(e.target.value as typeof trend)} aria-label={t("الفترة", "Period")}>
              <option value="day">{t("يومي", "Daily")}</option>
              <option value="week">{t("أسبوعي", "Weekly")}</option>
              <option value="month">{t("شهري", "Monthly")}</option>
            </select>
          }
        >
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5eaeb" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2.5} dot={{ r: 4 }}>
                  <LabelList dataKey="value" position="top" fontSize={11} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("الأجهزة", "Devices")}>
          <Donut data={countBy(DEVICES, (r) => (r.device_type ? [r.device_type] : []))} />
        </Panel>
        <Panel title={t("صفة المشاركين", "User types")}>
          <Donut data={countBy(USER_TYPES, (r) => (r.user_type ? [r.user_type] : []))} />
        </Panel>
        <Panel title={t("المحافظات", "Governorates")}>
          <HBar data={countBy(GOVERNORATES, (r) => (r.governorate ? [r.governorate] : []))} />
        </Panel>
        <Panel title={t("الخدمات المستخدمة", "Services used")}>
          <HBar data={countBy(SERVICES, (r) => r.services_used)} />
        </Panel>
        <Panel title={t("أدنى 5 أسئلة تقييماً", "Lowest-rated 5 questions")}>
          <QList items={sorted.slice(0, 5)} />
        </Panel>
        <Panel title={t("أعلى 5 أسئلة تقييماً", "Highest-rated 5 questions")}>
          <QList items={sorted.slice(-5).reverse()} />
        </Panel>
      </div>
      <Panel title={t("متوسط كل سؤال", "Average per question")} flush>
        <div className="overflow-x-auto">
          <table className="cx-table w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-start">{t("القسم", "Section")}</th>
                <th className="text-start">{t("السؤال", "Question")}</th>
                <th>{t("المتوسط", "Avg")}</th>
                <th>{t("عدد التقييمات", "Ratings")}</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.key}>
                  <td className="whitespace-nowrap">{SECTIONS.find((s) => s.key === QUESTION_BY_KEY.get(q.key)?.section)?.[lang]}</td>
                  <td>{q.name}</td>
                  <td className="text-center font-bold tabular-nums">
                    <ScoreBar value={q.value} />
                  </td>
                  <td className="text-center tabular-nums">{q.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ScoreBar({ value }: { value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  const color = value && value < 3 ? "#b3261e" : value && value < 4 ? GREEN : TEAL;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2 w-20 overflow-hidden rounded-full bg-[var(--cx-raise-2)]">
        <span className="block h-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      {f1(value)}
    </span>
  );
}

function QList({ items }: { items: { key: string; name: string; value: number | null; n: number }[] }) {
  return (
    <ol className="space-y-2">
      {items.map((q, i) => (
        <li key={q.key} className="flex items-start justify-between gap-3 text-[13px]">
          <span className="min-w-0">
            <b className="text-[var(--cx-muted)]">{i + 1}.</b> {q.name}
          </span>
          <span className="shrink-0 font-bold tabular-nums">{f1(q.value)} / 5</span>
        </li>
      ))}
    </ol>
  );
}

function HBar({ data, max }: { data: { name: string; value: number }[]; max?: number }) {
  if (!data.length) return <p className="text-[13px] text-[var(--cx-muted)]">—</p>;
  return (
    <div style={{ height: Math.max(160, data.length * 38) }} dir="ltr">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5eaeb" horizontal={false} />
          <XAxis type="number" domain={max ? [0, max] : [0, "auto"]} fontSize={11} allowDecimals={!!max} />
          <YAxis type="category" dataKey="name" width={150} fontSize={11} orientation="right" />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 4, 4]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i % 2 ? GREEN : TEAL} />
            ))}
            <LabelList dataKey="value" position="right" fontSize={12} fontWeight={700} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-[13px] text-[var(--cx-muted)]">—</p>;
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="h-52" dir="ltr">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-[13px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <b className="tabular-nums">
              {d.value} ({Math.round((d.value / total) * 100)}%)
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Responses ---------------- */

function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const tone: Record<string, string> = {
    new: "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]",
    in_review: "bg-[var(--cx-orange-50)] text-[var(--cx-orange-ink)]",
    contacted: "bg-[var(--cx-green-50)] text-[var(--cx-green)]",
    closed: "bg-[var(--cx-raise-2)] text-[var(--cx-ink-2)]",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${tone[status] ?? ""}`}>{choiceLabel(REVIEW_STATUSES, status, lang)}</span>;
}

function Responses({ rows, lang, onOpen }: { rows: Row[]; lang: Lang; onOpen: (id: string) => void }) {
  const t = (a: string, e: string) => (lang === "ar" ? a : e);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: "date" | "overall" | "avg"; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [page, setPage] = useState(0);
  const PER = 20;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = s
      ? rows.filter((r) =>
          [r.contact_name, r.contact_email, r.contact_phone, ...NOTE_KEYS.map((k) => r[k])].some((v) => v?.toLowerCase().includes(s)),
        )
      : rows;
    const val = (r: Row) => (sort.key === "date" ? (r.submitted_at ?? r.created_at) : sort.key === "overall" ? (r.overall_rating ?? 0) : (r.avgAll ?? 0));
    return [...f].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, q, sort]);
  useEffect(() => setPage(0), [q, rows]);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const th = (key: typeof sort.key, label: string) => (
    <th>
      <button type="button" className="font-bold" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }))}>
        {label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}
      </button>
    </th>
  );
  if (!rows.length) return <EmptyState title={t("لا توجد إجابات مطابقة", "No matching responses")} />;
  return (
    <Panel flush>
      <div className="p-4">
        <input className="cx-input h-10 w-full max-w-md" placeholder={t("بحث في الاسم أو البريد أو الملاحظات…", "Search name, email or notes…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("بحث", "Search")} />
      </div>
      <div className="overflow-x-auto">
        <table className="cx-table w-full text-[13px]">
          <thead>
            <tr>
              {th("date", t("التاريخ", "Date"))}
              <th>{t("الصفة", "Type")}</th>
              <th>{t("المحافظة", "Governorate")}</th>
              <th>{t("الجهاز", "Device")}</th>
              <th>{t("الموقع", "Website")}</th>
              <th>{t("المنصة", "Platform")}</th>
              <th>{t("المساعد", "Chatbot")}</th>
              {th("overall", t("الرضا العام", "Overall"))}
              {th("avg", t("المتوسط", "Avg"))}
              <th>{t("تواصل", "Contact")}</th>
              <th>{t("الحالة", "Status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.slice(page * PER, page * PER + PER).map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{fmtDate(r.submitted_at, lang, true)}</td>
                <td>{choiceLabel(USER_TYPES, r.user_type, lang) || "—"}</td>
                <td>{choiceLabel(GOVERNORATES, r.governorate, lang) || "—"}</td>
                <td>{choiceLabel(DEVICES, r.device_type, lang) || "—"}</td>
                <td className="tabular-nums">{f1(r.sectionAvg.website)}</td>
                <td className="tabular-nums">{f1(r.sectionAvg.platform)}</td>
                <td className="tabular-nums">{f1(r.sectionAvg.chatbot)}</td>
                <td className="tabular-nums font-bold">{r.overall_rating ?? "—"}</td>
                <td className="tabular-nums">{f1(r.avgAll)}</td>
                <td>{r.wants_contact ? t("نعم", "Yes") : "—"}</td>
                <td>
                  <StatusPill status={r.review_status} lang={lang} />
                </td>
                <td>
                  <button type="button" className="cx-btn cx-btn-ghost h-9" onClick={() => onOpen(r.id)}>
                    {t("عرض", "Open")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 p-4 text-[13px]">
        <span>
          {t(`${list.length} إجابة`, `${list.length} responses`)} · {page + 1} / {pages}
        </span>
        <div className="flex gap-2">
          <button type="button" className="cx-btn cx-btn-ghost h-9" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            {t("السابق", "Previous")}
          </button>
          <button type="button" className="cx-btn cx-btn-ghost h-9" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("التالي", "Next")}
          </button>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Comments ---------------- */

function Comments({ rows, lang, onOpen }: { rows: Row[]; lang: Lang; onOpen: (id: string) => void }) {
  const t = (a: string, e: string) => (lang === "ar" ? a : e);
  const [group, setGroup] = useState("");
  const [section, setSection] = useState("");
  const items = rows.flatMap((r) =>
    NOTE_FIELDS.filter((n) => r[n.key]).map((n) => ({
      id: `${r.id}-${n.key}`,
      subId: r.id,
      group: n.group as string,
      text: r[n.key] as string,
      question: n[lang],
      date: r.submitted_at ?? r.created_at,
      overall: r.overall_rating,
      low: r.answers.some((a) => a.rating && a.rating <= 2 && (!section || a.section_key === section)),
      sectionRated: !section || r.answers.some((a) => a.section_key === section),
      status: r.review_status,
    })),
  );
  const shown = items.filter((i) => (!group || i.group === group) && i.sectionRated);
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap gap-3">
          <Sel label={t("التصنيف", "Group")} value={group} onChange={setGroup} options={COMMENT_GROUPS} lang={lang} />
          <Sel label={t("القسم المقيَّم", "Rated section")} value={section} onChange={setSection} options={SECTIONS.map((s) => ({ value: s.key, ar: s.ar, en: s.en }))} lang={lang} />
        </div>
        <p className="mt-3 text-[12px] text-[var(--cx-muted)]">
          {t(
            "التصنيف مبني على الحقل الذي كُتب فيه التعليق، دون تحليل آلي للمشاعر. التعليقات المظللة مرتبطة بتقييم 1 أو 2.",
            "Groups come from which text box the comment was written in — no automated sentiment. Highlighted comments come with a 1 or 2 rating.",
          )}
        </p>
      </Panel>
      {!shown.length ? (
        <EmptyState icon={MessageSquareText} title={t("لا توجد تعليقات مطابقة", "No matching comments")} />
      ) : (
        COMMENT_GROUPS.filter((g) => !group || g.value === group).map((g) => {
          const list = shown.filter((i) => i.group === g.value);
          if (!list.length) return null;
          return (
            <Panel key={g.value} title={`${g[lang]} (${list.length})`}>
              <ul className="space-y-3">
                {list.map((i) => (
                  <li key={i.id} className={`rounded-xl border p-3 ${i.low ? "border-[#f1c9c6] bg-[#fdf3f2]" : "border-[var(--cx-line-2)]"}`}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--cx-muted)]">
                      <span>
                        {fmtDate(i.date, lang, true)} · {t("الرضا العام", "Overall")}: {i.overall ?? "—"}/5 {i.low && <b className="text-[#b3261e]">· {t("تقييم منخفض", "Low rating")}</b>}
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusPill status={i.status} lang={lang} />
                        <button type="button" className="font-bold text-[var(--cx-teal)] underline" onClick={() => onOpen(i.subId)}>
                          {t("فتح الإجابة", "Open response")}
                        </button>
                      </span>
                    </div>
                    <p className="text-[12px] font-bold text-[var(--cx-muted)]">{i.question}</p>
                    <p className="whitespace-pre-wrap text-[14px]">{i.text}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Detail ---------------- */

function Detail({ row, lang, onClose, onUpdate }: { row: Row; lang: Lang; onClose: () => void; onUpdate: (id: string, p: Partial<Sub>) => void }) {
  const t = (a: string, e: string) => (lang === "ar" ? a : e);
  const [note, setNote] = useState(row.internal_admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    setNote(row.internal_admin_note ?? "");
    setShot(null);
    if (row.screenshot_path) {
      supabase.storage
        .from("feedback-screenshots")
        .createSignedUrl(row.screenshot_path, 600)
        .then(({ data }) => setShot(data?.signedUrl ?? null));
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  const save = async (patch: Partial<Sub>) => {
    setSaving(true);
    const { error } = await supabase
      .from("feedback_survey_submissions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(t("تعذّر الحفظ", "Could not save"));
    onUpdate(row.id, patch);
    toast.success(t("تم الحفظ", "Saved"));
  };

  const ansMap = new Map(row.answers.map((a) => [a.question_key, a]));
  const info: [string, string][] = [
    [t("التاريخ", "Date"), fmtDate(row.submitted_at, lang, true)],
    [t("الصفة", "Type"), choiceLabel(USER_TYPES, row.user_type, lang)],
    [t("الفئة العمرية", "Age"), row.age_range ?? ""],
    [t("المحافظة", "Governorate"), choiceLabel(GOVERNORATES, row.governorate, lang)],
    [t("تكرار الاستخدام", "Frequency"), choiceLabel(FREQUENCIES, row.usage_frequency, lang)],
    [t("الجهاز", "Device"), choiceLabel(DEVICES, row.device_type, lang)],
    [t("الخدمات", "Services"), row.services_used.map((s) => choiceLabel(SERVICES, s, lang)).join("، ")],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label={t("تفاصيل الإجابة", "Response details")} onClick={onClose}>
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-[var(--cx-bg,#fff)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()} style={{ background: "var(--cx-raise, #fff)" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold">{t("تفاصيل الإجابة", "Response details")}</h2>
          <button type="button" className="cx-btn cx-btn-ghost h-10 w-10 p-0" onClick={onClose} aria-label={t("إغلاق", "Close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Panel title={t("المتابعة", "Follow-up")}>
            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <label className="flex flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
                {t("الحالة", "Status")}
                <select className="cx-input h-10" value={row.review_status} disabled={saving} onChange={(e) => save({ review_status: e.target.value as Sub["review_status"] })}>
                  {REVIEW_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s[lang]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
                {t("ملاحظة داخلية (لا تظهر للمشارك)", "Internal note (private)")}
                <textarea className="cx-input min-h-[80px] p-2" value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" className="cx-btn cx-btn-primary" disabled={saving} onClick={() => save({ internal_admin_note: note.trim() || null })}>
                {t("حفظ الملاحظة", "Save note")}
              </button>
            </div>
          </Panel>

          <Panel title={t("معلومات المشارك", "Respondent")}>
            <dl className="grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-bold text-[var(--cx-muted)]">{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {row.wants_contact && (
              <div className="mt-3 rounded-xl bg-[var(--cx-teal-50)] p-3 text-[13px]">
                <b>{t("طلب التواصل", "Requested contact")}:</b> {row.contact_name || "—"} · <span dir="ltr">{row.contact_email || row.contact_phone || "—"}</span> · {choiceLabel([{ value: "email", ar: "بريد", en: "Email" }, { value: "phone", ar: "هاتف", en: "Phone" }, { value: "whatsapp", ar: "واتساب", en: "WhatsApp" }], row.preferred_contact_method, lang) || "—"}
              </div>
            )}
          </Panel>

          <Panel title={t("متوسطات الأقسام", "Section averages")}>
            <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <li key={s.key} className="flex justify-between gap-2">
                  <span>{s[lang]}</span>
                  <b className="tabular-nums">{f1(row.sectionAvg[s.key])}</b>
                </li>
              ))}
              <li className="flex justify-between gap-2 border-t pt-2 font-extrabold sm:col-span-2">
                <span>{t("المتوسط العام", "Overall average")}</span>
                <span className="tabular-nums">{f1(row.avgAll)}</span>
              </li>
            </ul>
          </Panel>

          {SECTIONS.map((s) => {
            const has = s.questions.some((q) => ansMap.has(q.key));
            if (!has) return null;
            return (
              <Panel key={s.key} title={s[lang]}>
                <ul className="divide-y text-[13px]">
                  {s.questions.map((q) => {
                    const a = ansMap.get(q.key);
                    return (
                      <li key={q.key} className="flex flex-wrap justify-between gap-2 py-2">
                        <span className="min-w-0">{q[lang]}</span>
                        <b className={a?.rating && a.rating <= 2 ? "text-[#b3261e]" : ""}>
                          {a?.rating ? `${"★".repeat(a.rating)} ${a.rating} · ${RATING_LABELS[lang][a.rating]}` : a?.not_applicable ? NA_LABEL[lang] : "—"}
                        </b>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            );
          })}

          <Panel title={t("الملاحظات المكتوبة", "Written feedback")}>
            <div className="space-y-3 text-[14px]">
              {NOTE_FIELDS.map((n) => (
                <div key={n.key}>
                  <p className="text-[12px] font-bold text-[var(--cx-muted)]">{n[lang]}</p>
                  <p className="whitespace-pre-wrap">{row[n.key] || "—"}</p>
                </div>
              ))}
              {row.screenshot_path && (
                <div>
                  <p className="text-[12px] font-bold text-[var(--cx-muted)]">{t("لقطة الشاشة", "Screenshot")}</p>
                  {shot ? (
                    <a href={shot} target="_blank" rel="noreferrer">
                      <img src={shot} alt={t("لقطة شاشة مرفقة", "Attached screenshot")} className="mt-1 max-h-96 rounded-lg border" />
                    </a>
                  ) : (
                    <Loading />
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CSV ---------------- */

function exportCsv(rows: Row[], lang: Lang) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const L = (a: string, e: string) => (lang === "ar" ? a : e);
  const head = [
    L("التاريخ", "Date"),
    L("الصفة", "User type"),
    L("الفئة العمرية", "Age"),
    L("المحافظة", "Governorate"),
    L("التكرار", "Frequency"),
    L("الجهاز", "Device"),
    L("الخدمات", "Services"),
    L("الرضا العام", "Overall"),
    L("التوصية", "Recommendation"),
    ...SECTIONS.map((s) => `${L("متوسط", "Avg")} ${s[lang]}`),
    L("طلب تواصل", "Wants contact"),
    L("الاسم", "Name"),
    L("البريد", "Email"),
    L("الهاتف", "Phone"),
    L("طريقة التواصل", "Contact method"),
    ...NOTE_FIELDS.map((n) => n[lang]),
    L("الحالة", "Status"),
    L("ملاحظة داخلية", "Internal note"),
    ...ALL_QUESTIONS.flatMap((q) => [`${q.key} ${L("(رقم)", "(value)")}`, `${q.key} ${L("(التسمية)", "(label)")}`]),
  ];
  const lines = rows.map((r) => {
    const m = new Map(r.answers.map((a) => [a.question_key, a]));
    return [
      r.submitted_at,
      choiceLabel(USER_TYPES, r.user_type, lang),
      r.age_range,
      choiceLabel(GOVERNORATES, r.governorate, lang),
      choiceLabel(FREQUENCIES, r.usage_frequency, lang),
      choiceLabel(DEVICES, r.device_type, lang),
      r.services_used.map((s) => choiceLabel(SERVICES, s, lang)).join(" | "),
      r.overall_rating,
      r.recommendation_rating,
      ...SECTIONS.map((s) => (r.sectionAvg[s.key] === null ? "" : r.sectionAvg[s.key]!.toFixed(2))),
      r.wants_contact ? L("نعم", "Yes") : L("لا", "No"),
      r.contact_name,
      r.contact_email,
      r.contact_phone,
      r.preferred_contact_method,
      ...NOTE_FIELDS.map((n) => r[n.key]),
      choiceLabel(REVIEW_STATUSES, r.review_status, lang),
      r.internal_admin_note,
      ...ALL_QUESTIONS.flatMap((q) => {
        const a = m.get(q.key);
        if (!a) return ["", ""];
        if (a.not_applicable) return ["", NA_LABEL[lang]];
        return [a.rating, RATING_LABELS[lang][a.rating!]];
      }),
    ]
      .map(esc)
      .join(",");
  });
  const legend = ALL_QUESTIONS.map((q) => `${esc(q.key)},${esc(q[lang])}`);
  const csv = "\uFEFF" + [head.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `saae-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  // Question key legend as a second file for readability in Excel.
  const blob2 = new Blob(["\uFEFF" + [L("المفتاح,السؤال", "Key,Question"), ...legend].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const b = document.createElement("a");
  b.href = URL.createObjectURL(blob2);
  b.download = `saae-feedback-questions.csv`;
  setTimeout(() => {
    b.click();
    URL.revokeObjectURL(b.href);
  }, 300);
}
