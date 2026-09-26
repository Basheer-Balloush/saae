import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Archive, FolderTree, Loader2, Plus, Trash2 } from "lucide-react";
import InstructorCleanupPanel from "@/components/lms/InstructorCleanupPanel";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, Loading, PageHeader, Panel, Tabs, useT } from "@/components/console/ui";
import { SystemHealth } from "@/features/lms-console/SystemHealth";

type Tab = "categories" | "cleanup" | "health";

export const Route = createFileRoute("/learning-management-system/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Learning platform — SAAE" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "health" || s.tab === "cleanup" ? s.tab : undefined,
  }),
  component: SettingsPage,
});

type Category = {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  display_order: number;
};
const EMPTY_CATEGORY = { name_ar: "", name_en: "", slug: "" };

function SettingsPage() {
  const { t } = useT();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: Tab = search.tab ?? "categories";
  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("الإعدادات", "Settings")}
      />
      <Tabs
        value={tab}
        onChange={(v) =>
          navigate({ search: { tab: v === "categories" ? undefined : v }, replace: true })
        }
        tabs={[
          { value: "categories", label: t("التصنيفات", "Categories"), icon: FolderTree },
          { value: "cleanup", label: t("أرشفة المدرّبين", "Instructor clean-up"), icon: Archive },
          { value: "health", label: t("صحة النظام", "System health"), icon: Activity },
        ]}
      />
      {tab === "categories" && <Categories />}
      {tab === "cleanup" && (
        <Panel
          title={t("أرشفة المدرّبين غير المعتمدين", "Archive unapproved instructors")}
          description={t(
            "أرشفة قابلة للاستعادة للحسابات التي لم تُعتمد، بدل الحذف.",
            "A reversible archive for accounts that were never approved, instead of deleting them.",
          )}
        >
          <InstructorCleanupPanel />
        </Panel>
      )}
      {tab === "health" && <SystemHealth />}
    </div>
  );
}

function Categories() {
  const { t, ar } = useT();
  const { user } = useLmsAuth();
  const [list, setList] = useState<Category[] | null>(null);
  const [adding, setAdding] = useState(false);
  const draft = useFormDraft(formDraftKey(user?.id, "lms-category", "new"), EMPTY_CATEGORY);
  const form = draft.values;

  const load = async () => {
    const { data, error } = await supabase
      .from("lms_categories")
      .select("*")
      .order("display_order");
    if (error) toast.error(toUserMessage(error));
    setList((data as Category[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_ar.trim() || !form.slug.trim() || adding) return;
    setAdding(true);
    const { error } = await supabase.from("lms_categories").insert({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || null,
      slug: form.slug.trim(),
      display_order: list?.length ?? 0,
    });
    setAdding(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    draft.clearDraft();
    toast.success(t("تمت إضافة التصنيف", "Category added"));
    load();
  };

  const remove = async (c: Category) => {
    if (
      !(await confirmDialog({
        title: t(`حذف التصنيف «${c.name_ar}»؟`, `Delete the category “${c.name_en || c.name_ar}”?`),
        description: t(
          "تبقى الدورات كما هي، لكنها لن تظهر تحت هذا التصنيف.",
          "Courses stay, but no longer show under this category.",
        ),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("lms_categories").delete().eq("id", c.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    load();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <Panel
        title={t("تصنيف جديد", "New category")}
        description={t(
          "يظهر في فلاتر الكتالوج وفي محرر الدورة.",
          "Shown in the catalog filters and the course editor.",
        )}
      >
        <DraftNotice show={draft.restored} onDiscard={() => draft.clearDraft(EMPTY_CATEGORY)} />
        <form onSubmit={add} className="space-y-3">
          <Field label={t("الاسم بالعربية", "Name in Arabic")}>
            <Input
              dir="rtl"
              required
              value={form.name_ar}
              onChange={(e) => draft.setValues({ ...form, name_ar: e.target.value })}
            />
          </Field>
          <Field label={t("الاسم بالإنجليزية", "Name in English")}>
            <Input
              dir="ltr"
              value={form.name_en}
              onChange={(e) => draft.setValues({ ...form, name_en: e.target.value })}
            />
          </Field>
          <Field
            label={t("المعرّف في الرابط", "Link identifier (slug)")}
            hint={t(
              "أحرف إنجليزية صغيرة وشرطات، مثل ai-basics",
              "Lowercase letters and hyphens, e.g. ai-basics",
            )}
          >
            <Input
              dir="ltr"
              required
              className="font-mono"
              value={form.slug}
              onChange={(e) =>
                draft.setValues({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                })
              }
            />
          </Field>
          <Button type="submit" disabled={adding || !form.name_ar.trim() || !form.slug.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("إضافة", "Add")}
          </Button>
        </form>
      </Panel>

      <Panel title={t("التصنيفات الحالية", "Current categories")} flush>
        {list === null ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState
            compact
            icon={FolderTree}
            title={t("لا توجد تصنيفات بعد", "No categories yet")}
          />
        ) : (
          <ul>
            {list.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 border-b border-[var(--cx-line-2)] px-5 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold">
                    {ar ? c.name_ar : c.name_en || c.name_ar}
                  </div>
                  <div className="text-[12.5px] text-[var(--cx-muted)]">
                    {ar ? c.name_en : c.name_ar} ·{" "}
                    <span className="font-mono" dir="ltr">
                      {c.slug}
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(c)}
                  aria-label={t("حذف", "Delete")}
                >
                  <Trash2 className="h-4 w-4 text-[var(--cx-red)]" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
