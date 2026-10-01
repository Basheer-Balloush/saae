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
import type { LocationStats } from "./lib/location";
import {
  NO_FILTER,
  countBy,
  filterPeople,
  isFiltered,
  topCities,
  type StatsFilter,
} from "./lib/location-stats";

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
        "أين يقيم أصحاب الحسابات، وما الذي يهتمّ به الناس في كل محافظة حسب تصنيفات الدورات التي سجّلوا فيها أو طلبوها. صفِّ الصفحة بالمحافظة أو الاهتمام أو الدور أو التاريخ.",
        "Where account holders live, and what people in each governorate are interested in, by the categories of the courses they joined or asked for. Filter by governorate, interest, role or date.",
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
            disabled={exporting || !q.data?.people.length}
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
  const [filter, setFilter] = useState<StatsFilter>(NO_FILTER);
  const { accounts, people, categories, governorates } = data;
  const name = (x: { name_ar: string; name_en: string }) => (lang === "ar" ? x.name_ar : x.name_en);
  const set = (patch: Partial<StatsFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const toggle = (key: "governorate" | "category", value: string) =>
    setFilter((f) => ({ ...f, [key]: f[key] === value ? "all" : value }));

  const govByKey = useMemo(() => new Map(governorates.map((g) => [g.key, g])), [governorates]);
  const catColor = useMemo(
    () => new Map(categories.map((c, i) => [c.id, PALETTE[i % PALETTE.length]])),
    [categories],
  );

  /* Each chart leaves its own side of the filter open, so it still shows
     every option, with the chosen one highlighted. */
  const matching = filterPeople(people, filter);
  const forGovernorates = filterPeople(people, filter, ["governorate"]);
  const forInterests = filterPeople(people, filter, ["category"]);
  const forMatrix = filterPeople(people, filter, ["governorate", "category"]);

  const govCounts = countBy(forGovernorates, (p) => [p.governorate]);
  const rankedGovs = [...govCounts.entries()].sort((a, b) => b[1] - a[1]);
  const govColor = new Map(
    rankedGovs.map(([k], i) => [k, i < PIE_SLICES ? PALETTE[i] : OTHERS_COLOR]),
  );
  const govSlices: Slice[] = rankedGovs.slice(0, PIE_SLICES).map(([k, v]) => ({
    key: k,
    name: govByKey.get(k) ? name(govByKey.get(k)!) : k,
    value: v,
    color: govColor.get(k)!,
  }));
  const restGovs = rankedGovs.slice(PIE_SLICES).reduce((n, [, v]) => n + v, 0);
  if (restGovs)
    govSlices.push({
      key: "others",
      name: t("غيرها", "Others"),
      value: restGovs,
      color: OTHERS_COLOR,
    });

  const catCounts = countBy(forInterests, (p) => p.categories);
  const noCourse = forInterests.filter((p) => !p.has_course).length;
  const interestSlices: Slice[] = categories
    .map((c) => ({
      key: c.id,
      name: name(c),
      value: catCounts.get(c.id) ?? 0,
      color: catColor.get(c.id)!,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  if (noCourse)
    interestSlices.push({
      key: "none",
      name: t("لا دورة بعد", "No course yet"),
      value: noCourse,
      color: OTHERS_COLOR,
    });

  const matrixGovs = [...countBy(forMatrix, (p) => [p.governorate]).entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const stackRows = matrixGovs.map(([k]) => {
    const here = forMatrix.filter((p) => p.governorate === k);
    const counts = countBy(here, (p) => p.categories);
    const row: Record<string, string | number> = {
      key: k,
      name: govByKey.get(k) ? name(govByKey.get(k)!) : k,
    };
    for (const c of categories) row[c.id] = counts.get(c.id) ?? 0;
    return row;
  });

  const instructors = matching.filter((p) => p.instructor).length;
  const withCourse = matching.filter((p) => p.has_course).length;
  const cities = topCities(matching).slice(0, 15);
  const abroad = matching.filter((p) => p.governorate === "abroad").length;
  const coveredGovs = new Set(matching.map((p) => p.governorate).filter((g) => g !== "abroad"))
    .size;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const filtered = isFiltered(filter);

  return (
    <>
      <div className="cx-card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <FilterSelect
            label={t("المحافظة", "Governorate")}
            value={filter.governorate}
            onChange={(v) => set({ governorate: v })}
            options={governorates.map((g) => ({ value: g.key, label: name(g) }))}
          />
          <FilterSelect
            label={t("الاهتمام (تصنيف الدورة)", "Interest (course category)")}
            value={filter.category}
            onChange={(v) => set({ category: v })}
            options={[
              ...categories.map((c) => ({ value: c.id, label: name(c) })),
              { value: "none", label: t("لا دورة بعد", "No course yet") },
            ]}
          />
          <FilterSelect
            label={t("الدور", "Role")}
            value={filter.role}
            onChange={(v) => set({ role: v as StatsFilter["role"] })}
            options={[
              { value: "learners", label: t("متعلّمون", "Learners") },
              { value: "instructors", label: t("مدرّبون", "Instructors") },
            ]}
          />
          <FilterSelect
            label={t("تاريخ الإجابة", "Answered")}
            value={filter.since}
            onChange={(v) => set({ since: v as StatsFilter["since"] })}
            allLabel={t("كل الأوقات", "Any time")}
            options={[
              { value: "7", label: t("آخر ٧ أيام", "Last 7 days") },
              { value: "30", label: t("آخر ٣٠ يوماً", "Last 30 days") },
              { value: "90", label: t("آخر ٩٠ يوماً", "Last 90 days") },
            ]}
          />
          <button
            type="button"
            className="cx-btn cx-btn-ghost h-10"
            onClick={() => setFilter(NO_FILTER)}
            disabled={!filtered}
          >
            <X className="h-4 w-4" />
            <span>{t("مسح الفلاتر", "Clear filters")}</span>
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={UsersRound}
          label={filtered ? t("يطابقون الفلاتر", "Match the filters") : t("أجابوا", "Answered")}
          value={fmtNum(matching.length, lang)}
          hint={
            filtered
              ? t(`من ${fmtNum(people.length, lang)} أجابوا`, `of ${people.length} who answered`)
              : t(
                  `من ${fmtNum(accounts, lang)} حساب (${fmtNum(pct(people.length, accounts), lang)}٪)`,
                  `of ${fmtNum(accounts, lang)} accounts (${pct(people.length, accounts)}%)`,
                )
          }
        />
        <StatTile
          icon={MapPin}
          label={t("محافظات فيها مستخدمون", "Governorates with users")}
          value={`${fmtNum(coveredGovs, lang)} / ${fmtNum(governorates.length - 1, lang)}`}
          tone="green"
        />
        <StatTile
          icon={BookOpen}
          label={t("لديهم دورة", "Joined a course")}
          value={fmtNum(withCourse, lang)}
          hint={t(
            `${fmtNum(pct(withCourse, matching.length), lang)}٪`,
            `${pct(withCourse, matching.length)}%`,
          )}
          tone="orange"
        />
        <StatTile
          icon={Globe2}
          label={t("خارج سوريا", "Outside Syria")}
          value={fmtNum(abroad, lang)}
          tone="gray"
        />
      </div>

      {people.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MapPin}
            title={t("لا توجد إجابات بعد", "No answers yet")}
            text={t(
              "تظهر الإجابات هنا عندما يختار المستخدمون محافظتهم عند التسجيل أو الدخول.",
              "Answers appear here as users choose their governorate when they sign up or sign in.",
            )}
          />
        </Panel>
      ) : matching.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MapPin}
            title={t("لا أحد يطابق هذه الفلاتر", "No one matches these filters")}
            action={
              <button
                type="button"
                className="cx-btn cx-btn-ghost"
                onClick={() => setFilter(NO_FILTER)}
              >
                {t("مسح الفلاتر", "Clear filters")}
              </button>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Panel
              title={t("الناس حسب المحافظة", "People by governorate")}
              description={t(
                "اضغط على محافظة لتصفية الصفحة بها",
                "Click a governorate to filter the page",
              )}
            >
              <Donut
                slices={govSlices}
                total={forGovernorates.length}
                centerLabel={t("شخص", "people")}
                activeKey={filter.governorate === "all" ? null : filter.governorate}
                onSelect={(k) => k !== "others" && toggle("governorate", k)}
              />
            </Panel>
            <Panel
              title={t("الاهتمامات", "Interests")}
              description={t(
                "تصنيفات الدورات التي سجّل فيها الناس أو طلبوها. اضغط على تصنيف لتصفية الصفحة به.",
                "Categories of the courses people joined or asked for. Click one to filter the page.",
              )}
            >
              {interestSlices.length ? (
                <Donut
                  slices={interestSlices}
                  total={interestSlices.reduce((n, s) => n + s.value, 0)}
                  centerLabel={t("اهتمام", "interests")}
                  activeKey={filter.category === "all" ? null : filter.category}
                  onSelect={(k) => toggle("category", k)}
                />
              ) : (
                <p className="py-10 text-center text-[13px] text-[var(--cx-muted)]">
                  {t("لا بيانات", "No data")}
                </p>
              )}
            </Panel>
          </div>

          <Panel
            className="mb-4"
            title={t("الاهتمامات في كل محافظة", "Interests across governorates")}
            description={t(
              "عدد المهتمين بكل تصنيف في كل محافظة. قد يهتمّ الشخص الواحد بأكثر من تصنيف. اضغط على محافظة لتصفية الصفحة بها.",
              "People interested in each category, per governorate. One person can count in several. Click a governorate to filter.",
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
                    if (key) toggle("governorate", key);
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
                      name={name(c)}
                      stackId="interests"
                      fill={catColor.get(c.id)}
                      fillOpacity={filter.category === "all" || filter.category === c.id ? 1 : 0.25}
                      maxBarSize={26}
                      cursor="pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("أكثر المدن", "Top cities")}>
              <CityList
                cities={cities.map((c) => ({
                  people: c.people,
                  city:
                    filter.governorate === "all" && govByKey.get(c.governorate)
                      ? `${c.city} · ${name(govByKey.get(c.governorate)!)}`
                      : c.city,
                }))}
                total={matching.length}
              />
            </Panel>
            <Panel title={t("من هم", "Who they are")}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Donut
                  small
                  slices={[
                    {
                      key: "learners",
                      name: t("متعلّمون", "Learners"),
                      value: matching.length - instructors,
                      color: PALETTE[0],
                    },
                    {
                      key: "instructors",
                      name: t("مدرّبون", "Instructors"),
                      value: instructors,
                      color: PALETTE[2],
                    },
                  ].filter((s) => s.value > 0)}
                  total={matching.length}
                  centerLabel={t("شخص", "people")}
                />
                <Donut
                  small
                  slices={[
                    {
                      key: "with",
                      name: t("لديهم دورة", "Joined a course"),
                      value: withCourse,
                      color: PALETTE[1],
                    },
                    {
                      key: "without",
                      name: t("لا دورة بعد", "No course yet"),
                      value: matching.length - withCourse,
                      color: OTHERS_COLOR,
                    },
                  ].filter((s) => s.value > 0)}
                  total={matching.length}
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const { t } = useT();
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] font-bold text-[var(--cx-muted)]">
      {label}
      <select className="cx-input h-10" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{allLabel ?? t("الكل", "All")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
