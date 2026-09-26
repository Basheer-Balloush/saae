import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Handshake, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
import { UploadProgress } from "@/components/ui/upload-progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Field,
  Loading,
  PageHeader,
  Seg,
  ToggleRow,
  useT,
} from "@/components/console/ui";
import { uploadPartnerLogo, type Progress } from "@/features/website/media";

export const Route = createFileRoute("/admin/partners")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Partners — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PartnersPage,
});

type Partner = {
  id: string;
  name: string;
  logo_url: string;
  logo_light_url: string | null;
  size_class: string;
  display_order: number;
  show_on_home: boolean;
};

/* Logo heights the homepage understands, from small to extra large. */
const SIZES: { value: string; ar: string; en: string }[] = [
  { value: "h-16", ar: "صغير جداً", en: "XS" },
  { value: "h-20", ar: "صغير", en: "S" },
  { value: "h-24", ar: "متوسط", en: "M" },
  { value: "h-28", ar: "متوسط+", en: "M+" },
  { value: "h-32", ar: "كبير", en: "L" },
  { value: "h-36", ar: "كبير+", en: "L+" },
  { value: "h-40", ar: "كبير جداً", en: "XL" },
];

function PartnersPage() {
  const { t, ar } = useT();
  const { user } = useAuth();
  const [rows, setRows] = useState<Partner[] | null>(null);
  const [editing, setEditing] = useState<Partner | "new" | null>(null);
  const [where, setWhere] = useState<"all" | "home" | "hidden">("all");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("partners").select("*").order("display_order");
    if (error) toast.error(toUserMessage(error));
    setRows((data as Partner[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useReopenDraftForm({
    userId: user?.id,
    form: "partner",
    rows,
    open: (row) => setEditing(row ?? "new"),
  });

  const sorted = useMemo(
    () => [...(rows ?? [])].sort((a, b) => a.display_order - b.display_order),
    [rows],
  );
  const shown = sorted.filter(
    (p) => where === "all" || (where === "home" ? p.show_on_home : !p.show_on_home),
  );

  const toggleHome = async (p: Partner, v: boolean) => {
    setRows((all) => (all ?? []).map((r) => (r.id === p.id ? { ...r, show_on_home: v } : r)));
    const { error } = await supabase.from("partners").update({ show_on_home: v }).eq("id", p.id);
    if (error) {
      toast.error(toUserMessage(error));
      load();
    }
  };

  const move = async (p: Partner, dir: -1 | 1) => {
    const list = [...sorted];
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const changed = list
      .map((x, idx) => ({ ...x, display_order: idx }))
      .filter((x) => sorted.find((r) => r.id === x.id)?.display_order !== x.display_order);
    setRows((all) => (all ?? []).map((r) => changed.find((c) => c.id === r.id) ?? r));
    const results = await Promise.all(
      changed.map((c) =>
        supabase.from("partners").update({ display_order: c.display_order }).eq("id", c.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(toUserMessage(failed.error));
      load();
    }
  };

  const remove = async (p: Partner) => {
    if (
      !(await confirmDialog({
        title: t(`حذف الشريك «${p.name}»؟`, `Delete the partner “${p.name}”?`),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(t("تم الحذف", "Deleted"));
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("الشركاء", "Partners")}
        description={t(
          "شعارات الشركاء كما تظهر في الموقع. الترتيب هنا هو ترتيب الظهور.",
          "Partner logos as they appear on the site. The order here is the order on the site.",
        )}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            {t("شريك جديد", "New partner")}
          </Button>
        }
      />
      <div className="mb-4">
        <Seg
          value={where}
          onChange={setWhere}
          options={[
            { value: "all", label: t("الكل", "All"), count: rows?.length ?? 0 },
            {
              value: "home",
              label: t("في الرئيسية", "On the homepage"),
              count: (rows ?? []).filter((p) => p.show_on_home).length,
            },
            {
              value: "hidden",
              label: t("مخفيون", "Hidden"),
              count: (rows ?? []).filter((p) => !p.show_on_home).length,
            },
          ]}
        />
      </div>
      {rows === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="cx-card">
          <EmptyState icon={Handshake} title={t("لا يوجد شركاء هنا", "No partners here")} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((p) => {
            const i = sorted.findIndex((x) => x.id === p.id);
            return (
              <article
                key={p.id}
                className={`cx-card overflow-hidden ${p.show_on_home ? "" : "opacity-75"}`}
              >
                <div className="grid grid-cols-2">
                  <div
                    className="flex h-24 items-center justify-center overflow-hidden bg-[#0b1f24] p-3"
                    title={t("على خلفية داكنة", "On a dark background")}
                  >
                    <img
                      src={p.logo_url}
                      alt=""
                      className="block h-auto max-h-[64px] w-auto max-w-full object-contain"
                    />
                  </div>
                  <div
                    className="flex h-24 items-center justify-center overflow-hidden bg-white p-3"
                    title={t("على خلفية فاتحة", "On a light background")}
                  >
                    <img
                      src={p.logo_light_url || p.logo_url}
                      alt=""
                      className="block h-auto max-h-[64px] w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">
                      {p.name}
                    </span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(p, -1)}
                      className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                      aria-label={t("قبل", "Earlier")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === sorted.length - 1}
                      onClick={() => move(p, 1)}
                      className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                      aria-label={t("بعد", "Later")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <ToggleRow
                    id={`p-${p.id}`}
                    label={t("في الرئيسية", "On the homepage")}
                    checked={p.show_on_home}
                    onChange={(v) => toggleHome(p, v)}
                  />
                  <div className="mt-2 flex gap-2 border-t border-[var(--cx-line-2)] pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("تعديل", "Edit")}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(p)}
                      aria-label={t("حذف", "Delete")}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--cx-red)]" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Sheet open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          {editing !== null && (
            <PartnerForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              nextOrder={rows?.length ?? 0}
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

function PartnerForm({
  initial,
  nextOrder,
  onDone,
}: {
  initial: Partner | null;
  nextOrder: number;
  onDone: () => void;
}) {
  const { t, ar } = useT();
  const { user } = useAuth();
  const start = useMemo(
    () => ({
      name: initial?.name ?? "",
      logoUrl: initial?.logo_url ?? "",
      logoLightUrl: initial?.logo_light_url ?? "",
      sizeClass: initial?.size_class ?? "h-24",
      displayOrder: initial?.display_order ?? nextOrder,
      showOnHome: initial?.show_on_home ?? true,
    }),
    // The starting values are fixed for the life of the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [v, setV] = useState(start);
  const [saving, setSaving] = useState(false);
  const [pct, setPct] = useState<(Progress & { which: "dark" | "light" }) | null>(null);
  const draft = useRecordDraft({
    key: formDraftKey(user?.id, "partner", initial?.id ?? "new"),
    loaded: start,
    current: v,
    apply: setV,
  });
  const set = (p: Partial<typeof v>) => setV((cur) => ({ ...cur, ...p }));

  const upload = async (f: File, which: "dark" | "light") => {
    try {
      const url = await uploadPartnerLogo(f, (p) => setPct({ ...p, which }));
      set(which === "dark" ? { logoUrl: url } : { logoLightUrl: url });
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPct(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim() || !v.logoUrl) {
      toast.error(
        t(
          "الاسم والشعار (للخلفية الداكنة) مطلوبان",
          "The name and the logo (for dark backgrounds) are required",
        ),
      );
      return;
    }
    setSaving(true);
    const payload = {
      name: v.name.trim(),
      logo_url: v.logoUrl,
      logo_light_url: v.logoLightUrl || null,
      size_class: v.sizeClass,
      display_order: v.displayOrder,
      show_on_home: v.showOnHome,
    };
    const { error } = initial
      ? await supabase.from("partners").update(payload).eq("id", initial.id)
      : await supabase.from("partners").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    draft.clear();
    toast.success(initial ? t("تم الحفظ", "Saved") : t("تمت الإضافة", "Added"));
    onDone();
  };

  const logoSlot = (which: "dark" | "light") => {
    const url = which === "dark" ? v.logoUrl : v.logoLightUrl;
    return (
      <div>
        <div className="mb-1.5 text-[13px] font-bold text-[var(--cx-ink-2)]">
          {which === "dark"
            ? t("الشعار على خلفية داكنة (مطلوب)", "Logo on dark (required)")
            : t("الشعار على خلفية فاتحة (اختياري)", "Logo on light (optional)")}
        </div>
        <label
          className={`flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-3 ${
            which === "dark" ? "border-[#244148] bg-[#0b1f24]" : "border-[var(--cx-line)] bg-white"
          } hover:border-[var(--cx-teal)]`}
        >
          {url ? (
            <img
              src={url}
              alt=""
              className="block h-auto max-h-[64px] w-auto max-w-full object-contain"
            />
          ) : (
            <span
              className={`flex flex-col items-center gap-1 text-[12.5px] font-bold ${which === "dark" ? "text-[#86a7ab]" : "text-[var(--cx-muted)]"}`}
            >
              {pct?.which === which ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {t("رفع", "Upload")}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f, which);
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            className="mt-1 text-[12px] font-bold text-[var(--cx-red)]"
            onClick={() => set(which === "dark" ? { logoUrl: "" } : { logoLightUrl: "" })}
          >
            {t("إزالة", "Remove")}
          </button>
        )}
        {which === "light" && !url && (
          <p className="mt-1 text-[12px] text-[var(--cx-muted)]">
            {t("إن بقي فارغاً يُستخدم الشعار نفسه.", "Leave empty to use the same logo.")}
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={save} className="space-y-5 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>
          {initial ? t("تعديل شريك", "Edit partner") : t("شريك جديد", "New partner")}
        </SheetTitle>
      </SheetHeader>
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />
      <Field label={t("اسم الشريك", "Partner name")}>
        <Input value={v.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {logoSlot("dark")}
        {logoSlot("light")}
      </div>
      {pct && (
        <UploadProgress percent={pct.pct} loaded={pct.loaded} total={pct.total} label={pct.name} />
      )}
      <Field label={t("حجم الشعار في الموقع", "Logo size on the site")}>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set({ sizeClass: s.value })}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-bold ${v.sizeClass === s.value ? "border-[var(--cx-teal)] bg-[var(--cx-teal-50)] text-[var(--cx-teal-700)]" : "border-[var(--cx-line)] bg-white"}`}
            >
              {ar ? s.ar : s.en}
            </button>
          ))}
        </div>
      </Field>
      <ToggleRow
        id="partner-home"
        label={t("إظهار في الرئيسية", "Show on the homepage")}
        checked={v.showOnHome}
        onChange={(x) => set({ showOnHome: x })}
      />
      <div className="flex justify-end gap-2 border-t border-[var(--cx-line-2)] pt-4">
        <Button type="submit" disabled={saving || !!pct}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? t("حفظ", "Save") : t("إضافة الشريك", "Add partner")}
        </Button>
      </div>
    </form>
  );
}
