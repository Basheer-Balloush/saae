import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ExternalLink, Film, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import {
  communityLabel,
  NEWS_CATEGORY_KEYS,
  type NewsCategoryKey,
} from "@/lib/communityCategories";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadProgress } from "@/components/ui/upload-progress";
import {
  ErrorNote,
  Field,
  LangSwitch,
  Loading,
  PageHeader,
  Panel,
  SaveBar,
  ToggleRow,
  useT,
} from "@/components/console/ui";
import {
  IMAGE_MIME,
  VIDEO_MIME,
  checkImage,
  checkVideo,
  uploadNewsMedia,
  type Progress,
} from "@/features/website/media";

export const Route = createFileRoute("/admin/news/$id")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Edit article — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewsEditorPage,
});

type Values = {
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string;
  contentEn: string;
  categories: NewsCategoryKey[];
  publishedAt: string;
  showOnHome: boolean;
  imageUrl: string;
  images: string[];
  videos: string[];
};

const schema = z.object({
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  excerptAr: z.string().trim().max(500),
  excerptEn: z.string().trim().max(500),
  contentAr: z.string().trim().max(20000),
  contentEn: z.string().trim().max(20000),
  categories: z.array(z.enum(NEWS_CATEGORY_KEYS)).min(1),
  publishedAt: z.string().min(1),
});

const blank = (): Values => ({
  titleAr: "",
  titleEn: "",
  excerptAr: "",
  excerptEn: "",
  contentAr: "",
  contentEn: "",
  categories: [],
  publishedAt: new Date().toISOString().slice(0, 10),
  showOnHome: true,
  imageUrl: "",
  images: [],
  videos: [],
});

function NewsEditorPage() {
  const { id } = Route.useParams();
  const { t } = useT();
  const isNew = id === "new";
  const [loaded, setLoaded] = useState<Values | null>(isNew ? blank() : null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("news")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setMissing(true);
          return;
        }
        const r = data as Record<string, unknown> & {
          categories: string[] | null;
          category: string;
        };
        const cats = (
          (r.categories?.length ? r.categories : r.category ? [r.category] : []) as string[]
        ).filter((c) => (NEWS_CATEGORY_KEYS as readonly string[]).includes(c)) as NewsCategoryKey[];
        setLoaded({
          titleAr: (r.title_ar as string) ?? (r.title as string) ?? "",
          titleEn: (r.title_en as string) ?? (r.title as string) ?? "",
          excerptAr: (r.excerpt_ar as string) ?? (r.excerpt as string) ?? "",
          excerptEn: (r.excerpt_en as string) ?? (r.excerpt as string) ?? "",
          contentAr: (r.content_ar as string) ?? (r.content as string) ?? "",
          contentEn: (r.content_en as string) ?? (r.content as string) ?? "",
          categories: cats,
          publishedAt: (r.published_at as string) ?? new Date().toISOString().slice(0, 10),
          showOnHome: !!r.show_on_home,
          imageUrl: (r.image_url as string) ?? "",
          images: (r.images as string[]) ?? [],
          videos: (r.videos as string[]) ?? [],
        });
      });
  }, [id, isNew]);

  if (missing) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorNote text={t("لم يُعثر على هذا الخبر.", "This article was not found.")} />
      </div>
    );
  }
  if (!loaded) return <Loading />;
  return <NewsEditor key={id} id={isNew ? null : id} loaded={loaded} />;
}

function NewsEditor({ id, loaded }: { id: string | null; loaded: Values }) {
  const { t, ar, lang } = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [v, setV] = useState<Values>(loaded);
  const [saved, setSaved] = useState<Values>(loaded);
  const [edit, setEdit] = useState<"ar" | "en">(lang);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [uploads, setUploads] = useState<{
    cover?: Progress;
    gallery?: Progress;
    video?: Progress;
  }>({});
  const busy = useRef(false);
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const draft = useRecordDraft<Values>({
    key: formDraftKey(user?.id, "news", id ?? "new"),
    loaded: saved,
    current: v,
    apply: (d) => setV(d),
  });

  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(saved), [v, saved]);
  const uploading = !!(uploads.cover || uploads.gallery || uploads.video);

  const upload = async (lane: "cover" | "gallery" | "video", files: File[]) => {
    const check = lane === "video" ? checkVideo : checkImage;
    const bad = files.map((f) => check(f, ar)).filter(Boolean);
    if (bad.length) toast.error(bad.join(" · "));
    const good = files.filter((f) => !check(f, ar));
    const done: string[] = [];
    for (const f of good) {
      try {
        const url = await uploadNewsMedia(f, lane === "video" ? "video" : "image", (p) =>
          setUploads((u) => ({ ...u, [lane]: p })),
        );
        done.push(url);
      } catch (e) {
        toast.error(`${f.name}: ${toUserMessage(e)}`);
        break; // keep what uploaded; report the failure
      }
    }
    setUploads((u) => ({ ...u, [lane]: undefined }));
    if (!done.length) return;
    if (lane === "cover") set({ imageUrl: done[0] });
    if (lane === "gallery") setV((cur) => ({ ...cur, images: [...cur.images, ...done] }));
    if (lane === "video") setV((cur) => ({ ...cur, videos: [...cur.videos, ...done] }));
  };

  const save = async () => {
    if (busy.current || uploading) return;
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, boolean> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = true;
      setErrors(errs);
      if (errs.titleAr) setEdit("ar");
      else if (errs.titleEn) setEdit("en");
      toast.error(
        errs.categories
          ? t("اختر مجتمعاً واحداً على الأقل.", "Pick at least one community.")
          : t(
              "العنوان بالعربية والإنجليزية مطلوب.",
              "The title is required in Arabic and English.",
            ),
      );
      return;
    }
    setErrors({});
    busy.current = true;
    setSaving(true);
    const d = parsed.data;
    const payload = {
      // Legacy single-language mirrors, kept for older readers.
      title: d.titleEn || d.titleAr,
      excerpt: d.excerptEn || d.excerptAr || null,
      content: d.contentEn || d.contentAr || null,
      title_ar: d.titleAr,
      title_en: d.titleEn,
      excerpt_ar: d.excerptAr || null,
      excerpt_en: d.excerptEn || null,
      content_ar: d.contentAr || null,
      content_en: d.contentEn || null,
      category: d.categories[0],
      categories: d.categories,
      published_at: d.publishedAt,
      show_on_home: v.showOnHome,
      image_url: v.imageUrl || null,
      images: v.images,
      videos: v.videos,
    };
    try {
      if (id) {
        const { error } = await supabase.from("news").update(payload).eq("id", id);
        if (error) throw error;
        setSaved(v);
        draft.clear();
        toast.success(t("تم الحفظ", "Saved"));
      } else {
        const { data, error } = await supabase
          .from("news")
          .insert(payload)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        draft.clear();
        toast.success(t("تم نشر الخبر", "Article created"));
        if (data?.id) navigate({ to: "/admin/news/$id", params: { id: data.id }, replace: true });
        else navigate({ to: "/admin/news" });
      }
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    if (
      !(await confirmDialog({
        title: t("حذف هذا الخبر؟", "Delete this article?"),
        description: t("لا يمكن التراجع.", "This cannot be undone."),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    draft.clear();
    toast.success(t("تم الحذف", "Deleted"));
    navigate({ to: "/admin/news" });
  };

  const L = edit === "ar";
  const title = L ? v.titleAr : v.titleEn;
  const missingLang = { ar: !v.titleAr.trim(), en: !v.titleEn.trim() };

  return (
    <div>
      <PageHeader
        back={{ to: "/admin/news", label: t("كل الأخبار", "All articles") }}
        eyebrow={t("إدارة الموقع · الأخبار", "Website · News")}
        title={
          (ar ? v.titleAr || v.titleEn : v.titleEn || v.titleAr) || t("خبر جديد", "New article")
        }
        actions={
          <>
            {id && (
              <Button asChild variant="ghost">
                <a href={`/news/${id}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("عرض في الموقع", "View on site")}
                </a>
              </Button>
            )}
            {!id && (
              <Button onClick={save} disabled={saving || uploading}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("نشر الخبر", "Publish article")}
              </Button>
            )}
          </>
        }
      />
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel
            title={t("النص", "Text")}
            description={t(
              "اكتب النص باللغتين. النقطة البرتقالية تعني أن العنوان ناقص في تلك اللغة.",
              "Write the text in both languages. An orange dot means that language's title is missing.",
            )}
            actions={<LangSwitch value={edit} onChange={setEdit} missing={missingLang} />}
          >
            <div className="space-y-4" dir={L ? "rtl" : "ltr"}>
              <Field
                label={L ? "العنوان" : "Title"}
                error={(L ? errors.titleAr : errors.titleEn) ? t("مطلوب", "Required") : undefined}
              >
                <Input
                  value={title}
                  maxLength={200}
                  className="h-11 text-[16px] font-bold"
                  onChange={(e) =>
                    set(L ? { titleAr: e.target.value } : { titleEn: e.target.value })
                  }
                />
              </Field>
              <Field label={L ? "المقتطف (يظهر في البطاقات)" : "Excerpt (shown on cards)"}>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={L ? v.excerptAr : v.excerptEn}
                  onChange={(e) =>
                    set(L ? { excerptAr: e.target.value } : { excerptEn: e.target.value })
                  }
                />
              </Field>
              <Field label={L ? "النص الكامل" : "Full text"}>
                <Textarea
                  rows={16}
                  value={L ? v.contentAr : v.contentEn}
                  onChange={(e) =>
                    set(L ? { contentAr: e.target.value } : { contentEn: e.target.value })
                  }
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title={t("صور المعرض", "Photo gallery")}
            description={t(
              "تظهر كسلايدر داخل الخبر. JPG / PNG / WEBP / GIF حتى 10 ميجابايت.",
              "Shown as a carousel inside the article. JPG / PNG / WEBP / GIF up to 10 MB.",
            )}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {v.images.map((url, i) => (
                <div
                  key={url}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--cx-line)]"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setV((cur) => ({ ...cur, images: cur.images.filter((_, x) => x !== i) }))
                    }
                    className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                    aria-label={t("إزالة", "Remove")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-[var(--cx-line)] text-[var(--cx-muted)] hover:border-[var(--cx-teal)] hover:text-[var(--cx-teal)]">
                <span className="flex flex-col items-center gap-1 text-[12.5px] font-bold">
                  {uploads.gallery ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  {t("إضافة صور", "Add photos")}
                </span>
                <input
                  type="file"
                  multiple
                  accept={IMAGE_MIME.join(",")}
                  className="hidden"
                  disabled={!!uploads.gallery}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) upload("gallery", files);
                  }}
                />
              </label>
            </div>
            {uploads.gallery && (
              <div className="mt-3">
                <UploadProgress
                  percent={uploads.gallery.pct}
                  loaded={uploads.gallery.loaded}
                  total={uploads.gallery.total}
                  label={uploads.gallery.name}
                />
              </div>
            )}
          </Panel>

          <Panel
            title={t("الفيديوهات", "Videos")}
            description={t("MP4 / WEBM / MOV حتى 200 ميجابايت.", "MP4 / WEBM / MOV up to 200 MB.")}
          >
            <div className="space-y-2">
              {v.videos.map((url, i) => (
                <div
                  key={url}
                  className="flex items-center gap-3 rounded-lg border border-[var(--cx-line)] p-2"
                >
                  <video src={url} className="h-14 w-24 rounded object-cover" muted />
                  <span
                    className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--cx-muted)]"
                    dir="ltr"
                  >
                    {url.split("/").pop()}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setV((cur) => ({ ...cur, videos: cur.videos.filter((_, x) => x !== i) }))
                    }
                    aria-label={t("إزالة", "Remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--cx-line)] px-3 text-[13px] font-bold hover:border-[var(--cx-teal)]">
                {uploads.video ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4 text-[var(--cx-teal)]" />
                )}
                {t("رفع فيديو", "Upload video")}
                <input
                  type="file"
                  multiple
                  accept={VIDEO_MIME.join(",")}
                  className="hidden"
                  disabled={!!uploads.video}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) upload("video", files);
                  }}
                />
              </label>
              {uploads.video && (
                <UploadProgress
                  percent={uploads.video.pct}
                  loaded={uploads.video.loaded}
                  total={uploads.video.total}
                  label={uploads.video.name}
                />
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title={t("النشر", "Publishing")}>
            <Field label={t("تاريخ الخبر", "Article date")}>
              <Input
                type="date"
                value={v.publishedAt}
                onChange={(e) => set({ publishedAt: e.target.value })}
              />
            </Field>
            <div className="mt-4">
              <ToggleRow
                id="news-home"
                label={t("في الصفحة الرئيسية", "On the homepage")}
                hint={t(
                  "يظهر في سلايدر الأخبار في الرئيسية.",
                  "Shows in the homepage news carousel.",
                )}
                checked={v.showOnHome}
                onChange={(x) => set({ showOnHome: x })}
              />
            </div>
          </Panel>

          <Panel
            title={t("المجتمعات", "Communities")}
            description={t(
              "واحد على الأقل. الأول يكون التصنيف الرئيسي.",
              "At least one. The first is the main category.",
            )}
          >
            <div className="flex flex-wrap gap-2">
              {NEWS_CATEGORY_KEYS.map((k) => {
                const on = v.categories.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set({
                        categories: on ? v.categories.filter((c) => c !== k) : [...v.categories, k],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-bold ${
                      on
                        ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white"
                        : "border-[var(--cx-line)] bg-[var(--cx-field)] hover:border-[var(--cx-teal)]"
                    }`}
                  >
                    {communityLabel(k, lang)}
                  </button>
                );
              })}
            </div>
            {errors.categories && (
              <p className="mt-2 text-[12px] font-semibold text-[var(--cx-red)]">
                {t("اختر مجتمعاً واحداً على الأقل", "Pick at least one community")}
              </p>
            )}
          </Panel>

          <Panel title={t("صورة الغلاف", "Cover image")}>
            <label className="group relative block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-[var(--cx-line)] hover:border-[var(--cx-teal)]">
              {v.imageUrl ? (
                <img src={v.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] flex-col items-center justify-center gap-1 text-[var(--cx-muted)]">
                  <Upload className="h-6 w-6" />
                  <span className="text-[12.5px] font-bold">{t("رفع الغلاف", "Upload cover")}</span>
                </div>
              )}
              <input
                type="file"
                accept={IMAGE_MIME.join(",")}
                className="hidden"
                disabled={!!uploads.cover}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) upload("cover", [f]);
                }}
              />
            </label>
            {uploads.cover && (
              <div className="mt-2">
                <UploadProgress
                  percent={uploads.cover.pct}
                  loaded={uploads.cover.loaded}
                  total={uploads.cover.total}
                  label={uploads.cover.name}
                />
              </div>
            )}
            {v.imageUrl && (
              <button
                type="button"
                className="mt-2 text-[12.5px] font-bold text-[var(--cx-red)]"
                onClick={() => set({ imageUrl: "" })}
              >
                {t("إزالة الغلاف", "Remove cover")}
              </button>
            )}
          </Panel>

          {id && (
            <Button
              variant="outline"
              className="w-full border-[var(--cx-red-line)] text-[var(--cx-red)]"
              onClick={remove}
            >
              <Trash2 className="h-4 w-4" />
              {t("حذف الخبر", "Delete article")}
            </Button>
          )}
        </aside>
      </div>

      {id && (
        <SaveBar
          show={dirty}
          saving={saving || uploading}
          onSave={save}
          onDiscard={() => setV(saved)}
        />
      )}
    </div>
  );
}
