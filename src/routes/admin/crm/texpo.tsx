import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Flag,
  Gamepad2,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Plus,
  QrCode,
  Ticket,
  UserPlus,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/auth/admin-route-guard";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  adminTexpoCreateLink,
  adminTexpoOverview,
  adminTexpoSetLinkActive,
  type GameLink,
  type TexpoOverview,
} from "@/features/texpo/lib/texpo-admin.functions";
import { AI_USES, FIELDS, LEVELS, type Level } from "@/features/texpo/lib/texpo-shared";
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
import {
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  StatTile,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { EventsTabs } from "@/features/crm/EventsTabs";

export const Route = createFileRoute("/admin/crm/texpo")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Texpo game — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TexpoAdminPage,
});

const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "professional"];
const LEVEL_COLOR: Record<Level, string> = {
  beginner: "#1aa6b4",
  intermediate: "#5b74e0",
  professional: "#c9971f",
};

function gameUrl(slug: string | null) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.aisyria.org";
  return slug ? `${origin}/texpo?l=${slug}` : `${origin}/texpo`;
}

function downloadQr(url: string, name: string) {
  const svg = renderSVG(url, { ecc: "M", border: 2, pixelSize: 12 });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `texpo-qr-${name}.svg`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* Texpo in the CRM: the tracked links with a QR code each, how far people
   got through each link, who played, and who claimed a coupon. */
function TexpoAdminPage() {
  const { t, ar, lang } = useT();
  const overviewFn = useServerFn(adminTexpoOverview);
  const createFn = useServerFn(adminTexpoCreateLink);
  const toggleFn = useServerFn(adminTexpoSetLinkActive);
  const [data, setData] = useState<TexpoOverview | null>(null);
  const [error, setError] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState<GameLink | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await overviewFn({}));
    } catch {
      setError(true);
    }
  }, [overviewFn]);
  useEffect(() => {
    load();
  }, [load]);

  const linkName = (l: GameLink) =>
    l.id ? l.label : t("مباشر (texpo/ بلا رابط)", "Direct (/texpo with no link)");

  const copy = (url: string) =>
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("نُسخ الرابط", "Link copied")),
      () => toast.error(t("تعذّر النسخ", "Could not copy")),
    );

  const toggle = async (l: GameLink) => {
    if (!l.id) return;
    try {
      await toggleFn({ data: { id: l.id, active: !l.is_active } });
      setData((d) =>
        d
          ? {
              ...d,
              links: d.links.map((x) => (x.id === l.id ? { ...x, is_active: !x.is_active } : x)),
            }
          : d,
      );
      toast.success(
        l.is_active ? t("أُوقف الرابط", "Link stopped") : t("فُعّل الرابط", "Link active"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    }
  };

  const create = async () => {
    if (label.trim().length < 2) {
      toast.error(t("أدخل اسماً للرابط", "Enter a name for the link"));
      return;
    }
    setSaving(true);
    try {
      const link = await createFn({ data: { label: label.trim(), slug: slug.trim() } });
      setNewOpen(false);
      setLabel("");
      setSlug("");
      toast.success(t("أُنشئ الرابط", "Link created"));
      copy(gameUrl(link.slug));
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "error";
      toast.error(
        m === "slug_taken"
          ? t("هذا الرمز مستخدم، اختر غيره", "That code is taken; choose another")
          : m.includes("Invalid") || m.includes("regex")
            ? t(
                "الرمز: أحرف إنكليزية صغيرة وأرقام وشرطات فقط",
                "Code: lowercase English letters, digits and dashes only",
              )
            : m,
      );
    } finally {
      setSaving(false);
    }
  };

  const exportPlayers = async () => {
    if (!data) return;
    const fieldName = (id: string | null) => {
      const f = FIELDS.find((x) => x.id === id);
      return f ? (ar ? f.ar : f.en) : "";
    };
    const aiUseName = (id: string | null) => {
      const a = AI_USES.find((x) => x.id === id);
      return a ? (ar ? a.ar : a.en) : "";
    };
    await exportRowsToXlsx({
      filenameBase: "texpo-players",
      sheetName: t("اللاعبون", "Players"),
      rtl: ar,
      rows: data.players,
      columns: [
        { header: t("الاسم", "Name"), get: (r) => r.name, width: 26 },
        { header: t("البريد", "Email"), get: (r) => r.email, width: 30 },
        {
          header: t("المستوى", "Level"),
          get: (r) => (ar ? LEVELS[r.level].name.ar : LEVELS[r.level].name.en),
          width: 14,
        },
        { header: t("النتيجة", "Score"), get: (r) => r.score, width: 8 },
        { header: t("المجال", "Field"), get: (r) => fieldName(r.field), width: 26 },
        {
          header: t("استخدام الذكاء الاصطناعي", "AI use"),
          get: (r) => aiUseName(r.ai_use),
          width: 18,
        },
        { header: t("الكوبون", "Coupon"), get: (r) => r.code, width: 18 },
        {
          header: t("استُخدم", "Used"),
          get: (r) => (r.used ? t("نعم", "Yes") : t("لا", "No")),
          width: 8,
        },
        {
          header: t("حساب جديد", "New account"),
          get: (r) => (r.account_new ? t("نعم", "Yes") : t("لا", "No")),
          width: 10,
        },
        {
          header: t("حادث أبو الجود", "Chatted"),
          get: (r) => (r.chatted ? t("نعم", "Yes") : t("لا", "No")),
          width: 10,
        },
        {
          header: t("الرابط", "Link"),
          get: (r) => (r.link === "direct" ? t("مباشر", "Direct") : r.link),
          width: 20,
        },
        {
          header: t("وقت الاستلام", "Claimed at"),
          type: "date",
          get: (r) => r.claimed_at,
          width: 20,
        },
      ],
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("الفعاليات", "Events")}
        title={t("لعبة تكسبو", "Texpo game")}
        description={t(
          "تحدّي أبو الجود في معرض تكسبو (8 إلى 11 تشرين الأول 2026): الروابط وأرقام كل رابط ومن لعب ومن استلم كوبوناً.",
          "Abu Al-Joud's challenge at Texpo (8–11 October 2026): the links, each link's numbers, who played and who claimed a coupon.",
        )}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/texpo" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t("افتح اللعبة", "Open the game")}
              </a>
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("رابط جديد", "New link")}
            </Button>
          </>
        }
      />
      <EventsTabs />

      {error ? (
        <ErrorNote onRetry={load} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile
              icon={MousePointerClick}
              label={t("فتحوا اللعبة", "Opened")}
              value={fmtNum(data.total.opened, lang)}
              hint={t("جهاز واحد يُحسب مرة لكل رابط", "Each device once per link")}
            />
            <StatTile
              icon={Gamepad2}
              label={t("بدؤوا", "Started")}
              value={fmtNum(data.total.started, lang)}
            />
            <StatTile
              icon={Flag}
              label={t("أنهوا", "Finished")}
              value={fmtNum(data.total.finished, lang)}
            />
            <StatTile
              icon={Ticket}
              tone="green"
              label={t("استلموا كوبوناً", "Claimed a coupon")}
              value={fmtNum(data.total.claimed, lang)}
              hint={t(
                `${fmtNum(data.total.newAccounts, lang)} حساب جديد`,
                `${fmtNum(data.total.newAccounts, lang)} new accounts`,
              )}
            />
            <StatTile
              icon={CheckCircle2}
              tone="orange"
              label={t("استخدموا الكوبون", "Used the coupon")}
              value={fmtNum(data.total.used, lang)}
            />
            <StatTile
              icon={MessageCircle}
              tone="gray"
              label={t("حادثوا أبو الجود", "Chatted with Abu Al-Joud")}
              value={fmtNum(data.total.chatted, lang)}
            />
          </div>

          <Panel
            title={t("المستويات", "Levels")}
            description={t("من أنهوا اللعبة", "Players who finished")}
          >
            <LevelBars levels={data.total.levels} />
          </Panel>

          <Panel
            title={t("الروابط", "Links")}
            description={t(
              "لكل منصة أو مطبوعة رابطها ورمز QR خاص بها.",
              "One link and QR code per place or printout.",
            )}
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13.5px]">
                <thead className="bg-[var(--cx-raise)] text-[12px] text-[var(--cx-muted)]">
                  <tr>
                    <th className="px-4 py-2 text-start font-bold">{t("الرابط", "Link")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("فتحوا", "Opened")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("بدؤوا", "Started")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("أنهوا", "Finished")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("استلموا", "Claimed")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("استخدموا", "Used")}</th>
                    <th className="px-2 py-2 text-end font-bold">{t("حادثوا", "Chatted")}</th>
                    <th className="px-4 py-2 text-end font-bold">{t("الحالة", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.links.map((l) => {
                    const url = gameUrl(l.slug);
                    const f = l.funnel;
                    return (
                      <tr
                        key={l.id ?? "direct"}
                        className="border-t border-[var(--cx-line-2)] align-top"
                      >
                        <td className="px-4 py-3">
                          <div className="font-extrabold">{linkName(l)}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className="font-mono text-[12px] text-[var(--cx-muted)]"
                              dir="ltr"
                            >
                              {url.replace(/^https?:\/\//, "")}
                            </span>
                            <button
                              type="button"
                              className="text-[var(--cx-teal)]"
                              onClick={() => copy(url)}
                              aria-label={t("نسخ", "Copy")}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {l.id && (
                              <button
                                type="button"
                                className="text-[var(--cx-teal)]"
                                onClick={() => setQr(l)}
                                aria-label="QR"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {l.created_at && (
                            <div className="text-[12px] text-[var(--cx-muted)]">
                              {fmtDate(l.created_at, lang)}
                            </div>
                          )}
                        </td>
                        <Num n={f.opened} />
                        <Num n={f.started} />
                        <Num n={f.finished} />
                        <Num
                          n={f.claimed}
                          sub={
                            f.newAccounts
                              ? t(
                                  `${fmtNum(f.newAccounts, lang)} جديد`,
                                  `${fmtNum(f.newAccounts, lang)} new`,
                                )
                              : undefined
                          }
                        />
                        <Num n={f.used} />
                        <Num n={f.chatted} />
                        <td className="px-4 py-3 text-end">
                          {l.id ? (
                            <button
                              type="button"
                              onClick={() => toggle(l)}
                              title={t("اضغط للتبديل", "Click to switch")}
                            >
                              <Pill tone={l.is_active ? "green" : "gray"}>
                                {l.is_active ? t("فعّال", "Active") : t("متوقف", "Stopped")}
                              </Pill>
                            </button>
                          ) : (
                            <span className="text-[12px] text-[var(--cx-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-[12px] text-[var(--cx-muted)]">
              {t(
                "رابط متوقف يبقى يفتح اللعبة، لكن من يدخل منه يُحسب «مباشراً».",
                "A stopped link still opens the game; people who use it count as Direct.",
              )}
            </p>
          </Panel>

          <WhoPlayed data={data} />

          <Panel
            title={t("من استلموا كوبوناً", "Players who claimed a coupon")}
            description={t(
              `${fmtNum(data.players.length, lang)} لاعباً`,
              `${fmtNum(data.players.length, lang)} players`,
            )}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={exportPlayers}
                disabled={!data.players.length}
              >
                <Download className="h-4 w-4" />
                {t("تصدير Excel", "Export Excel")}
              </Button>
            }
            flush
          >
            {data.players.length === 0 ? (
              <EmptyState
                compact
                icon={UserPlus}
                title={t("لم يستلم أحد كوبوناً بعد", "No one has claimed a coupon yet")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13.5px]">
                  <thead className="bg-[var(--cx-raise)] text-[12px] text-[var(--cx-muted)]">
                    <tr>
                      <th className="px-4 py-2 text-start font-bold">{t("اللاعب", "Player")}</th>
                      <th className="px-2 py-2 text-start font-bold">{t("المستوى", "Level")}</th>
                      <th className="px-2 py-2 text-start font-bold">{t("المجال", "Field")}</th>
                      <th className="px-2 py-2 text-start font-bold">{t("الكوبون", "Coupon")}</th>
                      <th className="px-2 py-2 text-start font-bold">{t("الرابط", "Link")}</th>
                      <th className="px-4 py-2 text-end font-bold">{t("الوقت", "When")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.players.map((p, i) => (
                      <tr
                        key={`${p.code}-${i}`}
                        className="border-t border-[var(--cx-line-2)] align-top"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-bold">{p.name || "—"}</div>
                          <div className="text-[12px] text-[var(--cx-muted)]" dir="ltr">
                            {p.email ?? ""}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="font-bold" style={{ color: LEVEL_COLOR[p.level] }}>
                            {ar ? LEVELS[p.level].name.ar : LEVELS[p.level].name.en}
                          </span>{" "}
                          <span className="text-[var(--cx-muted)] tabular-nums">{p.score}/10</span>
                        </td>
                        <td className="px-2 py-2.5">
                          {(() => {
                            const f = FIELDS.find((x) => x.id === p.field);
                            return f ? (ar ? f.ar : f.en) : "—";
                          })()}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="font-mono text-[12.5px]" dir="ltr">
                            {p.code ?? "—"}
                          </span>{" "}
                          {p.used && <Pill tone="green">{t("استُخدم", "Used")}</Pill>}
                          {p.account_new && (
                            <Pill tone="teal">{t("حساب جديد", "New account")}</Pill>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          {p.link === "direct" ? t("مباشر", "Direct") : p.link}
                        </td>
                        <td className="px-4 py-2.5 text-end text-[12.5px] text-[var(--cx-muted)]">
                          {fmtDate(p.claimed_at, lang, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("رابط جديد للعبة", "New game link")}</DialogTitle>
            <DialogDescription>
              {t(
                "اسم يساعدكم على تمييزه، مثل: إنستغرام، منشور اليوم الثاني. الرمز يظهر في الرابط.",
                "A name to recognise it by, e.g. Instagram story, Day 2 flyer. The code appears in the link.",
              )}
            </DialogDescription>
          </DialogHeader>
          <Field label={t("اسم الرابط", "Link name")}>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </Field>
          <Field label={t("الرمز في الرابط (اختياري)", "Code in the link (optional)")}>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="instagram"
              dir="ltr"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("إنشاء ونسخ", "Create and copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qr} onOpenChange={(v) => !v && setQr(null)}>
        <DialogContent className="max-w-sm">
          {qr && (
            <QrView
              link={qr}
              onDownload={() => downloadQr(gameUrl(qr.slug), qr.slug ?? "direct")}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Num({ n, sub }: { n: number; sub?: string }) {
  const { lang } = useT();
  return (
    <td className="px-2 py-3 text-end tabular-nums">
      <div className="font-bold">{fmtNum(n, lang)}</div>
      {sub && <div className="text-[11.5px] text-[var(--cx-muted)]">{sub}</div>}
    </td>
  );
}

function LevelBars({ levels }: { levels: Record<Level, number> }) {
  const { ar, lang } = useT();
  const total = LEVEL_ORDER.reduce((s, l) => s + levels[l], 0);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {LEVEL_ORDER.map((l) => {
        const share = total ? Math.round((levels[l] / total) * 100) : 0;
        return (
          <div key={l} className="rounded-xl border border-[var(--cx-line-2)] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-extrabold" style={{ color: LEVEL_COLOR[l] }}>
                {ar ? LEVELS[l].name.ar : LEVELS[l].name.en} · {LEVELS[l].percent}%
              </span>
              <span className="text-[20px] font-extrabold tabular-nums">
                {fmtNum(levels[l], lang)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--cx-raise-2)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${share}%`, background: LEVEL_COLOR[l] }}
              />
            </div>
            <div className="mt-1 text-[12px] text-[var(--cx-muted)] tabular-nums">{share}%</div>
          </div>
        );
      })}
    </div>
  );
}

function WhoPlayed({ data }: { data: TexpoOverview }) {
  const { t, ar, lang } = useT();
  const useTotal = useMemo(
    () => Object.values(data.aiUse).reduce((s, n) => s + n, 0),
    [data.aiUse],
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title={t("ماذا يعمل من أنهوا اللعبة", "What finishers do")}
        description={t("وعدد كل مستوى", "And how many reached each level")}
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-[13.5px]">
            <thead className="bg-[var(--cx-raise)] text-[12px] text-[var(--cx-muted)]">
              <tr>
                <th className="px-4 py-2 text-start font-bold">{t("المجال", "Field")}</th>
                {LEVEL_ORDER.map((l) => (
                  <th
                    key={l}
                    className="px-2 py-2 text-end font-bold"
                    style={{ color: LEVEL_COLOR[l] }}
                  >
                    {ar ? LEVELS[l].name.ar : LEVELS[l].name.en}
                  </th>
                ))}
                <th className="px-4 py-2 text-end font-bold">{t("المجموع", "Total")}</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => {
                const row = data.byField[f.id] ?? { beginner: 0, intermediate: 0, professional: 0 };
                const sum = LEVEL_ORDER.reduce((s, l) => s + row[l], 0);
                return (
                  <tr key={f.id} className="border-t border-[var(--cx-line-2)]">
                    <td className="px-4 py-2">{ar ? f.ar : f.en}</td>
                    {LEVEL_ORDER.map((l) => (
                      <td key={l} className="px-2 py-2 text-end tabular-nums">
                        {fmtNum(row[l], lang)}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-end font-bold tabular-nums">
                      {fmtNum(sum, lang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title={t("كم مرة يستخدمون الذكاء الاصطناعي", "How often they use AI")}
        description={t("كل من بدأ اللعبة", "Everyone who started")}
      >
        <div className="space-y-3">
          {AI_USES.map((a) => {
            const n = data.aiUse[a.id] ?? 0;
            const share = useTotal ? Math.round((n / useTotal) * 100) : 0;
            return (
              <div key={a.id}>
                <div className="flex justify-between gap-2 text-[13.5px]">
                  <span>{ar ? a.ar : a.en}</span>
                  <span className="font-bold tabular-nums">
                    {fmtNum(n, lang)} · {share}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--cx-raise-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--cx-teal)]"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function QrView({ link, onDownload }: { link: GameLink; onDownload: () => void }) {
  const { t } = useT();
  const url = gameUrl(link.slug);
  const svg = useMemo(() => renderSVG(url, { ecc: "M", border: 2, pixelSize: 8 }), [url]);
  return (
    <div className="space-y-3 text-center">
      <DialogHeader>
        <DialogTitle>{link.label}</DialogTitle>
        <DialogDescription dir="ltr">{url}</DialogDescription>
      </DialogHeader>
      <div
        className="mx-auto w-64 max-w-full rounded-xl bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <Button onClick={onDownload} className="w-full">
        <Download className="h-4 w-4" />
        {t("تنزيل للطباعة (SVG)", "Download for print (SVG)")}
      </Button>
    </div>
  );
}
