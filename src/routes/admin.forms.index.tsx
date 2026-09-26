import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart3, ClipboardList, FileText, Plus } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import { listDynamicForms } from "@/lib/dynamic-forms.functions";
import type { FormStatus } from "@/lib/dynamic-forms";
import { ADMIN_FORMS } from "@/lib/admin-forms-registry";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/admin/forms/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Forms — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: FormsList,
});

type Row = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  status: FormStatus;
  updated_at: string;
  submissions_count: number;
};

export const FORM_STATUS_UI: Record<
  FormStatus,
  { ar: string; en: string; tone: "green" | "orange" | "gray" | "teal" }
> = {
  published: { ar: "منشور", en: "Published", tone: "green" },
  draft: { ar: "مسودة", en: "Draft", tone: "orange" },
  hidden: { ar: "مخفي", en: "Hidden", tone: "gray" },
  archived: { ar: "مؤرشف", en: "Archived", tone: "gray" },
};

function FormsList() {
  const { t, ar, lang } = useT();
  const list = useServerFn(listDynamicForms);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"active" | FormStatus>("active");

  useEffect(() => {
    list()
      .then((d) => setRows(d as Row[]))
      .catch((e) => {
        toast.error(toUserMessage(e));
        setRows([]);
      });
  }, [list]);

  const count = (s: FormStatus) => (rows ?? []).filter((r) => r.status === s).length;
  const shown = (rows ?? []).filter((r) => {
    if (status === "active" ? r.status === "archived" : r.status !== status) return false;
    const s = q.trim().toLowerCase();
    return !s || `${r.name_ar} ${r.name_en} ${r.slug}`.toLowerCase().includes(s);
  });

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("النماذج", "Forms")}
        description={t(
          "نماذج يعبّئها الزوار على الموقع. افتح أي نموذج لقراءة إجاباته أو تعديل أسئلته.",
          "Forms visitors fill in on the site. Open one to read its answers or edit its questions.",
        )}
        actions={
          <Button asChild>
            <Link to="/admin/forms/new">
              <Plus className="h-4 w-4" />
              {t("نموذج جديد", "New form")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={status}
          onChange={setStatus}
          options={[
            {
              value: "active",
              label: t("الحالية", "Current"),
              count: (rows?.length ?? 0) - count("archived"),
            },
            { value: "published", label: t("منشورة", "Published"), count: count("published") },
            { value: "draft", label: t("مسودات", "Drafts"), count: count("draft") },
            { value: "hidden", label: t("مخفية", "Hidden"), count: count("hidden") },
            { value: "archived", label: t("الأرشيف", "Archive"), count: count("archived") },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو الرابط", "Search name or link")}
        />
      </div>

      {rows === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Panel>
          <EmptyState
            icon={FileText}
            title={t("لا توجد نماذج هنا", "No forms here")}
            action={
              <Button asChild>
                <Link to="/admin/forms/new">
                  <Plus className="h-4 w-4" />
                  {t("أنشئ نموذجاً", "Create a form")}
                </Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <Link
              key={r.id}
              to="/admin/forms/$formId"
              params={{ formId: r.id }}
              className="cx-card block p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <Pill tone={FORM_STATUS_UI[r.status].tone}>
                  {ar ? FORM_STATUS_UI[r.status].ar : FORM_STATUS_UI[r.status].en}
                </Pill>
              </div>
              <div className="mt-3 text-[15.5px] font-extrabold">{ar ? r.name_ar : r.name_en}</div>
              <div className="mt-0.5 font-mono text-[12px] text-[var(--cx-muted)]" dir="ltr">
                /forms/{r.slug}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--cx-line-2)] pt-3 text-[13px]">
                <span className="font-bold">
                  {t(
                    `${fmtNum(r.submissions_count, lang)} إجابة`,
                    `${fmtNum(r.submissions_count, lang)} answers`,
                  )}
                </span>
                <span className="text-[var(--cx-muted)]">{fmtDate(r.updated_at, lang)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-[16px] font-extrabold">
          {t("الاستبيانات الثابتة", "Built-in surveys")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ADMIN_FORMS.map((s) => (
            <Link
              key={s.slug}
              to="/admin/crm/forms/$formSlug"
              params={{ formSlug: s.slug }}
              className="cx-card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cx-green-50)] text-[var(--cx-green)]">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="text-[15px] font-extrabold">{ar ? s.labelAr : s.labelEn}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
