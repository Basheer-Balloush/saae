import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  useT,
} from "@/components/console/ui";
import { formatSP, type Coupon } from "@/lib/coupons";
import { countActiveUses, listCoupons } from "@/lib/coupons-db";
import { getEmailsForUsers } from "@/lib/lms-admin-users.functions";
import { NewCouponDialog } from "./NewCouponDialog";
import { CouponDetailsDialog } from "./CouponDetailsDialog";
import {
  KIND_LABELS,
  STATUS_LABELS,
  USES_UNIT,
  couponKind,
  couponStatus,
  useCouponRefs,
  type CouponKind,
} from "./refs";

type Filter = CouponKind | "all";

/** Every coupon, recognition code included: create, find, open one. */
export function CouponsPage() {
  const { t, ar, lang } = useT();
  const refs = useCouponRefs();
  const fetchNames = useServerFn(getEmailsForUsers);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [used, setUsed] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, counts] = await Promise.all([listCoupons(), countActiveUses()]);
      setCoupons(list);
      setUsed(counts);
      setFailed(false);
      const ids = [...new Set(list.map((c) => c.user_id).filter((x): x is string => !!x))];
      if (ids.length) {
        const res = await fetchNames({ data: { userIds: ids } }).catch(() => null);
        setNames({ ...(res?.emails ?? {}), ...(res?.names ?? {}) });
      }
    } catch {
      setFailed(true);
    }
  }, [fetchNames]);
  useEffect(() => {
    load();
  }, [load]);

  const learnerName = useCallback((id: string | null) => (id ? (names[id] ?? "—") : "—"), [names]);
  const target = (c: Coupon) => {
    const kind = couponKind(c);
    if (kind === "category") return refs.categoryName(c.category_id, ar);
    if (kind === "personal") return learnerName(c.user_id);
    return refs.courseName(c.course_id, ar);
  };

  const counts = useMemo(() => {
    const out: Record<Filter, number> = {
      all: 0,
      recognition: 0,
      course: 0,
      category: 0,
      personal: 0,
    };
    for (const c of coupons ?? []) {
      out.all++;
      out[couponKind(c)]++;
    }
    return out;
  }, [coupons]);

  const shown = (coupons ?? []).filter((c) => {
    if (filter !== "all" && couponKind(c) !== filter) return false;
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return [c.code, c.label ?? "", target(c)].some((s) => s.toLowerCase().includes(n));
  });
  const open = coupons?.find((c) => c.id === openId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("الكوبونات", "Coupons")}
        description={t(
          "أكواد الاعتراف بإكمال الدورة، وكوبونات الخصم لدورة أو تصنيف أو متعلّم. كل متعلّم يستخدم كوبوناً واحداً في كل دورة.",
          "Course recognition codes, and discount coupons for a course, a category or a learner. Each learner uses one coupon per course.",
        )}
        actions={
          <Button onClick={() => setCreating(true)} disabled={refs.loading}>
            <Plus className="h-4 w-4" />
            {t("كوبون جديد", "New coupon")}
          </Button>
        }
      />

      <Panel
        flush
        actions={
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("ابحث بالكود أو الدورة أو المتعلّم", "Search code, course or learner")}
          />
        }
        title={
          <Seg
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("الكل", "All"), count: counts.all },
              ...(Object.keys(KIND_LABELS) as CouponKind[]).map((k) => ({
                value: k,
                label: ar ? KIND_LABELS[k].ar : KIND_LABELS[k].en,
                count: counts[k],
              })),
            ]}
          />
        }
      >
        {failed ? (
          <ErrorNote onRetry={load} />
        ) : coupons === null || refs.loading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState
            compact
            icon={Ticket}
            title={
              coupons.length
                ? t("لا توجد كوبونات مطابقة", "No matching coupons")
                : t("لا توجد كوبونات بعد", "No coupons yet")
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>{t("الكود", "Code")}</th>
                  <th>{t("النوع", "Kind")}</th>
                  <th>{t("ينطبق على", "Applies to")}</th>
                  <th>{t("الأثر", "Effect")}</th>
                  <th>{t("الاستخدام", "Used")}</th>
                  <th>{t("ينتهي", "Ends")}</th>
                  <th>{t("الحالة", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const kind = couponKind(c);
                  const n = used[c.id] ?? 0;
                  const status = couponStatus(c, n);
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                      <td>
                        <button
                          type="button"
                          dir="ltr"
                          className="font-mono text-[14px] font-bold text-[var(--cx-teal)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(c.id);
                          }}
                        >
                          {c.code}
                        </button>
                        {c.label && (
                          <div className="text-[12px] text-[var(--cx-muted)]">{c.label}</div>
                        )}
                      </td>
                      <td className="text-[13px]">
                        {ar ? KIND_LABELS[kind].ar : KIND_LABELS[kind].en}
                      </td>
                      <td className="text-[13px]">{target(c)}</td>
                      <td className="whitespace-nowrap text-[13px]">
                        {c.effect === "recognition"
                          ? t("الدورة مكتملة", "Course completed")
                          : `${Number(c.percent_off)}٪${c.max_discount != null ? ` · ${t("حد", "max")} ${formatSP(Number(c.max_discount), ar)}` : ""}`}
                      </td>
                      <td className="whitespace-nowrap text-[13px] tabular-nums">
                        {n} / {c.max_uses ?? "∞"} {ar ? USES_UNIT[kind].ar : USES_UNIT[kind].en}
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-[var(--cx-muted)]">
                        {c.expires_at ? fmtDate(c.expires_at, lang) : "—"}
                      </td>
                      <td>
                        <Pill tone={STATUS_LABELS[status].tone}>
                          {ar ? STATUS_LABELS[status].ar : STATUS_LABELS[status].en}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <NewCouponDialog
        open={creating}
        onOpenChange={setCreating}
        refs={refs}
        onCreated={async (c) => {
          await load();
          setOpenId(c.id);
        }}
      />
      {open && (
        <CouponDetailsDialog
          coupon={open}
          used={used[open.id] ?? 0}
          refs={refs}
          learnerName={learnerName}
          onOpenChange={(v) => !v && setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
