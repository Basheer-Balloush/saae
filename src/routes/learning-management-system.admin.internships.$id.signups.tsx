import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Link2, Loader2, Trash2, UserRound } from "lucide-react";
import {
  adminCreateSignupLink,
  adminDeleteSignupSubmission,
  adminGetSignupLink,
  adminListSignupSubmissions,
  adminSetSignupLinkActive,
  type SignupLink,
  type SignupSubmission,
} from "@/lib/event-signup.functions";
import { adminGetInternship } from "@/lib/lms-internships-admin.functions";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  ToggleRow,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/learning-management-system/admin/internships/$id/signups")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign-up link — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SignupsPage,
});

/* A public link for events: people sign up without an account. One link
   per internship; it can be paused at any time. */
function SignupsPage() {
  const { id } = Route.useParams();
  const { t, ar, lang } = useT();
  const getLink = useServerFn(adminGetSignupLink);
  const createLink = useServerFn(adminCreateSignupLink);
  const setActive = useServerFn(adminSetSignupLinkActive);
  const listSubs = useServerFn(adminListSignupSubmissions);
  const deleteSub = useServerFn(adminDeleteSignupSubmission);
  const oppFn = useServerFn(adminGetInternship);
  const [link, setLink] = useState<SignupLink | null>(null);
  const [rows, setRows] = useState<SignupSubmission[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [l, s] = await Promise.all([
        getLink({ data: { opportunity_id: id } }),
        listSubs({ data: { opportunity_id: id } }),
      ]);
      setLink(l);
      setRows(s);
    } catch {
      setError(true);
    }
  }, [getLink, listSubs, id]);
  useEffect(() => {
    load();
    oppFn({ data: { id } })
      .then((r) =>
        setTitle(ar ? r.opportunity.title_ar : r.opportunity.title_en || r.opportunity.title_ar),
      )
      .catch(() => {});
  }, [load, oppFn, id, ar]);

  const url = link
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/event-signup/${link.token}`
    : "";
  const copy = () =>
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("نُسخ الرابط", "Link copied")),
      () => toast.error(t("تعذّر النسخ", "Could not copy")),
    );

  const create = async () => {
    setBusy(true);
    try {
      const l = await createLink({ data: { opportunity_id: id } });
      setLink({ ...l, submissions_count: rows?.length ?? 0 });
      toast.success(t("أُنشئ الرابط", "Link created"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async () => {
    if (!link) return;
    setBusy(true);
    try {
      await setActive({ data: { opportunity_id: id, is_active: !link.is_active } });
      setLink({ ...link, is_active: !link.is_active });
      toast.success(
        link.is_active ? t("أُوقف الرابط", "Link paused") : t("فُعّل الرابط", "Link active"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (r: SignupSubmission) => {
    const ok = await confirmDialog({
      title: t(`حذف تسجيل ${r.full_name}؟`, `Delete ${r.full_name}'s sign-up?`),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSub({ data: { id: r.id } });
      setRows((p) => (p ?? []).filter((x) => x.id !== r.id));
      toast.success(t("حُذف", "Deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    }
  };
  const exportXlsx = () =>
    exportRowsToXlsx<SignupSubmission>({
      filenameBase: "event-signups",
      sheetName: "Signups",
      rtl: ar,
      rows: rows ?? [],
      columns: [
        { header: t("الاسم", "Full name"), get: (r) => r.full_name, width: 28 },
        { header: t("البريد", "Email"), get: (r) => r.email, width: 28 },
        { header: t("الهاتف", "Phone"), get: (r) => r.phone, width: 18 },
        { header: t("الجهة", "Organisation"), get: (r) => r.organization, width: 24 },
        { header: t("نبذة", "Bio"), get: (r) => r.biography, width: 40 },
        { header: t("التاريخ", "Submitted at"), type: "date", get: (r) => r.created_at, width: 20 },
      ],
    });

  return (
    <div>
      <PageHeader
        back={{
          to: "/learning-management-system/admin/internships/$id/edit",
          params: { id },
          label: title || t("الفرصة", "Internship"),
        }}
        eyebrow={t("منصّة التعلّم · فرصة تدريب", "Learning · Internship")}
        title={t("رابط التسجيل الخارجي", "External sign-up link")}
        description={t(
          "للفعاليات: يسجّل الناس عبر هذا الرابط دون حساب على المنصّة.",
          "For events: people sign up through this link without an account on the platform.",
        )}
      />
      {error ? (
        <ErrorNote onRetry={load} />
      ) : rows === null ? (
        <Loading />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Panel title={t("الرابط", "The link")}>
            {!link ? (
              <div className="text-center">
                <p className="mb-4 text-[14px] text-[var(--cx-muted)]">
                  {t("لا يوجد رابط لهذه الفرصة بعد.", "This internship has no link yet.")}
                </p>
                <Button onClick={create} disabled={busy}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {t("إنشاء رابط", "Create link")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-[var(--cx-raise)] px-3 py-2.5">
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--cx-ink-2)]"
                    dir="ltr"
                  >
                    {url}
                  </span>
                  <button
                    type="button"
                    onClick={copy}
                    className="text-[var(--cx-teal)]"
                    aria-label={t("نسخ", "Copy")}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <Button variant="outline" className="w-full" onClick={copy}>
                  <Copy className="h-4 w-4" />
                  {t("نسخ الرابط", "Copy link")}
                </Button>
                <ToggleRow
                  id="sl-active"
                  label={t("يقبل تسجيلات", "Accepting sign-ups")}
                  hint={
                    link.is_active
                      ? t("الرابط يعمل الآن.", "The link works now.")
                      : t("الرابط متوقف.", "The link is paused.")
                  }
                  checked={link.is_active}
                  disabled={busy}
                  onChange={toggle}
                />
              </div>
            )}
          </Panel>

          <Panel
            title={t("التسجيلات", "Sign-ups")}
            description={t(
              `${fmtNum(rows.length, lang)} شخص`,
              `${fmtNum(rows.length, lang)} people`,
            )}
            actions={
              <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!rows.length}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
            }
            flush
          >
            {rows.length === 0 ? (
              <EmptyState icon={UserRound} title={t("لا تسجيلات بعد", "No sign-ups yet")} />
            ) : (
              <ul className="divide-y divide-[var(--cx-line-2)]">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold" dir="auto">
                          {r.full_name}
                        </span>
                        {r.organization && <Pill tone="gray">{r.organization}</Pill>}
                      </div>
                      <div className="text-[13px] text-[var(--cx-ink-2)]" dir="ltr">
                        {[r.email, r.phone].filter(Boolean).join(" · ")}
                      </div>
                      {r.biography && (
                        <p
                          className="mt-1 line-clamp-2 text-[13px] text-[var(--cx-muted)]"
                          dir="auto"
                        >
                          {r.biography}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[12px] text-[var(--cx-muted)]">
                      {fmtDate(r.created_at, lang, true)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                      onClick={() => remove(r)}
                      aria-label={t("حذف", "Delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
