import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Armchair,
  Building2,
  CheckCircle2,
  Download,
  HandCoins,
  HeartHandshake,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  Settings2,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  adminConfirmDonation,
  adminCreateDonation,
  adminDeleteDonation,
  adminListCourses,
  adminListDonations,
  adminListWaitlist,
  adminUpdateSettings,
  getInitiativeSettings,
  getInitiativeStats,
} from "@/lib/initiative.functions";
import { confirmDialog } from "@/hooks/useConfirm";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft, useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey, loadFormDraft } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { UploadProgress } from "@/components/ui/upload-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  ErrorNote,
  Field,
  LangSwitch,
  Loading,
  PageHeader,
  Panel,
  Pill,
  Seg,
  ToggleRow,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { uploadInitiativeLogo, type Progress } from "@/features/website/media";

export const Route = createFileRoute("/admin/initiative")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Initiative — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InitiativePage,
});

type Stats = {
  target: number;
  done: number;
  waiting: number;
  coveredUnassigned: number;
  totalFunded: number;
};
type Donation = {
  id: string;
  donor_name: string;
  donor_display_name: string | null;
  donor_type: "individual" | "company";
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  chairs_count: number;
  amount: number;
  currency: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};
type Waiter = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: "waiting" | "covered" | "claimed" | "enrolled";
  created_at: string;
};
type Settings = {
  seat_price_usd: number | string;
  usd_to_syp_rate: number | string;
  total_target: number | string;
  course_id: string | null;
  about_ar: string | null;
  about_en: string | null;
  mission_ar: string | null;
  mission_en: string | null;
  values_ar: string | null;
  values_en: string | null;
};
type CourseOpt = { id: string; title_ar: string | null; title_en: string | null };

const EMPTY_DONATION = {
  donor_name: "",
  donor_display_name: "",
  donor_type: "company" as "company" | "individual",
  email: "",
  phone: "",
  logo_url: "",
  chairs_count: 10,
  currency: "USD" as "USD" | "SYP",
  confirm: true,
};

const WAIT_UI: Record<
  Waiter["status"],
  { ar: string; en: string; tone: "orange" | "teal" | "green" }
> = {
  waiting: { ar: "ينتظر", en: "Waiting", tone: "orange" },
  covered: { ar: "مقعد محجوز", en: "Seat ready", tone: "teal" },
  claimed: { ar: "استلم المقعد", en: "Claimed", tone: "green" },
  enrolled: { ar: "مسجّل", en: "Enrolled", tone: "green" },
};

/* The Million Users initiative on one screen: where the seats are, who gave
   them, who is waiting, and the settings behind the public page. */
function InitiativePage() {
  const { t, ar, lang } = useT();
  const { user } = useAuth();
  const statsFn = useServerFn(getInitiativeStats);
  const settingsFn = useServerFn(getInitiativeSettings);
  const donationsFn = useServerFn(adminListDonations);
  const waitlistFn = useServerFn(adminListWaitlist);
  const confirmFn = useServerFn(adminConfirmDonation);
  const deleteFn = useServerFn(adminDeleteDonation);

  const [stats, setStats] = useState<Stats | null>(null);
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [waitlist, setWaitlist] = useState<Waiter[] | null>(null);
  const [error, setError] = useState(false);
  const [donFilter, setDonFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [waitFilter, setWaitFilter] = useState<"waiting" | "covered" | "all">("waiting");
  const [busy, setBusy] = useState<string | null>(null);
  const [giving, setGiving] = useState(false);
  const [setup, setSetup] = useState(false);
  const [price, setPrice] = useState<{ seat: number; rate: number } | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [s, d, w, st] = await Promise.all([
        statsFn(),
        donationsFn(),
        waitlistFn(),
        settingsFn(),
      ]);
      setStats(s);
      setDonations(d as Donation[]);
      setWaitlist(w as Waiter[]);
      if (st)
        setPrice({
          seat: Number(st.seat_price_usd ?? 1),
          rate: Number(st.usd_to_syp_rate ?? 14000),
        });
    } catch {
      setError(true);
    }
  }, [statsFn, donationsFn, waitlistFn, settingsFn]);
  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (d: Donation) => {
    setBusy(d.id);
    try {
      await confirmFn({ data: { id: d.id } });
      toast.success(
        t(
          "أُكّد التبرع، وغُطّي من ينتظر بقدر المقاعد",
          "Donation confirmed. Waiting people were given its seats.",
        ),
      );
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (d: Donation) => {
    const ok = await confirmDialog({
      title: t("حذف هذا التبرع؟", "Delete this donation?"),
      description: t(
        `${d.donor_display_name || d.donor_name} · ${d.chairs_count} مقعد. لا يمكن التراجع.`,
        `${d.donor_display_name || d.donor_name} · ${d.chairs_count} seats. This cannot be undone.`,
      ),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(d.id);
    try {
      await deleteFn({ data: { id: d.id } });
      toast.success(t("حُذف التبرع", "Donation deleted"));
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const shownDonations = (donations ?? []).filter(
    (d) => donFilter === "all" || d.status === donFilter,
  );
  const shownWait = (waitlist ?? []).filter((w) => waitFilter === "all" || w.status === waitFilter);
  const pendingCount = (donations ?? []).filter((d) => d.status === "pending").length;

  const exportWaitlist = () =>
    exportRowsToXlsx<Waiter>({
      filenameBase: "initiative-waitlist",
      sheetName: t("قائمة الانتظار", "Waiting list"),
      rtl: ar,
      rows: shownWait,
      columns: [
        { header: t("الاسم", "Name"), get: (r) => r.full_name, width: 28 },
        { header: t("البريد", "Email"), get: (r) => r.email, width: 28 },
        { header: t("الهاتف", "Phone"), get: (r) => r.phone, width: 18 },
        {
          header: t("الحالة", "Status"),
          get: (r) => (ar ? WAIT_UI[r.status].ar : WAIT_UI[r.status].en),
          width: 16,
        },
        { header: t("تاريخ التسجيل", "Joined"), type: "date", get: (r) => r.created_at, width: 20 },
      ],
    });

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("مبادرة المليون مستخدم", "Million Users initiative")}
        description={t(
          "كل تبرع يموّل مقاعد، وكل مقعد يذهب لأول شخص في قائمة الانتظار.",
          "Every donation funds seats, and every seat goes to the next person on the waiting list.",
        )}
        actions={
          <>
            <Button variant="outline" onClick={() => setSetup(true)}>
              <Settings2 className="h-4 w-4" />
              {t("الإعدادات", "Settings")}
            </Button>
            <Button onClick={() => setGiving(true)}>
              <Plus className="h-4 w-4" />
              {t("تسجيل تبرع", "Record a donation")}
            </Button>
          </>
        }
      />

      {error ? <ErrorNote onRetry={load} /> : !stats ? <Loading /> : <SeatFlow stats={stats} />}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel
          title={t("التبرعات", "Donations")}
          description={
            pendingCount
              ? t(
                  `${fmtNum(pendingCount, lang)} بانتظار التأكيد`,
                  `${fmtNum(pendingCount, lang)} waiting for confirmation`,
                )
              : undefined
          }
          actions={
            <Seg
              value={donFilter}
              onChange={setDonFilter}
              options={[
                { value: "all", label: t("الكل", "All") },
                {
                  value: "pending",
                  label: t("بانتظار التأكيد", "To confirm"),
                  count: pendingCount,
                },
                { value: "confirmed", label: t("مؤكدة", "Confirmed") },
              ]}
            />
          }
          flush
          className="lg:col-span-3"
        >
          {donations === null ? (
            <Loading />
          ) : shownDonations.length === 0 ? (
            <EmptyState icon={HandCoins} title={t("لا توجد تبرعات هنا", "No donations here")} />
          ) : (
            <ul className="divide-y divide-[var(--cx-line-2)]">
              {shownDonations.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <DonorMark url={d.logo_url} type={d.donor_type} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">
                      {d.donor_display_name || d.donor_name}
                    </div>
                    <div className="text-[12.5px] text-[var(--cx-muted)]">
                      {d.donor_type === "company" ? t("شركة", "Company") : t("فرد", "Individual")} ·{" "}
                      {fmtDate(d.created_at, lang)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="flex items-center justify-end gap-1.5 font-extrabold tabular-nums">
                      <Armchair className="h-4 w-4 text-[var(--cx-teal)]" />
                      {fmtNum(d.chairs_count, lang)}
                    </div>
                    <div className="text-[12.5px] tabular-nums text-[var(--cx-muted)]" dir="ltr">
                      {Number(d.amount).toLocaleString()} {d.currency}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.status === "pending" ? (
                      <Button
                        size="sm"
                        className="bg-[var(--cx-olive)] text-white hover:bg-[#5a7c35]"
                        disabled={busy === d.id}
                        onClick={() => confirm(d)}
                      >
                        {busy === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t("تأكيد", "Confirm")}
                      </Button>
                    ) : (
                      <Pill tone={d.status === "confirmed" ? "green" : "gray"}>
                        {d.status === "confirmed" ? t("مؤكد", "Confirmed") : t("ملغى", "Cancelled")}
                      </Pill>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                      disabled={busy === d.id}
                      onClick={() => remove(d)}
                      aria-label={t("حذف", "Delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t("قائمة الانتظار", "Waiting list")}
          description={t(
            "بالترتيب: الأقدم أولاً يأخذ المقعد التالي.",
            "In order: the earliest gets the next seat.",
          )}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={exportWaitlist}
              disabled={!shownWait.length}
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          }
          flush
          className="lg:col-span-2"
        >
          <div className="border-b border-[var(--cx-line-2)] px-5 py-3">
            <Seg
              value={waitFilter}
              onChange={setWaitFilter}
              options={[
                {
                  value: "waiting",
                  label: t("ينتظرون", "Waiting"),
                  count: (waitlist ?? []).filter((w) => w.status === "waiting").length,
                },
                {
                  value: "covered",
                  label: t("مقعد جاهز", "Seat ready"),
                  count: (waitlist ?? []).filter((w) => w.status === "covered").length,
                },
                { value: "all", label: t("الكل", "All") },
              ]}
            />
          </div>
          {waitlist === null ? (
            <Loading />
          ) : shownWait.length === 0 ? (
            <EmptyState compact icon={Users} title={t("لا أحد هنا", "Nobody here")} />
          ) : (
            <ol className="max-h-[560px] divide-y divide-[var(--cx-line-2)] overflow-y-auto">
              {shownWait.map((w, i) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cx-raise-2)] text-[12.5px] font-extrabold tabular-nums text-[var(--cx-ink-2)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{w.full_name}</div>
                    <div className="truncate text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
                      {[w.email, w.phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-end">
                    <Pill tone={WAIT_UI[w.status].tone}>
                      {ar ? WAIT_UI[w.status].ar : WAIT_UI[w.status].en}
                    </Pill>
                    <div className="mt-0.5 text-[11.5px] text-[var(--cx-muted)]">
                      {fmtDate(w.created_at, lang)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Sheet open={giving} onOpenChange={setGiving}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          <DonationForm
            userId={user?.id}
            price={price}
            onDone={() => {
              setGiving(false);
              load();
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={setup} onOpenChange={setSetup}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-2xl"
          dir={ar ? "rtl" : "ltr"}
        >
          <SettingsForm userId={user?.id} onSaved={load} onClose={() => setSetup(false)} />
        </SheetContent>
      </Sheet>
      {/* Reopen a half-filled form after a refresh. Mounted outside the sheets so it runs while they are closed. */}
      <DraftReopener
        userId={user?.id}
        onDonation={() => setGiving(true)}
        onSettings={() => setSetup(true)}
      />
    </div>
  );
}

/** Funded → in use / free, and the people still waiting. */
function SeatFlow({ stats }: { stats: Stats }) {
  const { t, lang } = useT();
  const pct = stats.target ? Math.min(100, (stats.done / stats.target) * 100) : 0;
  const nodes = [
    {
      icon: HeartHandshake,
      label: t("مقاعد مموّلة", "Seats funded"),
      value: stats.totalFunded,
      tone: "var(--cx-teal)",
    },
    {
      icon: CheckCircle2,
      label: t("ذهبت لمتدرّبين", "Given to trainees"),
      value: stats.done,
      tone: "var(--cx-green)",
    },
    {
      icon: Armchair,
      label: t("مقاعد جاهزة لم تُستلم", "Seats not yet taken"),
      value: stats.coveredUnassigned,
      tone: "var(--cx-teal-700)",
    },
    {
      icon: Users,
      label: t("ينتظرون متبرّعاً", "Waiting for a sponsor"),
      value: stats.waiting,
      tone: "var(--cx-orange)",
    },
  ];
  return (
    <section className="cx-card relative overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-[var(--cx-muted)]">
            {t("التقدّم نحو الهدف", "Progress to the goal")}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[34px] font-extrabold leading-none tabular-nums">
              {fmtNum(stats.done, lang)}
            </span>
            <span className="text-[14px] text-[var(--cx-muted)]">
              / {fmtNum(stats.target, lang)}
            </span>
          </div>
        </div>
        <span className="text-[13px] font-bold tabular-nums text-[var(--cx-teal)]">
          {pct < 0.1 && stats.done > 0 ? "<0.1" : pct.toFixed(pct < 10 ? 2 : 1)}%
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--cx-raise-2)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#048090] to-[#77e0e8]"
          style={{ width: `${Math.max(pct, stats.done ? 0.6 : 0)}%` }}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {nodes.map((n, i) => (
          <div
            key={n.label}
            className="relative rounded-2xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)] p-3.5"
          >
            <n.icon className="h-5 w-5" style={{ color: n.tone }} />
            <div className="mt-2 text-[24px] font-extrabold leading-none tabular-nums">
              {fmtNum(n.value, lang)}
            </div>
            <div className="mt-1 text-[12.5px] font-semibold text-[var(--cx-muted)]">{n.label}</div>
            {i < 2 && (
              <ArrowRight
                className="absolute top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[var(--cx-faint)] md:block -end-3.5 rtl:rotate-180"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
      {stats.waiting > 0 && stats.coveredUnassigned === 0 && (
        <p className="mt-4 text-[13.5px] text-[var(--cx-orange-ink)]">
          {t(
            `${fmtNum(stats.waiting, lang)} شخص ينتظرون. أي تبرع مؤكد يعطيهم مقاعد مباشرة.`,
            `${fmtNum(stats.waiting, lang)} people are waiting. Any confirmed donation gives them seats straight away.`,
          )}
        </p>
      )}
    </section>
  );
}

function DonorMark({ url, type }: { url: string | null; type: Donation["donor_type"] }) {
  if (url)
    return (
      <img
        src={url}
        alt=""
        className="h-11 w-11 shrink-0 rounded-xl border border-[var(--cx-line)] bg-white object-contain p-1"
      />
    );
  const Icon = type === "company" ? Building2 : User;
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function DonationForm({
  userId,
  price,
  onDone,
}: {
  userId?: string;
  price: { seat: number; rate: number } | null;
  onDone: () => void;
}) {
  const { t } = useT();
  const createFn = useServerFn(adminCreateDonation);
  const draft = useFormDraft(formDraftKey(userId, "initiative-donation", "new"), EMPTY_DONATION);
  const f = draft.values;
  const set = (patch: Partial<typeof EMPTY_DONATION>) => draft.setValues({ ...f, ...patch });
  const [saving, setSaving] = useState(false);
  const [upload, setUpload] = useState<Progress | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const amount = useMemo(() => {
    if (!price) return null;
    const usd = f.chairs_count * price.seat;
    return f.currency === "USD" ? usd : usd * price.rate;
  }, [price, f.chairs_count, f.currency]);

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return void toast.error(t("اختر ملف صورة", "Choose an image file"));
    if (file.size > 5 * 1024 * 1024)
      return void toast.error(t("الحد الأقصى 5 ميجابايت", "5 MB at most"));
    try {
      set({ logo_url: await uploadInitiativeLogo(file, setUpload) });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setUpload(null);
    }
  };

  const submit = async () => {
    if (f.donor_name.trim().length < 2)
      return void toast.error(t("اكتب اسم المتبرع", "Enter the donor's name"));
    if (!Number.isFinite(f.chairs_count) || f.chairs_count < 1)
      return void toast.error(t("عدد المقاعد يجب أن يكون 1 أو أكثر", "Seats must be 1 or more"));
    setSaving(true);
    try {
      await createFn({
        data: {
          donor_name: f.donor_name.trim(),
          donor_display_name: f.donor_display_name.trim() || undefined,
          donor_type: f.donor_type,
          email: f.email.trim() || undefined,
          phone: f.phone.trim() || undefined,
          logo_url: f.logo_url || undefined,
          chairs_count: Math.round(f.chairs_count),
          currency: f.currency,
          confirm: f.confirm,
        },
      });
      toast.success(
        f.confirm
          ? t("سُجّل التبرع وأُكّد", "Donation recorded and confirmed")
          : t("سُجّل التبرع بانتظار التأكيد", "Donation recorded, waiting for confirmation"),
      );
      // Keep type, logo, seats and currency: donations are often entered in a row.
      draft.clearDraft({
        ...EMPTY_DONATION,
        donor_type: f.donor_type,
        logo_url: f.logo_url,
        chairs_count: f.chairs_count,
        currency: f.currency,
        confirm: f.confirm,
      });
      onDone();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>{t("تسجيل تبرع", "Record a donation")}</SheetTitle>
        <p className="text-[13px] text-[var(--cx-muted)]">
          {t(
            "للتبرعات التي وصلت خارج الموقع: تحويل، نقداً، أو اتفاق مع شركة.",
            "For donations made off the site: a transfer, cash, or an agreement with a company.",
          )}
        </p>
      </SheetHeader>
      <DraftNotice show={draft.restored} onDiscard={() => draft.clearDraft(EMPTY_DONATION)} />

      <div className="grid grid-cols-2 gap-2">
        {(["company", "individual"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="cx-choice items-center"
            data-active={f.donor_type === k}
            onClick={() => set({ donor_type: k })}
          >
            {k === "company" ? (
              <Building2 className="h-5 w-5 text-[var(--cx-teal)]" />
            ) : (
              <User className="h-5 w-5 text-[var(--cx-teal)]" />
            )}
            <span className="font-bold">
              {k === "company" ? t("شركة", "Company") : t("فرد", "Individual")}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("اسم المتبرع", "Donor name")}>
          <Input value={f.donor_name} onChange={(e) => set({ donor_name: e.target.value })} />
        </Field>
        <Field
          label={t("الاسم الظاهر للعموم", "Public name")}
          hint={t(
            "اختياري. يظهر بدل الاسم في لوحة الداعمين.",
            "Optional. Shown instead of the name on the supporters wall.",
          )}
        >
          <Input
            value={f.donor_display_name}
            onChange={(e) => set({ donor_display_name: e.target.value })}
          />
        </Field>
        <Field label={t("البريد", "Email")}>
          <Input
            type="email"
            dir="ltr"
            value={f.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label={t("الهاتف", "Phone")}>
          <Input
            type="tel"
            dir="ltr"
            value={f.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
      </div>

      <Field label={t("الشعار", "Logo")}>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickLogo}
          />
          {f.logo_url ? (
            <img
              src={f.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl border border-[var(--cx-line)] bg-white object-contain p-1"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-[var(--cx-line)] text-[var(--cx-faint)]">
              <ImagePlus className="h-5 w-5" />
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!upload}
            onClick={() => fileRef.current?.click()}
          >
            {upload ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {f.logo_url ? t("تغيير", "Change") : t("رفع شعار", "Upload")}
          </Button>
          {f.logo_url && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => set({ logo_url: "" })}
              aria-label={t("إزالة", "Remove")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {upload && (
          <UploadProgress
            percent={upload.pct}
            loaded={upload.loaded}
            total={upload.total}
            label={upload.name}
            compact
          />
        )}
      </Field>

      <div className="rounded-2xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-[var(--cx-ink-2)]">
              {t("عدد المقاعد", "Seats")}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => set({ chairs_count: Math.max(1, f.chairs_count - 1) })}
                aria-label="-"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                className="h-10 w-24 text-center text-[18px] font-extrabold"
                value={f.chairs_count}
                onChange={(e) => set({ chairs_count: Number(e.target.value) })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => set({ chairs_count: f.chairs_count + 1 })}
                aria-label="+"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Seg
            value={f.currency}
            onChange={(v) => set({ currency: v })}
            options={[
              { value: "USD", label: "USD" },
              { value: "SYP", label: "SYP" },
            ]}
          />
        </div>
        <div className="mt-3 border-t border-[var(--cx-line-2)] pt-3 text-[13.5px]">
          {t("المبلغ المحسوب", "Amount")}:{" "}
          <b className="tabular-nums text-[var(--cx-teal)]" dir="ltr">
            {amount === null ? "—" : `${amount.toLocaleString()} ${f.currency}`}
          </b>
          {price && (
            <span className="text-[var(--cx-muted)]">
              {" "}
              · {t(`سعر المقعد ${price.seat} USD`, `seat price ${price.seat} USD`)}
              {f.currency === "SYP" && ` × ${price.rate.toLocaleString()}`}
            </span>
          )}
        </div>
      </div>

      <ToggleRow
        id="don-confirm"
        label={t("تأكيد الآن", "Confirm now")}
        hint={t(
          "المال وصل فعلاً: تُعطى المقاعد فوراً لمن ينتظر.",
          "The money has arrived: seats go to waiting people right away.",
        )}
        checked={f.confirm}
        onChange={(v) => set({ confirm: v })}
      />

      <Button className="w-full" size="lg" onClick={submit} disabled={saving || !!upload}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("تسجيل التبرع", "Record donation")}
      </Button>
    </div>
  );
}

const TEXTS = [
  { key: "about", ar: "من نحن", en: "About" },
  { key: "mission", ar: "رسالتنا", en: "Mission" },
  { key: "values", ar: "قيمنا", en: "Values" },
] as const;

function SettingsForm({
  userId,
  onSaved,
  onClose,
}: {
  userId?: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t, ar } = useT();
  const settingsFn = useServerFn(getInitiativeSettings);
  const coursesFn = useServerFn(adminListCourses);
  const updateFn = useServerFn(adminUpdateSettings);
  const [loaded, setLoaded] = useState<Settings | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [lang, setLang] = useState<"ar" | "en">(ar ? "ar" : "en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsFn()
      .then((r) => {
        const v = pickSettings(r as Settings);
        setLoaded(v);
        setS(v);
      })
      .catch((e) => toast.error(toUserMessage(e)));
    coursesFn()
      .then((c) => setCourses(c as CourseOpt[]))
      .catch(() => {});
  }, [settingsFn, coursesFn]);

  const draft = useRecordDraft({
    key: formDraftKey(userId, "initiative-settings", "current"),
    loaded,
    current: s,
    apply: setS,
  });

  if (!s) return <Loading />;
  const dirty = JSON.stringify(s) !== JSON.stringify(loaded);

  const save = async () => {
    const seat = Number(s.seat_price_usd);
    const rate = Number(s.usd_to_syp_rate);
    const target = Number(s.total_target);
    if (!(seat > 0) || !(rate > 0) || !(target > 0) || !Number.isInteger(target)) {
      return void toast.error(
        t(
          "الأسعار والهدف يجب أن تكون أرقاماً موجبة",
          "Prices and the goal must be positive numbers",
        ),
      );
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          seat_price_usd: seat,
          usd_to_syp_rate: rate,
          total_target: target,
          course_id: s.course_id || null,
          about_ar: s.about_ar ?? "",
          about_en: s.about_en ?? "",
          mission_ar: s.mission_ar ?? "",
          mission_en: s.mission_en ?? "",
          values_ar: s.values_ar ?? "",
          values_en: s.values_en ?? "",
        },
      });
      setLoaded(s);
      draft.clear();
      toast.success(t("حُفظت الإعدادات", "Settings saved"));
      onSaved();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const missing = {
    ar: TEXTS.some((x) => !(s[`${x.key}_ar`] ?? "").trim()),
    en: TEXTS.some((x) => !(s[`${x.key}_en`] ?? "").trim()),
  };

  return (
    <div className="space-y-6 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>{t("إعدادات المبادرة", "Initiative settings")}</SheetTitle>
        <p className="text-[13px] text-[var(--cx-muted)]">
          {t("تظهر على صفحة المبادرة العامة.", "These show on the public initiative page.")}
        </p>
      </SheetHeader>
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />

      <section className="space-y-3">
        <h3 className="text-[15px] font-extrabold">{t("السعر والهدف", "Price and goal")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("سعر المقعد (USD)", "Seat price (USD)")}>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.seat_price_usd}
              onChange={(e) => setS({ ...s, seat_price_usd: e.target.value })}
            />
          </Field>
          <Field label={t("سعر الدولار بالليرة", "USD → SYP rate")}>
            <Input
              type="number"
              min={0}
              value={s.usd_to_syp_rate}
              onChange={(e) => setS({ ...s, usd_to_syp_rate: e.target.value })}
            />
          </Field>
          <Field label={t("الهدف (عدد المستخدمين)", "Goal (users)")}>
            <Input
              type="number"
              min={1}
              value={s.total_target}
              onChange={(e) => setS({ ...s, total_target: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[15px] font-extrabold">{t("دورة المبادرة", "Initiative course")}</h3>
        <Field
          label={t(
            "من يحصل على مقعد يُسجَّل في هذه الدورة",
            "People given a seat are enrolled in this course",
          )}
        >
          <select
            className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
            value={s.course_id ?? ""}
            onChange={(e) => setS({ ...s, course_id: e.target.value || null })}
          >
            <option value="">{t("— بدون دورة —", "— No course —")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {(ar ? c.title_ar || c.title_en : c.title_en || c.title_ar) ?? c.id}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">{t("نصوص الصفحة", "Page text")}</h3>
          <LangSwitch value={lang} onChange={setLang} missing={missing} />
        </div>
        {TEXTS.map((x) => {
          const k = `${x.key}_${lang}` as keyof Settings;
          return (
            <Field key={k} label={lang === "ar" ? x.ar : x.en}>
              <Textarea
                rows={4}
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={(s[k] as string | null) ?? ""}
                onChange={(e) => setS({ ...s, [k]: e.target.value })}
              />
            </Field>
          );
        })}
      </section>

      <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-[var(--cx-line)] bg-[var(--cx-card-solid)] px-6 py-3">
        <Button className="flex-1" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {dirty ? t("حفظ الإعدادات", "Save settings") : t("لا تغييرات", "No changes")}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {t("إغلاق", "Close")}
        </Button>
      </div>
    </div>
  );
}

function pickSettings(r: Settings | null): Settings {
  return {
    seat_price_usd: r?.seat_price_usd ?? 1,
    usd_to_syp_rate: r?.usd_to_syp_rate ?? 14000,
    total_target: r?.total_target ?? 1000000,
    course_id: r?.course_id ?? null,
    about_ar: r?.about_ar ?? "",
    about_en: r?.about_en ?? "",
    mission_ar: r?.mission_ar ?? "",
    mission_en: r?.mission_en ?? "",
    values_ar: r?.values_ar ?? "",
    values_en: r?.values_en ?? "",
  };
}

/** Opens the donation or settings sheet once when this device holds an unsaved draft for it. */
function DraftReopener({
  userId,
  onDonation,
  onSettings,
}: {
  userId?: string;
  onDonation: () => void;
  onSettings: () => void;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !userId) return;
    done.current = true;
    try {
      const has = (form: string, id: string) => {
        const key = formDraftKey(userId, form, id);
        return !!key && loadFormDraft(key) !== null;
      };
      if (has("initiative-donation", "new")) onDonation();
      else if (has("initiative-settings", "current")) onSettings();
    } catch {
      /* storage blocked: nothing to reopen */
    }
  }, [userId, onDonation, onSettings]);
  return null;
}
