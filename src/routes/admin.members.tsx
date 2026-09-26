import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRecordDraft, useReopenDraftForm } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadProgress } from "@/components/ui/upload-progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Field,
  LangSwitch,
  Loading,
  PageHeader,
  Panel,
  Seg,
  useT,
} from "@/components/console/ui";
import { IMAGE_MIME, checkImage, uploadNewsMedia, type Progress } from "@/features/website/media";

export const Route = createFileRoute("/admin/members")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Team — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: TeamPage,
});

type Group = "board" | "executive";
type Member = {
  id: string;
  category: Group;
  full_name_ar: string;
  full_name_en: string | null;
  position_ar: string;
  position_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
  display_order: number;
};

/* The board and the executive team, as shown on the About page. */
function TeamPage() {
  const { t, ar } = useT();
  const { user } = useAuth();
  const [rows, setRows] = useState<Member[] | null>(null);
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [newGroup, setNewGroup] = useState<Group>("board");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("category")
      .order("display_order");
    if (error) toast.error(toUserMessage(error));
    setRows((data as Member[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Reopen a form that has an unsaved draft from an earlier visit.
  useReopenDraftForm({
    userId: user?.id,
    form: "member",
    rows,
    open: (row) => setEditing(row ?? "new"),
  });

  const group = (g: Group) =>
    (rows ?? []).filter((m) => m.category === g).sort((a, b) => a.display_order - b.display_order);

  /* Moving a card renumbers its group 0..n, so the order is always clean. */
  const move = async (m: Member, dir: -1 | 1) => {
    const list = group(m.category);
    const i = list.findIndex((x) => x.id === m.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const changed = list
      .map((x, idx) => ({ ...x, display_order: idx }))
      .filter((x) => (rows ?? []).find((r) => r.id === x.id)?.display_order !== x.display_order);
    setRows((all) => (all ?? []).map((r) => changed.find((c) => c.id === r.id) ?? r));
    const results = await Promise.all(
      changed.map((c) =>
        supabase.from("members").update({ display_order: c.display_order }).eq("id", c.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(toUserMessage(failed.error));
      load();
    }
  };

  const remove = async (m: Member) => {
    if (
      !(await confirmDialog({
        title: t(`حذف ${m.full_name_ar}؟`, `Delete ${m.full_name_en || m.full_name_ar}?`),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("members").delete().eq("id", m.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(t("تم الحذف", "Deleted"));
    load();
  };

  const section = (g: Group, title: string) => {
    const list = group(g);
    return (
      <Panel
        title={title}
        description={t(`${list.length} عضواً`, `${list.length} members`)}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewGroup(g);
              setEditing("new");
            }}
          >
            <Plus className="h-4 w-4" />
            {t("إضافة", "Add")}
          </Button>
        }
      >
        {list.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title={t("لا يوجد أعضاء هنا بعد", "No members here yet")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--cx-line)] p-3"
              >
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                    <UserRound className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold">
                    {ar ? m.full_name_ar : m.full_name_en || m.full_name_ar}
                  </div>
                  <div className="truncate text-[12.5px] text-[var(--cx-muted)]">
                    {ar ? m.position_ar : m.position_en || m.position_ar}
                  </div>
                </div>
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(m, -1)}
                    aria-label={t("إلى الأعلى", "Move up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                    disabled={i === list.length - 1}
                    onClick={() => move(m, 1)}
                    aria-label={t("إلى الأسفل", "Move down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] hover:text-[var(--cx-teal)]"
                    onClick={() => setEditing(m)}
                    aria-label={t("تعديل", "Edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] hover:text-[var(--cx-red)]"
                    onClick={() => remove(m)}
                    aria-label={t("حذف", "Delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("الفريق", "Team")}
        description={t(
          "مجلس الإدارة والفريق التنفيذي كما يظهرون في صفحة «من نحن». الترتيب هنا هو ترتيب الظهور.",
          "The board and the executive team, as shown on the About page. The order here is the order on the site.",
        )}
      />
      {rows === null ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          {section("board", t("مجلس الإدارة", "Board of directors"))}
          {section("executive", t("الأعضاء التنفيذيون", "Executive members"))}
        </div>
      )}
      <Sheet open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          {editing !== null && (
            <MemberForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              defaultGroup={newGroup}
              nextOrder={group(newGroup).length}
              onDone={() => {
                setEditing(null);
                load();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MemberForm({
  initial,
  defaultGroup,
  nextOrder,
  onDone,
}: {
  initial: Member | null;
  defaultGroup: Group;
  nextOrder: number;
  onDone: () => void;
}) {
  const { t, lang } = useT();
  const { user } = useAuth();
  const start = useMemo(
    () => ({
      category: initial?.category ?? defaultGroup,
      nameAr: initial?.full_name_ar ?? "",
      nameEn: initial?.full_name_en ?? "",
      posAr: initial?.position_ar ?? "",
      posEn: initial?.position_en ?? "",
      bioAr: initial?.bio_ar ?? "",
      bioEn: initial?.bio_en ?? "",
      photoUrl: initial?.photo_url ?? "",
      order: initial?.display_order ?? nextOrder,
    }),
    // The starting values are fixed for the life of the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [v, setV] = useState(start);
  const [edit, setEdit] = useState<"ar" | "en">(lang);
  const [saving, setSaving] = useState(false);
  const [pct, setPct] = useState<Progress | null>(null);
  const draft = useRecordDraft({
    key: formDraftKey(user?.id, "member", initial?.id ?? "new"),
    loaded: start,
    current: v,
    apply: setV,
  });
  const set = (p: Partial<typeof v>) => setV((cur) => ({ ...cur, ...p }));
  const L = edit === "ar";

  const photo = async (f: File) => {
    const bad = checkImage(f, lang === "ar");
    if (bad) {
      toast.error(bad);
      return;
    }
    try {
      const url = await uploadNewsMedia(f, "image", setPct);
      set({ photoUrl: url });
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPct(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.nameAr.trim() || !v.posAr.trim()) {
      setEdit("ar");
      toast.error(t("الاسم والمنصب بالعربية مطلوبان", "The Arabic name and position are required"));
      return;
    }
    setSaving(true);
    const payload = {
      category: v.category,
      full_name_ar: v.nameAr.trim(),
      full_name_en: v.nameEn.trim() || null,
      position_ar: v.posAr.trim(),
      position_en: v.posEn.trim() || null,
      bio_ar: v.bioAr.trim() || null,
      bio_en: v.bioEn.trim() || null,
      photo_url: v.photoUrl || null,
      display_order: Number(v.order) || 0,
    };
    const { error } = initial
      ? await supabase.from("members").update(payload).eq("id", initial.id)
      : await supabase.from("members").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    draft.clear();
    toast.success(initial ? t("تم الحفظ", "Saved") : t("تمت الإضافة", "Added"));
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-5 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>
          {initial ? t("تعديل عضو", "Edit member") : t("عضو جديد", "New member")}
        </SheetTitle>
      </SheetHeader>
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />

      <div className="flex items-center gap-4">
        {v.photoUrl ? (
          <img src={v.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
            <UserRound className="h-8 w-8" />
          </span>
        )}
        <div className="space-y-1.5">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--cx-line)] px-3 text-[13px] font-bold hover:border-[var(--cx-teal)]">
            {pct ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-[var(--cx-teal)]" />
            )}
            {t("رفع صورة", "Upload photo")}
            <input
              type="file"
              accept={IMAGE_MIME.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) photo(f);
              }}
            />
          </label>
          {v.photoUrl && (
            <button
              type="button"
              className="block text-[12.5px] font-bold text-[var(--cx-red)]"
              onClick={() => set({ photoUrl: "" })}
            >
              {t("إزالة الصورة", "Remove photo")}
            </button>
          )}
        </div>
      </div>
      {pct && (
        <UploadProgress percent={pct.pct} loaded={pct.loaded} total={pct.total} label={pct.name} />
      )}

      <Field label={t("المجموعة", "Group")}>
        <Seg
          value={v.category}
          onChange={(c) => set({ category: c })}
          options={[
            { value: "board", label: t("مجلس الإدارة", "Board") },
            { value: "executive", label: t("الفريق التنفيذي", "Executive") },
          ]}
        />
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-[var(--cx-ink-2)]">
          {t("البيانات", "Details")}
        </span>
        <LangSwitch
          value={edit}
          onChange={setEdit}
          missing={{ ar: !v.nameAr.trim() || !v.posAr.trim() }}
        />
      </div>
      <div className="space-y-3" dir={L ? "rtl" : "ltr"}>
        <Field label={L ? "الاسم (مطلوب)" : "Name"}>
          <Input
            maxLength={120}
            value={L ? v.nameAr : v.nameEn}
            onChange={(e) => set(L ? { nameAr: e.target.value } : { nameEn: e.target.value })}
          />
        </Field>
        <Field label={L ? "المنصب (مطلوب)" : "Position"}>
          <Input
            maxLength={120}
            value={L ? v.posAr : v.posEn}
            onChange={(e) => set(L ? { posAr: e.target.value } : { posEn: e.target.value })}
          />
        </Field>
        <Field label={L ? "نبذة" : "Bio"}>
          <Textarea
            rows={5}
            maxLength={1000}
            value={L ? v.bioAr : v.bioEn}
            onChange={(e) => set(L ? { bioAr: e.target.value } : { bioEn: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--cx-line-2)] pt-4">
        <Button type="submit" disabled={saving || !!pct}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? t("حفظ", "Save") : t("إضافة العضو", "Add member")}
        </Button>
      </div>
    </form>
  );
}
