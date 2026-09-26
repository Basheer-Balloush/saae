import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Home, Image as ImageIcon, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { communityLabel, NEWS_CATEGORY_KEYS, newsCategories } from "@/lib/communityCategories";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  ToggleRow,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/admin/news/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "News — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: NewsList,
});

export type NewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  category: string;
  categories: string[] | null;
  published_at: string;
  show_on_home: boolean;
};

function NewsList() {
  const { t, ar, lang } = useT();
  const navigate = useNavigate();
  const [rows, setRows] = useState<NewsRow[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [where, setWhere] = useState<"all" | "home">("all");

  useEffect(() => {
    supabase
      .from("news")
      .select(
        "id,title,title_ar,title_en,excerpt_ar,excerpt_en,image_url,images,videos,category,categories,published_at,show_on_home",
      )
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(toUserMessage(error));
        setRows((data as NewsRow[]) ?? []);
      });
  }, []);

  const toggleHome = async (row: NewsRow, value: boolean) => {
    setRows((all) => (all ?? []).map((r) => (r.id === row.id ? { ...r, show_on_home: value } : r)));
    const { error } = await supabase.from("news").update({ show_on_home: value }).eq("id", row.id);
    if (error) {
      toast.error(toUserMessage(error));
      setRows((all) =>
        (all ?? []).map((r) => (r.id === row.id ? { ...r, show_on_home: !value } : r)),
      );
    }
  };

  const remove = async (row: NewsRow) => {
    if (
      !(await confirmDialog({
        title: t("حذف هذا الخبر؟", "Delete this article?"),
        description: t("لا يمكن التراجع.", "This cannot be undone."),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("news").delete().eq("id", row.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(t("تم الحذف", "Deleted"));
    setRows((all) => (all ?? []).filter((r) => r.id !== row.id));
  };

  const title = (r: NewsRow) =>
    ar ? r.title_ar || r.title_en || r.title : r.title_en || r.title_ar || r.title;
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (where === "all" || r.show_on_home) &&
        (cat === "all" || newsCategories(r).includes(cat)) &&
        (!n || `${r.title_ar ?? ""} ${r.title_en ?? ""} ${r.title}`.toLowerCase().includes(n)),
    );
  }, [rows, q, cat, where]);
  const onHome = (rows ?? []).filter((r) => r.show_on_home).length;

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("الأخبار", "News")}
        description={t(
          "الأخبار والمقالات، وما يظهر منها في سلايدر الصفحة الرئيسية.",
          "Articles, and which of them appear in the homepage carousel.",
        )}
        actions={
          <Button asChild>
            <Link to="/admin/news/$id" params={{ id: "new" }}>
              <Plus className="h-4 w-4" />
              {t("خبر جديد", "New article")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={where}
          onChange={setWhere}
          options={[
            { value: "all", label: t("كل الأخبار", "All articles"), count: rows?.length ?? 0 },
            { value: "home", label: t("في الرئيسية", "On the homepage"), count: onHome },
          ]}
        />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="h-10 rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
            aria-label={t("المجتمع", "Community")}
          >
            <option value="all">{t("كل المجتمعات", "All communities")}</option>
            {NEWS_CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {communityLabel(k, lang)}
              </option>
            ))}
          </select>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("ابحث في العناوين", "Search titles")}
          />
        </div>
      </div>

      {rows === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Newspaper}
            title={
              rows.length
                ? t("لا توجد نتائج", "No matching articles")
                : t("لا توجد أخبار بعد", "No articles yet")
            }
            action={
              rows.length ? undefined : (
                <Button asChild>
                  <Link to="/admin/news/$id" params={{ id: "new" }}>
                    <Plus className="h-4 w-4" />
                    {t("اكتب أول خبر", "Write the first article")}
                  </Link>
                </Button>
              )
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <article key={r.id} className="cx-card flex flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => navigate({ to: "/admin/news/$id", params: { id: r.id } })}
                className="relative block text-start"
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full bg-[var(--cx-raise-2)] object-cover"
                  />
                ) : (
                  <div className="grid aspect-[16/9] w-full place-items-center bg-[var(--cx-raise-2)] text-[var(--cx-muted)]">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {r.show_on_home && (
                  <span className="absolute start-2 top-2">
                    <Pill tone="green" icon={Home}>
                      {t("في الرئيسية", "On homepage")}
                    </Pill>
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col p-4">
                <div className="text-[12px] text-[var(--cx-muted)]">
                  {fmtDate(r.published_at, lang)} ·{" "}
                  {newsCategories(r)
                    .map((c) => communityLabel(c, lang))
                    .join(ar ? "، " : ", ")}
                </div>
                <h3
                  className="mt-1 line-clamp-2 text-[15.5px] font-extrabold leading-snug"
                  dir="auto"
                >
                  {title(r)}
                </h3>
                <div className="mt-1 text-[12px] text-[var(--cx-muted)]">
                  {!!r.images?.length &&
                    t(
                      `${fmtNum(r.images.length, lang)} صورة`,
                      `${fmtNum(r.images.length, lang)} photos`,
                    )}
                  {!!r.images?.length && !!r.videos?.length && " · "}
                  {!!r.videos?.length &&
                    t(
                      `${fmtNum(r.videos.length, lang)} فيديو`,
                      `${fmtNum(r.videos.length, lang)} videos`,
                    )}
                </div>
                <div className="mt-auto pt-3">
                  <ToggleRow
                    id={`home-${r.id}`}
                    label={t("في الصفحة الرئيسية", "On the homepage")}
                    checked={r.show_on_home}
                    onChange={(v) => toggleHome(r, v)}
                  />
                </div>
                <div className="mt-2 flex gap-2 border-t border-[var(--cx-line-2)] pt-3">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/admin/news/$id" params={{ id: r.id }}>
                      <Pencil className="h-4 w-4" />
                      {t("تعديل", "Edit")}
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(r)}
                    aria-label={t("حذف", "Delete")}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--cx-red)]" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
