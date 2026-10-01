import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Globe2, Loader2, MapPin, RefreshCw, UsersRound } from "lucide-react";
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
import type { GovernorateStats } from "./lib/location";

/* Admin page: where users live, per governorate and per city. */
export function LocationStatsAdmin() {
  const { t, lang } = useT();
  const fetchStats = useServerFn(getLocationStats);
  const fetchRows = useServerFn(listLocationsForExport);
  const [selected, setSelected] = useState<string | null>(null);
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
        "أين يقيم أصحاب الحسابات الآن، كما اختاروا المحافظة وكتبوا المدينة. تُجمع الكتابات المتقاربة للمدينة نفسها (ببيلا وببيلة).",
        "Where account holders live now: the governorate they chose and the city they typed. Spellings of the same city are grouped (ببيلا and ببيلة).",
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

  const { accounts, answered, governorates } = q.data;
  const coverage = accounts ? Math.round((answered / accounts) * 100) : 0;
  const inSyria = governorates.filter((g) => g.key !== "abroad");
  const abroad = governorates.find((g) => g.key === "abroad");
  const covered = inSyria.filter((g) => g.people > 0).length;
  const ranked = [...governorates].sort((a, b) => b.people - a.people);
  const current: GovernorateStats | undefined =
    governorates.find((g) => g.key === selected) ?? ranked.find((g) => g.people > 0);
  const name = (g: GovernorateStats) => (lang === "ar" ? g.name_ar : g.name_en);

  return (
    <div>
      {header}

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
          icon={Globe2}
          label={t("خارج سوريا", "Outside Syria")}
          value={fmtNum(abroad?.people ?? 0, lang)}
          tone="gray"
        />
        <StatTile
          icon={MapPin}
          label={t("أكثر محافظة", "Top governorate")}
          value={ranked[0]?.people ? name(ranked[0]) : "—"}
          hint={
            ranked[0]?.people
              ? t(`${fmtNum(ranked[0].people, lang)} شخص`, `${ranked[0].people} people`)
              : undefined
          }
          tone="orange"
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title={t("الأشخاص حسب المحافظة", "People per governorate")}
            description={t("اضغط على محافظة لترى مدنها", "Click a governorate to see its cities")}
          >
            <ul className="space-y-2.5">
              {ranked.map((g) => (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(g.key)}
                    aria-pressed={current?.key === g.key}
                    className={`w-full rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors hover:bg-[var(--cx-raise-2)] ${current?.key === g.key ? "bg-[var(--cx-teal-50)]" : ""}`}
                  >
                    <Bar label={name(g)} value={g.people} max={ranked[0].people} total={answered} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel
            title={
              current
                ? t(`المدن في ${current.name_ar}`, `Cities in ${current.name_en}`)
                : t("المدن", "Cities")
            }
            description={
              current
                ? t(
                    `${fmtNum(current.cities.length, lang)} مدينة أو بلدة`,
                    `${current.cities.length} cities or towns`,
                  )
                : undefined
            }
          >
            {current && current.cities.length ? (
              <ul className="space-y-2.5">
                {current.cities.map((c) => (
                  <li key={c.city} className="px-2 text-[13px]">
                    <Bar
                      label={c.city}
                      value={c.people}
                      max={current.cities[0].people}
                      total={current.people}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t("لا أحد من هذه المحافظة بعد", "No one from this governorate yet")}
              </p>
            )}
          </Panel>
        </div>
      )}
      <p className="mt-4 text-[12px] text-[var(--cx-muted)]">
        {t("آخر تحميل:", "Loaded:")} {fmtDate(new Date(q.dataUpdatedAt).toISOString(), lang, true)}
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  total,
}: {
  label: string;
  value: number;
  max: number;
  total: number;
}) {
  return (
    <span className="block" title={`${label}: ${value}`}>
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="truncate text-[var(--cx-ink-2)]" dir="auto">
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-[var(--cx-muted)]">
          <b className="text-[var(--cx-ink)]">{value}</b> ·{" "}
          {Math.round((value / Math.max(total, 1)) * 100)}%
        </span>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--cx-track)]">
        <span
          className="block h-full rounded-full bg-[var(--cx-teal)]"
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        />
      </span>
    </span>
  );
}
