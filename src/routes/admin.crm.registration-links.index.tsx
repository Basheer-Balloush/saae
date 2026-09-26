import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Link2, Loader2, Plus, UserRound } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { publicJoinUrl } from "@/lib/registration-link-url";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  adminCreateRegistrationLink,
  adminGetRegistrationLink,
  adminListRegistrationLinks,
  adminSetRegistrationLinkActive,
  type RegistrationLink,
  type RegistrationSubmission,
} from "@/lib/crm-registration-links.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  ToggleRow,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/admin/crm/registration-links/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Sign-up links — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: SignupLinksPage,
});

/* Short links for events and booths: people sign up through them and land
   in Leads. Each link can be stopped at any time. */
function SignupLinksPage() {
  const { t, lang } = useT();
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const listFn = useServerFn(adminListRegistrationLinks);
  const createFn = useServerFn(adminCreateRegistrationLink);
  const toggleFn = useServerFn(adminSetRegistrationLinkActive);
  const [rows, setRows] = useState<RegistrationLink[] | null>(null);
  const [error, setError] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setRows(await listFn({}));
    } catch {
      setError(true);
    }
  }, [listFn]);
  useEffect(() => {
    load();
  }, [load]);

  const copy = (token: string) =>
    navigator.clipboard.writeText(publicJoinUrl(token)).then(
      () => toast.success(t("نُسخ الرابط", "Link copied")),
      () => toast.error(t("تعذّر النسخ", "Could not copy")),
    );

  const toggle = async (row: RegistrationLink) => {
    try {
      await toggleFn({ data: { id: row.id, is_active: !row.is_active } });
      setRows((p) =>
        (p ?? []).map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)),
      );
      toast.success(
        row.is_active ? t("أُوقف الرابط", "Link stopped") : t("فُعّل الرابط", "Link active"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    }
  };

  const create = async () => {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      toast.error(t("أدخل اسماً للرابط", "Enter a name for the link"));
      return;
    }
    setSaving(true);
    try {
      const link = await createFn({ data: { label: trimmed } });
      setRows((p) => [link, ...(p ?? [])]);
      setNewOpen(false);
      setLabel("");
      toast.success(t("أُنشئ الرابط", "Link created"));
      copy(link.token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("روابط التسجيل", "Sign-up links")}
        description={t(
          "روابط قصيرة للفعاليات والمعارض. من يسجّل عبرها يظهر في «العملاء المحتملون».",
          "Short links for events and booths. Whoever signs up through them appears in Leads.",
        )}
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("رابط جديد", "New link")}
          </Button>
        }
      />
      {error ? (
        <ErrorNote onRetry={load} />
      ) : rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState icon={Link2} title={t("لا توجد روابط بعد", "No links yet")} />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <article key={r.id} className="cx-card p-4">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 text-start"
                  onClick={() => navigate({ search: { id: r.id }, replace: true })}
                >
                  <div className="truncate text-[15.5px] font-extrabold hover:text-[var(--cx-teal)]">
                    {r.label}
                  </div>
                  <div className="text-[12.5px] text-[var(--cx-muted)]">
                    {fmtDate(r.created_at, lang)}
                  </div>
                </button>
                <Pill tone={r.is_active ? "green" : "gray"}>
                  {r.is_active ? t("فعّال", "Active") : t("متوقف", "Stopped")}
                </Pill>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--cx-raise)] px-3 py-2">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--cx-muted)]"
                  dir="ltr"
                >
                  {publicJoinUrl(r.token)}
                </span>
                <button
                  type="button"
                  onClick={() => copy(r.token)}
                  className="text-[var(--cx-teal)]"
                  aria-label={t("نسخ", "Copy")}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <ToggleRow
                id={`rl-${r.id}`}
                label={t("يقبل تسجيلات", "Accepting sign-ups")}
                checked={r.is_active}
                onChange={() => toggle(r)}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => navigate({ search: { id: r.id }, replace: true })}
              >
                <UserRound className="h-4 w-4" />
                {t(
                  `${fmtNum(r.submissions_count, lang)} تسجيل`,
                  `${fmtNum(r.submissions_count, lang)} sign-ups`,
                )}
              </Button>
            </article>
          ))}
        </div>
      )}

      <Sheet open={!!id} onOpenChange={(v) => !v && navigate({ search: {}, replace: true })}>
        <SheetContent
          side={lang === "ar" ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-2xl"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {id && <LinkDetail key={id} id={id} />}
        </SheetContent>
      </Sheet>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("رابط تسجيل جديد", "New sign-up link")}</DialogTitle>
            <DialogDescription>
              {t(
                "اسم يساعدكم على تمييزه، مثل: معرض الربيع 2026.",
                "A name to recognise it by, e.g. Spring fair 2026.",
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
    </div>
  );
}

function LinkDetail({ id }: { id: string }) {
  const { t, ar, lang } = useT();
  const getFn = useServerFn(adminGetRegistrationLink);
  const [link, setLink] = useState<RegistrationLink | null>(null);
  const [rows, setRows] = useState<RegistrationSubmission[] | null>(null);

  useEffect(() => {
    getFn({ data: { id } })
      .then((r) => {
        setLink(r.link);
        setRows(r.submissions);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "error"));
  }, [getFn, id]);

  const exportXlsx = async () => {
    if (!link || !rows) return;
    await exportRowsToXlsx({
      filenameBase: `signups-${link.label}`,
      sheetName: t("التسجيلات", "Sign-ups"),
      rtl: ar,
      rows,
      columns: [
        { header: t("الاسم", "Full name"), get: (r) => r.full_name, width: 28 },
        { header: t("البريد", "Email"), get: (r) => r.email, width: 28 },
        { header: t("الهاتف", "Phone"), get: (r) => r.phone, width: 18 },
        { header: t("التخصص", "Specialty"), get: (r) => r.specialty, width: 22 },
        { header: t("مجال العمل", "Field of work"), get: (r) => r.work_field, width: 22 },
        { header: t("العنوان", "Address"), get: (r) => r.address, width: 26 },
        { header: t("ملاحظات", "Note"), get: (r) => r.short_description, width: 40 },
        { header: t("التاريخ", "Submitted at"), type: "date", get: (r) => r.created_at, width: 20 },
      ],
    });
  };

  if (!link || !rows) return <Loading />;
  return (
    <div className="space-y-4 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>{link.label}</SheetTitle>
        <p className="text-[13px] text-[var(--cx-muted)]">
          {t(`${fmtNum(rows.length, lang)} تسجيل`, `${fmtNum(rows.length, lang)} sign-ups`)} ·{" "}
          {link.is_active ? t("فعّال", "Active") : t("متوقف", "Stopped")}
        </p>
      </SheetHeader>
      <Button variant="outline" onClick={exportXlsx} disabled={!rows.length}>
        <Download className="h-4 w-4" />
        {t("تصدير Excel", "Export Excel")}
      </Button>
      {rows.length === 0 ? (
        <EmptyState compact icon={UserRound} title={t("لا توجد تسجيلات بعد", "No sign-ups yet")} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-[var(--cx-line)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{r.full_name}</span>
                <span className="text-[12px] text-[var(--cx-muted)]">
                  {fmtDate(r.created_at, lang, true)}
                </span>
              </div>
              <div className="mt-0.5 text-[13px] text-[var(--cx-ink-2)]" dir="ltr">
                {[r.email, r.phone].filter(Boolean).join(" · ") || "—"}
              </div>
              {(r.specialty || r.work_field) && (
                <div className="text-[12.5px] text-[var(--cx-muted)]">
                  {[r.specialty, r.work_field].filter(Boolean).join(" · ")}
                </div>
              )}
              {r.short_description && (
                <p className="mt-1 text-[13px]" dir="auto">
                  {r.short_description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
