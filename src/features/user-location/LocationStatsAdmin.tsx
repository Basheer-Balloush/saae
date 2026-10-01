import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Download,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  StatTile,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { getLocationStats, listLocationsForExport } from "./lib/location.functions";
import type { GovernorateStats, LocationStats } from "./lib/location";

/* Mid-tone colours that read on both console themes. */
const PALETTE = [
  "#14a3b4",
  "#8bc34a",
  "#f5a524",
  "#8b7cf6",
  "#ef6c57",
  "#3b8beb",
  "#d65db1",
  "#9aa9ad",
];
const OTHERS_COLOR = "#9aa9ad";
/* Governorates beyond this many are grouped as "others" in the pie. */
const PIE_SLICES = 7;

const tooltipStyle = {
  background: "var(--cx-card-solid)",
  border: "1px solid var(--cx-line)",
  borderRadius: 12,
  color: "var(--cx-ink)",
  fontSize: 12,
};

type Slice = { key: string; name: string; value: number; color: string };

/* Admin page: where users live, and what people in each place are interested in. */
export function LocationStatsAdmin() {
  const { t, lang } = useT();
  const fetchStats = useServerFn(getLocationStats);
  const fetchRows = useServerFn(listLocationsForExport);
  const [exporting, setExporting] = useState(false);

  const q = useQuery({
    queryKey: ["admin-user-location-stats"],
    staleTime: 60_000,
    queryFn: () => fetchStats(),
  });

  const onExport = async () => {
    setExporting(true);
    try {
      const rows = await fetchRows();
      await exportRowsToXlsx({
        filenameBase: "user-locations",
        sheetName: t("مواقع المستخدمين", "User locations"),
        rtl: lang === "ar",
        rows,
        columns: [
          { header: t("الاسم", "Name"), width: 28, get: (r) => r.full_name ?? "" },
          { header: t("البريد", "Email"), width: 30, get: (r) => r.email ?? "" },
          {
            header: t("المحافظة", "Governorate"),
            width: 16,
            get: (r) => (lang === "ar" ? r.governorate_ar : r.governorate_en),
          },
          { header: t("المدينة", "City"), width: 24, get: (r) => r.city },
          {
            header: t("آخر تحديث", "Updated"),
            type: "date",
            width: 18,
            get: (r) => new Date(r.updated_at),
          },
        ],
      });
    } catch {
      toast.error(t("تعذّر التصدير", "Couldn't export"));
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <PageHeader
      eyebrow={t("إدارة الموقع · التفاعل", "Website · Engagement")}
      title={t("مواقع المستخدمين", "User locations")}
      description={t(
        "أين يقيم أصحاب الحسابات، وما الذي يهتمّ به الناس في كل محافظة حسب تصنيفات الدورات التي سجّلوا فيها أو طلبوها.",
        "Where account holders live, and what people in each governorate are interested in, by the categories of the courses they joined or asked for.",
      )}
      actions={
        <>
          <button
            type="button"
            className="cx-btn cx-btn-ghost"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
            <span>{t("تحديث", "Refresh")}</span>
          </button>
          <button
            type="button"
            className="cx-btn cx-btn-primary"
            onClick={onExport}
            disabled={exporting || !q.data?.answered}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{t("تصدير Excel", "Export Excel")}</span>
          </button>
        </>
      }
    />
  );

  if (q.isLoading)
    return (
      <div>
        {header}
        <Loading />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div>
        {header}
        <ErrorNote onRetry={() => q.refetch()} />
      </div>
    );

  return (
    <div>
      {header}
      <StatsBody data={q.data} />
      <p className="mt-4 text-[12px] text-[var(--cx-muted)]">
        {t("آخر تحميل:", "Loaded:")} {fmtDate(new Date(q.dataUpdatedAt).toISOString(), lang, true)}
      </p>
    </div>
  );
}

function StatsBody({ data }: { data: LocationStats }) {
  const { t, lang } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const { accounts, answered, governorates, categories } = data;
  const gName = (g: { name_ar: string; name_en: string }) =>
    lang === "ar" ? g.name_ar : g.name_en;

  const ranked = useMemo(
    () => governorates.filter((g) => g.people > 0).sort((a, b) => b.people - a.people),
    [governorates],
  );
  const catColor = useMemo(
    () => new Map(categories.map((c, i) => [c.id, PALETTE[i % PALETTE.length]])),
    [categories],
  );
  const govColor = useMemo(
    () => new Map(ranked.map((g, i) => [g.key, i < PIE_SLICES ? PALETTE[i] : OTHERS_COLOR])),
    [ranked],
  );

  const current = governorates.find((g) => g.key === selected) ?? null;
  const scope: GovernorateStats[] = current ? [current] : ranked;
  const scopePeople = scope.reduce((n, g) => n + g.people, 0);
  const scopeWithCourses = scope.reduce((n, g) => n + g.with_courses, 0);
  const scopeInstructors = scope.reduce((n, g) => n + g.instructors, 0);

  const govSlices: Slice[] = ranked.slice(0, PIE_SLICES).map((g) => ({
    key: g.key,
    name: gName(g),
    value: g.people,
    color: govColor.get(g.key)!,
  }));
  const restPeople = ranked.slice(PIE_SLICES).reduce((n, g) => n + g.people, 0);
  if (restPeople)
    govSlices.push({
      key: "others",
      name: t("غيرها", "Others"),
      value: restPeople,
      color: OTHERS_COLOR,
    });

  const interestSlices: Slice[] = categories
    .map((c) => ({
      key: c.id,
      name: gName(c),
      value: scope.reduce((n, g) => n + (g.interests[c.id] ?? 0), 0),
      color: catColor.get(c.id)!,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const stackRows = ranked.map((g) => {
    const row: Record<string, string | number> = { name: gName(g), key: g.key };
    for (const c of categories) row[c.id] = g.interests[c.id] ?? 0;
    return row;
  });

  const inSyria = governorates.filter((g) => g.key !== "abroad");
  const covered = inSyria.filter((g) => g.people > 0).length;
  const abroad = governorates.find((g) => g.key === "abroad");
  const coverage = accounts ? Math.round((answered / accounts) * 100) : 0;
  const withCoursesAll = governorates.reduce((n, g) => n + g.with_courses, 0);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={UsersRound}
          label={t("أجابوا", "Answered")}
          value={fmtNum(answered, lang)}
          hint={t(
            `من ${fmtNum(accounts, lang)} حساب (${fmtNum(coverage, lang)}٪)`,
            `of ${fmtNum(accounts, lang)} accounts (${coverage}%)`,
          )}
        />
        <StatTile
          icon={MapPin}
          label={t("محافظات فيها مستخدمون", "Governorates with users")}
          value={`${fmtNum(covered, lang)} / ${fmtNum(inSyria.length, lang)}`}
          tone="green"
        />
        <StatTile
          icon={BookOpen}
          label={t("لديهم دورة", "Joined a course")}
          value={fmtNum(withCoursesAll, lang)}
          hint={t(
            `${fmtNum(answered ? Math.round((withCoursesAll / answered) * 100) : 0, lang)}٪ ممن أجابوا`,
            `${answered ? Math.round((withCoursesAll / answered) * 100) : 0}% of those who answered`,
          )}
          tone="orange"
        />
        <StatTile
          icon={Globe2}
          label={t("خارج سوريا", "Outside Syria")}
          value={fmtNum(abroad?.people ?? 0, lang)}
          tone="gray"
        />
      </div>

      {answered === 0 ? (
        <Panel>
          <EmptyState
            icon={MapPin}
            title={t("لا توجد إجابات بعد", "No answers yet")}
            text={t(
              "تظهر الإجابات هنا عندما يختار المستخدمون محافظتهم عند التسجيل أو من ملفهم الشخصي.",
              "Answers appear here as users choose their governorate when signing up or from their profile.",
            )}
          />
        </Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Panel
              title={t("الناس حسب المحافظة", "People by governorate")}
              description={t(
                "اضغط على محافظة لترى اهتمامات أهلها ومدنها",
                "Click a governorate to see its interests and cities",
              )}
            >
              <Donut
                slices={govSlices}
                total={answered}
                centerLabel={t("شخص", "people")}
                activeKey={selected}
                onSelect={(key) => key !== "others" && setSelected(key === selected ? null : key)}
              />
            </Panel>
            <Panel
              title={
                current
                  ? t(`الاهتمامات في ${current.name_ar}`, `Interests in ${current.name_en}`)
                  : t("الاهتمامات", "Interests")
              }
              description={t(
                `تصنيفات الدورات التي سجّل فيها الناس أو طلبوها. ${fmtNum(scopePeople - scopeWithCourses, lang)} من ${fmtNum(scopePeople, lang)} لم يسجّلوا في أي دورة بعد.`,
                `Categories of the courses people joined or asked for. ${scopePeople - scopeWithCourses} of ${scopePeople} have no course yet.`,
              )}
              actions={current && <ClearFilter onClear={() => setSelected(null)} />}
            >
              {interestSlices.length ? (
                <Donut
                  slices={interestSlices}
                  total={interestSlices.reduce((n, s) => n + s.value, 0)}
                  centerLabel={t("اهتمام", "interests")}
                />
              ) : (
                <p className="py-10 text-center text-[13px] text-[var(--cx-muted)]">
                  {t("لم يسجّل أحد هنا في دورة بعد", "No one here has joined a course yet")}
                </p>
              )}
            </Panel>
          </div>

          <Panel
            className="mb-4"
            title={t("الاهتمامات في كل محافظة", "Interests across governorates")}
            description={t(
              "عدد الأشخاص المهتمين بكل تصنيف في كل محافظة. قد يهتمّ الشخص الواحد بأكثر من تصنيف.",
              "People interested in each category, per governorate. One person can count in several categories.",
            )}
          >
            <div style={{ height: Math.max(160, stackRows.length * 44 + 70) }} dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stackRows}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
                  onClick={(e) => {
                    const key = (e?.activePayload?.[0]?.payload as { key?: string })?.key;
                    if (key) setSelected(key === selected ? null : key);
                  }}
                >
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    reversed={lang === "ar"}
                    tick={{ fill: "var(--cx-muted)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--cx-line)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    orientation={lang === "ar" ? "right" : "left"}
                    tick={{ fill: "var(--cx-ink-2)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--cx-raise-2)" }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "var(--cx-muted)" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={9}
                    wrapperStyle={{ fontSize: 12, color: "var(--cx-ink-2)" }}
                  />
                  {categories.map((c) => (
                    <Bar
                      key={c.id}
                      dataKey={c.id}
                      name={gName(c)}
                      stackId="interests"
                      fill={catColor.get(c.id)}
                      maxBarSize={26}
                      cursor="pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title={
                current
                  ? t(`المدن في ${current.name_ar}`, `Cities in ${current.name_en}`)
                  : t("أكثر المدن", "Top cities")
              }
              actions={current && <ClearFilter onClear={() => setSelected(null)} />}
            >
              <CityList
                cities={
                  current
                    ? current.cities
                    : ranked
                        .flatMap((g) =>
                          g.cities.map((c) => ({ ...c, city: `${c.city} · ${gName(g)}` })),
                        )
                        .sort((a, b) => b.people - a.people)
                        .slice(0, 12)
                }
                total={scopePeople}
              />
            </Panel>
            <Panel
              title={
                current
                  ? t(`من هم في ${current.name_ar}`, `Who they are in ${current.name_en}`)
                  : t("من هم", "Who they are")
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Donut
                  small
                  slices={[
                    {
                      key: "students",
                      name: t("متعلّمون", "Learners"),
                      value: scopePeople - scopeInstructors,
                      color: PALETTE[0],
                    },
                    {
                      key: "instructors",
                      name: t("مدرّبون", "Instructors"),
                      value: scopeInstructors,
                      color: PALETTE[2],
                    },
                  ].filter((s) => s.value > 0)}
                  total={scopePeople}
                  centerLabel={t("شخص", "people")}
                />
                <Donut
                  small
                  slices={[
                    {
                      key: "with",
                      name: t("لديهم دورة", "Joined a course"),
                      value: scopeWithCourses,
                      color: PALETTE[1],
                    },
                    {
                      key: "without",
                      name: t("لا دورة بعد", "No course yet"),
                      value: scopePeople - scopeWithCourses,
                      color: OTHERS_COLOR,
                    },
                  ].filter((s) => s.value > 0)}
                  total={scopePeople}
                  centerLabel={t("شخص", "people")}
                />
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function Donut({
  slices,
  total,
  centerLabel,
  activeKey,
  onSelect,
  small,
}: {
  slices: Slice[];
  total: number;
  centerLabel: string;
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  small?: boolean;
}) {
  const { lang } = useT();
  const size = small ? 150 : 210;
  return (
    <div
      className={small ? "flex flex-col items-center gap-3" : "flex flex-wrap items-center gap-5"}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
              onClick={(entry) => {
                const key = (entry as unknown as { key?: string })?.key;
                if (key) onSelect?.(key);
              }}
              cursor={onSelect ? "pointer" : undefined}
            >
              {slices.map((s) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  opacity={activeKey && activeKey !== s.key ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--cx-ink)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[22px] font-extrabold leading-none tabular-nums text-[var(--cx-ink)]">
              {fmtNum(total, lang)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--cx-muted)]">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className={`space-y-1.5 text-[13px] ${small ? "w-full" : "min-w-[200px] flex-1"}`}>
        {slices.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              disabled={!onSelect || s.key === "others"}
              onClick={() => onSelect?.(s.key)}
              className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-start enabled:hover:bg-[var(--cx-raise-2)] ${activeKey === s.key ? "bg-[var(--cx-teal-50)]" : ""}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span
                className={`min-w-0 flex-1 text-[var(--cx-ink-2)] ${small ? "leading-snug" : "truncate"}`}
                dir="auto"
              >
                {s.name}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--cx-muted)]">
                <b className="text-[var(--cx-ink)]">{fmtNum(s.value, lang)}</b> ·{" "}
                {Math.round((s.value / Math.max(total, 1)) * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CityList({
  cities,
  total,
}: {
  cities: { city: string; people: number }[];
  total: number;
}) {
  const { t } = useT();
  if (!cities.length)
    return <p className="text-[13px] text-[var(--cx-muted)]">{t("لا أحد بعد", "No one yet")}</p>;
  const max = cities[0].people;
  return (
    <ul className="space-y-2.5">
      {cities.map((c) => (
        <li key={c.city} className="text-[13px]" title={`${c.city}: ${c.people}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[var(--cx-ink-2)]" dir="auto">
              {c.city}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--cx-muted)]">
              <b className="text-[var(--cx-ink)]">{c.people}</b> ·{" "}
              {Math.round((c.people / Math.max(total, 1)) * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cx-track)]">
            <div
              className="h-full rounded-full bg-[var(--cx-teal)]"
              style={{ width: `${max ? (c.people / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ClearFilter({ onClear }: { onClear: () => void }) {
  const { t } = useT();
  return (
    <button type="button" className="cx-btn cx-btn-ghost" onClick={onClear}>
      <X className="h-4 w-4" />
      <span>{t("كل المحافظات", "All governorates")}</span>
    </button>
  );
}
