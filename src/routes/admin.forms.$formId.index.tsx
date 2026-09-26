import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Archive,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import {
  countDynamicFormSubmissions,
  deleteDynamicForm,
  getDynamicFormById,
  setDynamicFormStatus,
} from "@/lib/dynamic-forms.functions";
import type { DynamicForm, FormStatus } from "@/lib/dynamic-forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNote, Loading, PageHeader, Pill, Tabs, useT } from "@/components/console/ui";
import { FormBuilder } from "@/features/website/FormBuilder";
import { FormResponses } from "@/features/website/FormResponses";
import { FORM_STATUS_UI } from "./admin.forms.index";

type Tab = "answers" | "build";

export const Route = createFileRoute("/admin/forms/$formId/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Form — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "build" ? "build" : undefined,
  }),
  component: FormPage,
});

function FormPage() {
  const { formId } = Route.useParams();
  const { tab = "answers" } = Route.useSearch();
  const nav = Route.useNavigate();
  const navigate = useNavigate();
  const { t, ar } = useT();
  const fetchForm = useServerFn(getDynamicFormById);
  const setStatusFn = useServerFn(setDynamicFormStatus);
  const doDelete = useServerFn(deleteDynamicForm);
  const countFn = useServerFn(countDynamicFormSubmissions);
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [missing, setMissing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [alsoAnswers, setAlsoAnswers] = useState(false);

  const load = useCallback(async () => {
    try {
      setForm((await fetchForm({ data: { id: formId } })) as DynamicForm);
    } catch {
      setMissing(true);
    }
  }, [fetchForm, formId]);
  useEffect(() => {
    load();
  }, [load]);

  if (missing)
    return <ErrorNote text={t("لم يُعثر على هذا النموذج.", "This form was not found.")} />;
  if (!form) return <Loading />;

  const status = async (next: FormStatus) => {
    setBusy(true);
    try {
      await setStatusFn({ data: { id: form.id, status: next } });
      setForm({ ...form, status: next });
      toast.success(
        next === "published"
          ? t("النموذج منشور الآن", "The form is live")
          : next === "hidden"
            ? t("أُخفي النموذج", "The form is hidden")
            : next === "archived"
              ? t("أُرشف النموذج", "Archived")
              : t("أُعيد كمسودة", "Back to draft"),
      );
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await doDelete({
        data: { id: form.id, deleteSubmissions: (count ?? 0) > 0 ? alsoAnswers : false },
      });
      toast.success(t("تم الحذف", "Deleted"));
      navigate({ to: "/admin/forms" });
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/forms/${form.slug}`;
  const st = FORM_STATUS_UI[form.status];

  return (
    <div>
      <PageHeader
        back={{ to: "/admin/forms", label: t("كل النماذج", "All forms") }}
        eyebrow={t("إدارة الموقع · النماذج", "Website · Forms")}
        title={ar ? form.name_ar : form.name_en}
        meta={
          <>
            <Pill tone={st.tone}>{ar ? st.ar : st.en}</Pill>
            <span className="font-mono text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
              /forms/{form.slug}
            </span>
          </>
        }
        actions={
          <>
            {form.status === "published" && (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    navigator.clipboard.writeText(url).then(
                      () => toast.success(t("نُسخ الرابط", "Link copied")),
                      () => toast.error(t("تعذّر النسخ", "Could not copy")),
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  {t("نسخ الرابط", "Copy link")}
                </Button>
                <Button asChild variant="ghost">
                  <a href={`/forms/${form.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t("فتح", "Open")}
                  </a>
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => status("hidden")}>
                  <EyeOff className="h-4 w-4" />
                  {t("إخفاء", "Hide")}
                </Button>
              </>
            )}
            {form.status === "hidden" && (
              <Button disabled={busy} onClick={() => status("published")}>
                <Eye className="h-4 w-4" />
                {t("إظهار", "Show again")}
              </Button>
            )}
            {form.status === "draft" && (
              <Button disabled={busy} onClick={() => status("published")}>
                <Send className="h-4 w-4" />
                {t("نشر", "Publish")}
              </Button>
            )}
            {form.status !== "archived" ? (
              <Button variant="ghost" disabled={busy} onClick={() => status("archived")}>
                <Archive className="h-4 w-4" />
                {t("أرشفة", "Archive")}
              </Button>
            ) : (
              <Button variant="outline" disabled={busy} onClick={() => status("draft")}>
                <RotateCcw className="h-4 w-4" />
                {t("استعادة", "Restore")}
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-[var(--cx-red)]"
              onClick={async () => {
                setAlsoAnswers(false);
                // The answer count decides whether the answers must go too.
                const r = await countFn({ data: { id: form.id } }).catch(() => null);
                if (r) setCount(r.count);
                setDeleting(true);
              }}
              aria-label={t("حذف", "Delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => nav({ search: { tab: v === "answers" ? undefined : v }, replace: true })}
        tabs={[
          { value: "answers", label: t("الإجابات", "Answers"), icon: Inbox },
          {
            value: "build",
            label: t("الأسئلة والإعدادات", "Questions & settings"),
            icon: ListChecks,
          },
        ]}
      />
      {tab === "answers" ? (
        <FormResponses form={form} onCount={setCount} />
      ) : (
        <FormBuilder initial={form} onSaved={(f) => setForm(f)} />
      )}

      <Dialog open={deleting} onOpenChange={(v) => !busy && setDeleting(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("حذف النموذج؟", "Delete this form?")}</DialogTitle>
            <DialogDescription>
              {(count ?? 0) > 0
                ? t(
                    `لهذا النموذج ${count} إجابة. لا يمكن حذفه إلا مع إجاباته.`,
                    `This form has ${count} answers. It can only be deleted together with them.`,
                  )
                : t("لا يمكن التراجع.", "This cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          {(count ?? 0) > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-[var(--cx-red-line)] bg-[var(--cx-red-50)] p-3 text-[13.5px] text-[var(--cx-red)]">
              <Checkbox
                checked={alsoAnswers}
                onCheckedChange={(v) => setAlsoAnswers(!!v)}
                className="mt-0.5"
              />
              {t(
                `نعم، احذف النموذج و${count} إجابة نهائياً.`,
                `Yes, permanently delete the form and its ${count} answers.`,
              )}
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)} disabled={busy}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={busy || ((count ?? 0) > 0 && !alsoAnswers)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("حذف", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
