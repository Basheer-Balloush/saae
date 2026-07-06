import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, LogOut, Upload, X, Globe, Sun, Moon } from "lucide-react";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import { useLang } from "@/lib/i18n";
import { AdminChatbotSection } from "@/components/admin/AdminChatbotSection";
import { useTheme } from "@/lib/theme";
import { z } from "zod";
import {
  NEWS_CATEGORY_KEYS,
  COMMUNITY_LABELS_AR,
  COMMUNITY_LABELS_EN,
  communityLabel,
  type NewsCategoryKey,
} from "@/lib/communityCategories";


const ADMIN_TEXT = {
  en: {
    backToSite: "← Site",
    adminTitle: "Admin Dashboard",
    languageButton: "العربية",
    themeButton: "Theme",
    signOut: "Sign out",
    noAccess: "You don't have admin access.",
    news: "News",
    members: "Members",
    chatbot: "Chatbot",
    partners: "Partners",
    allNews: "All news",
    newArticle: "New article",
    cover: "Cover",
    title: "Title",
    category: "Category",
    date: "Date",
    onHome: "On home",
    actions: "Actions",
    noNews: "{labels.noNews}",
    deleteNewsConfirm: "Delete this news item?",
    deleted: "Deleted",
    editNews: "Edit news",
    newNewsArticle: "New news article",
    titleEn: "Title (English)",
    titleAr: "Title (Arabic)",
    excerptEn: "Excerpt (English)",
    excerptAr: "Excerpt (Arabic)",
    contentEn: "Full content (English)",
    contentAr: "Full content (Arabic)",
    communityCategory: "Community (category)",
    coverImage: "Cover image",
    uploading: "Uploading…",
    uploadCover: "Upload cover",
    remove: "Remove",
    galleryImages: "Gallery images (carousel)",
    add: "Add",
    videos: "Videos",
    uploadVideos: "Upload video(s)",
    showOnHomeTitle: "Show on home page",
    showOnHomeHint: "Appears in the homepage news carousel.",
    cancel: "Cancel",
    saveChanges: "Save changes",
    create: "Create",
    updated: "Updated",
    created: "Created",
    saveFailed: "Save failed",
    coverUploaded: "Cover uploaded",
    photoUploaded: "Photo uploaded",
    uploadFailed: "Upload failed",
    imagesUploaded: (count: number) => `${count} image(s) uploaded`,
    videosUploaded: (count: number) => `${count} video(s) uploaded`,
    membersTitle: "Members",
    newMember: "New member",
    photo: "Photo",
    name: "Name",
    position: "Position",
    order: "Order",
    noMembers: "{labels.noMembers}",
    deleteMemberConfirm: "Delete this member?",
    editMember: "Edit member",
    categoryBoard: "Board of Directors",
    categoryExecutive: "Executive Members",
    displayOrder: "Display order",
    nameEn: "Name (English)",
    nameAr: "Name (Arabic)",
    positionEn: "Position (English)",
    positionAr: "Position (Arabic)",
    bioEn: "Bio (English)",
    bioAr: "Bio (Arabic)",
    uploadPhoto: "Upload photo",
    requiredMemberFields: "Arabic name and position are required",
  },
  ar: {
    backToSite: "الموقع ←",
    adminTitle: "لوحة إدارة المحتوى",
    languageButton: "English",
    themeButton: "الثيم",
    signOut: "تسجيل الخروج",
    noAccess: "ليس لديك صلاحية دخول للوحة الإدارة.",
    news: "الأخبار",
    members: "الأعضاء",
    chatbot: "الشات بوت",
    partners: "الشركاء",
    allNews: "كل الأخبار",
    newArticle: "خبر جديد",
    cover: "الغلاف",
    title: "العنوان",
    category: "التصنيف",
    date: "التاريخ",
    onHome: "في الرئيسية",
    actions: "الإجراءات",
    noNews: "لا توجد أخبار بعد. أنشئ أول خبر.",
    deleteNewsConfirm: "هل تريد حذف هذا الخبر؟",
    deleted: "تم الحذف",
    editNews: "تعديل الخبر",
    newNewsArticle: "خبر جديد",
    titleEn: "العنوان (إنجليزي)",
    titleAr: "العنوان (عربي)",
    excerptEn: "المقتطف (إنجليزي)",
    excerptAr: "المقتطف (عربي)",
    contentEn: "النص الكامل (إنجليزي)",
    contentAr: "النص الكامل (عربي)",
    communityCategory: "المجتمع (التصنيف)",
    coverImage: "صورة الغلاف",
    uploading: "جارٍ الرفع…",
    uploadCover: "رفع الغلاف",
    remove: "إزالة",
    galleryImages: "صور المعرض (السلايدر)",
    add: "إضافة",
    videos: "الفيديوهات",
    uploadVideos: "رفع فيديوهات",
    showOnHomeTitle: "إظهار في الصفحة الرئيسية",
    showOnHomeHint: "يظهر ضمن سلايدر الأخبار في الصفحة الرئيسية.",
    cancel: "إلغاء",
    saveChanges: "حفظ التعديلات",
    create: "إنشاء",
    updated: "تم التحديث",
    created: "تم الإنشاء",
    saveFailed: "فشل الحفظ",
    coverUploaded: "تم رفع الغلاف",
    photoUploaded: "تم رفع الصورة",
    uploadFailed: "فشل الرفع",
    imagesUploaded: (count: number) => `تم رفع ${count} صورة`,
    videosUploaded: (count: number) => `تم رفع ${count} فيديو`,
    membersTitle: "الأعضاء",
    newMember: "عضو جديد",
    photo: "الصورة",
    name: "الاسم",
    position: "المنصب",
    order: "الترتيب",
    noMembers: "لا يوجد أعضاء بعد.",
    deleteMemberConfirm: "هل تريد حذف هذا العضو؟",
    editMember: "تعديل العضو",
    categoryBoard: "مجلس الإدارة",
    categoryExecutive: "الأعضاء التنفيذيون",
    displayOrder: "ترتيب العرض",
    nameEn: "الاسم (إنجليزي)",
    nameAr: "الاسم (عربي)",
    positionEn: "المنصب (إنجليزي)",
    positionAr: "المنصب (عربي)",
    bioEn: "النبذة (إنجليزي)",
    bioAr: "النبذة (عربي)",
    uploadPhoto: "رفع الصورة",
    requiredMemberFields: "الاسم والمنصب بالعربية مطلوبان",
  },
} as const;

type AdminLabels = (typeof ADMIN_TEXT)[keyof typeof ADMIN_TEXT];

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "description", content: "Private admin dashboard for managing site content, news, communities, and chatbot settings." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Dashboard" },
      { property: "og:description", content: "Private admin dashboard for managing site content, news, communities, and chatbot settings." },
    ],
  }),
  component: AdminDashboard,
});

type NewsRow = {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  content: string | null;
  content_ar: string | null;
  content_en: string | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  category: string;
  categories: string[] | null;
  published_at: string;
  show_on_home: boolean;
};

const newsSchema = z.object({
  title_ar: z.string().trim().min(1, "Arabic title required").max(200),
  title_en: z.string().trim().min(1, "English title required").max(200),
  excerpt_ar: z.string().trim().max(500).optional().or(z.literal("")),
  excerpt_en: z.string().trim().max(500).optional().or(z.literal("")),
  content_ar: z.string().trim().max(20000).optional().or(z.literal("")),
  content_en: z.string().trim().max(20000).optional().or(z.literal("")),
  categories: z.array(z.enum(NEWS_CATEGORY_KEYS)).min(1, "Select at least one category"),
  published_at: z.string().min(1),
  show_on_home: z.boolean(),
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { lang, dir, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const labels = ADMIN_TEXT[lang];
  void COMMUNITY_LABELS_AR; void COMMUNITY_LABELS_EN;
  const [items, setItems] = useState<NewsRow[]>([]);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"news" | "members" | "chatbot" | "partners">("news");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/admin/login" });
      else if (!isAdmin) {
        toast.error(labels.noAccess);
        navigate({ to: "/" });
      }
    }
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(toUserMessage(error));
        else setItems((data ?? []) as NewsRow[]);
      });
  }, [isAdmin, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm(labels.deleteNewsConfirm)) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) toast.error(toUserMessage(error));
    else {
      toast.success(labels.deleted);
      refresh();
    }
  };

  const toggleHome = async (row: NewsRow, value: boolean) => {
    const { error } = await supabase.from("news").update({ show_on_home: value }).eq("id", row.id);
    if (error) toast.error(toUserMessage(error));
    else {
      setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, show_on_home: value } : p)));
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              {labels.backToSite}
            </Link>
            <h1 className="mt-1 text-xl font-bold text-foreground">{labels.adminTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" /> {labels.languageButton}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> {labels.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("news")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "news" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels.news}
          </button>
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "members" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels.members}
          </button>
          <button
            type="button"
            onClick={() => setTab("chatbot")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "chatbot" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels.chatbot}
          </button>
          <button
            type="button"
            onClick={() => setTab("partners")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "partners" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels.partners}
          </button>
          <Link
            to="/admin/initiative"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {lang === "ar" ? "مبادرة المليون" : "Million Initiative"}
          </Link>
          <Link
            to={"/admin/initiative-survey" as any}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {lang === "ar" ? "استبيان المبادرة" : "Initiative Survey"}
          </Link>

        </div>

        {tab === "news" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{labels.allNews} ({items.length})</h2>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> {labels.newArticle}
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">{labels.cover}</th>
                    <th className="px-4 py-3 text-start">{labels.title}</th>
                    <th className="px-4 py-3 text-start">{labels.category}</th>
                    <th className="px-4 py-3 text-start">{labels.date}</th>
                    <th className="px-4 py-3 text-start">{labels.onHome}</th>
                    <th className="px-4 py-3 text-end">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        {labels.noNews}
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {row.image_url ? (
                          <img
                            src={row.image_url}
                            alt=""
                            className="h-12 w-16 rounded object-cover bg-muted"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <div className="h-12 w-16 rounded bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{lang === "ar" ? row.title_ar || row.title_en || row.title : row.title_en || row.title_ar || row.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(row.categories && row.categories.length > 0 ? row.categories : [row.category])
                          .filter(Boolean)
                          .map((c) => communityLabel(c, lang))
                          .join(lang === "ar" ? "، " : ", ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.published_at}</td>
                      <td className="px-4 py-3">
                        <Switch checked={row.show_on_home} onCheckedChange={(v) => toggleHome(row, v)} />
                      </td>
                      <td className="px-4 py-3 text-end">

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(row);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "members" ? (
          <MembersAdmin labels={labels} lang={lang} />
        ) : tab === "partners" ? (
          <PartnersAdmin lang={lang} />
        ) : (
          <AdminChatbotSection lang={lang} />
        )}
      </main>

      {showForm && (
        <NewsForm
          initial={editing}
          labels={labels}
          lang={lang}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

async function uploadToBucket(
  file: File,
  kind: "image" | "video",
  onProgress?: (pct: number, loaded: number, total: number) => void,
): Promise<string> {
  const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${kind}s/${crypto.randomUUID()}.${ext || (kind === "video" ? "mp4" : "jpg")}`;
  const { publicUrl } = await uploadToSupabaseStorage({
    bucket: "news-images",
    path,
    file,
    upsert: false,
    contentType: file.type || undefined,
    onProgress,
  });
  return publicUrl;
}

function NewsForm({
  initial,
  labels,
  lang,
  onClose,
  onSaved,
}: {
  initial: NewsRow | null;
  labels: AdminLabels;
  lang: "en" | "ar";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleAr, setTitleAr] = useState(initial?.title_ar ?? initial?.title ?? "");
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? initial?.title ?? "");
  const [excerptAr, setExcerptAr] = useState(initial?.excerpt_ar ?? initial?.excerpt ?? "");
  const [excerptEn, setExcerptEn] = useState(initial?.excerpt_en ?? initial?.excerpt ?? "");
  const [contentAr, setContentAr] = useState(initial?.content_ar ?? initial?.content ?? "");
  const [contentEn, setContentEn] = useState(initial?.content_en ?? initial?.content ?? "");
  const [categories, setCategories] = useState<NewsCategoryKey[]>(() => {
    const initArr = (initial?.categories && initial.categories.length > 0
      ? initial.categories
      : initial?.category
        ? [initial.category]
        : ["data"]) as NewsCategoryKey[];
    return initArr.filter((c) => (NEWS_CATEGORY_KEYS as readonly string[]).includes(c));
  });
  const [publishedAt, setPublishedAt] = useState(
    initial?.published_at ?? new Date().toISOString().slice(0, 10),
  );
  const [showOnHome, setShowOnHome] = useState(initial?.show_on_home ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [videos, setVideos] = useState<string[]>(initial?.videos ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToBucket(file, "image");
      setImageUrl(url);
      toast.success(labels.coverUploaded);
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadToBucket(f, "image"));
      }
      setImages((prev) => [...prev, ...urls]);
      toast.success(labels.imagesUploaded(urls.length));
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadToBucket(f, "video"));
      }
      setVideos((prev) => [...prev, ...urls]);
      toast.success(labels.videosUploaded(urls.length));
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newsSchema.safeParse({
      title_ar: titleAr,
      title_en: titleEn,
      excerpt_ar: excerptAr,
      excerpt_en: excerptEn,
      content_ar: contentAr,
      content_en: contentEn,
      categories,
      published_at: publishedAt,
      show_on_home: showOnHome,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        // keep legacy mirrors for backward compatibility
        title: parsed.data.title_en || parsed.data.title_ar,
        excerpt: parsed.data.excerpt_en || parsed.data.excerpt_ar || null,
        content: parsed.data.content_en || parsed.data.content_ar || null,
        title_ar: parsed.data.title_ar,
        title_en: parsed.data.title_en,
        excerpt_ar: parsed.data.excerpt_ar || null,
        excerpt_en: parsed.data.excerpt_en || null,
        content_ar: parsed.data.content_ar || null,
        content_en: parsed.data.content_en || null,
        category: parsed.data.categories[0],
        categories: parsed.data.categories,
        published_at: parsed.data.published_at,
        show_on_home: parsed.data.show_on_home,
        image_url: imageUrl || null,
        images,
        videos,
      };
      if (initial) {
        const { error } = await supabase.from("news").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success(labels.updated);
      } else {
        const { error } = await supabase.from("news").insert(payload);
        if (error) throw error;
        toast.success(labels.created);
      }
      onSaved();
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {initial ? labels.editNews : labels.newNewsArticle}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title_en">{labels.titleEn}</Label>
              <Input id="title_en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required maxLength={200} />
            </div>
            <div dir="rtl">
              <Label htmlFor="title_ar">{labels.titleAr}</Label>
              <Input id="title_ar" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required maxLength={200} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="excerpt_en">{labels.excerptEn}</Label>
              <Textarea id="excerpt_en" value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} maxLength={500} rows={3} />
            </div>
            <div dir="rtl">
              <Label htmlFor="excerpt_ar">{labels.excerptAr}</Label>
              <Textarea id="excerpt_ar" value={excerptAr} onChange={(e) => setExcerptAr(e.target.value)} maxLength={500} rows={3} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="content_en">{labels.contentEn}</Label>
              <Textarea id="content_en" value={contentEn} onChange={(e) => setContentEn(e.target.value)} rows={10} />
            </div>
            <div dir="rtl">
              <Label htmlFor="content_ar">{labels.contentAr}</Label>
              <Textarea id="content_ar" value={contentAr} onChange={(e) => setContentAr(e.target.value)} rows={10} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{labels.communityCategory}</Label>
              <div className="mt-2 flex flex-wrap gap-2 rounded-md border border-input bg-background p-3">
                {NEWS_CATEGORY_KEYS.map((k) => {
                  const checked = categories.includes(k);
                  return (
                    <label
                      key={k}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(e) => {
                          setCategories((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, k]))
                              : prev.filter((c) => c !== k),
                          );
                        }}
                      />
                      {communityLabel(k, lang)}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="date">{labels.date}</Label>
              <Input id="date" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label>{labels.coverImage}</Label>
            <div className="mt-2 flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-20 w-28 rounded object-cover" />
              ) : (
                <div className="h-20 w-28 rounded bg-muted" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? labels.uploading : labels.uploadCover}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverUpload(f);
                  }}
                />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setImageUrl("")}
                >
                  {labels.remove}
                </button>
              )}
            </div>
          </div>

          <div>
            <Label>{labels.galleryImages}</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={url} className="relative h-20 w-28">
                  <img src={url} alt="" className="h-full w-full rounded object-cover" />
                  <button
                    type="button"
                    aria-label={labels.remove}
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="inline-flex h-20 w-28 cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-input text-xs font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {labels.add}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) handleGalleryUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>{labels.videos}</Label>
            <div className="mt-2 space-y-2">
              {videos.map((url, i) => (
                <div key={url} className="flex items-center gap-3 rounded border border-border p-2">
                  <video src={url} className="h-14 w-24 rounded object-cover" muted />
                  <span className="flex-1 truncate text-xs text-muted-foreground">{url}</span>
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => setVideos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    {labels.remove}
                  </button>
                </div>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? labels.uploading : labels.uploadVideos}
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) handleVideoUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{labels.showOnHomeTitle}</p>
              <p className="text-xs text-muted-foreground">{labels.showOnHomeHint}</p>
            </div>
            <Switch checked={showOnHome} onCheckedChange={setShowOnHome} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? labels.saveChanges : labels.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Members admin ---------- */

type MemberRow = {
  id: string;
  category: "board" | "executive";
  full_name_ar: string;
  full_name_en: string | null;
  position_ar: string;
  position_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
  display_order: number;
};

function MembersAdmin({ labels, lang }: { labels: AdminLabels; lang: "en" | "ar" }) {
  const [list, setList] = useState<MemberRow[]>([]);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .order("category", { ascending: true })
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(toUserMessage(error));
        else setList((data ?? []) as MemberRow[]);
      });
  }, [bump]);

  const remove = async (id: string) => {
    if (!confirm(labels.deleteMemberConfirm)) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) toast.error(toUserMessage(error));
    else { toast.success(labels.deleted); setBump((k) => k + 1); }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{labels.membersTitle} ({list.length})</h2>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> {labels.newMember}
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{labels.photo}</th>
              <th className="px-4 py-3">{labels.name}</th>
              <th className="px-4 py-3">{labels.position}</th>
              <th className="px-4 py-3">{labels.category}</th>
              <th className="px-4 py-3">{labels.order}</th>
              <th className="px-4 py-3 text-right">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {labels.noMembers}
                </td>
              </tr>
            )}
            {list.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{lang === "ar" ? m.full_name_ar || m.full_name_en : m.full_name_en || m.full_name_ar}</td>
                <td className="px-4 py-3 text-muted-foreground">{lang === "ar" ? m.position_ar || m.position_en : m.position_en || m.position_ar}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{m.category === "board" ? labels.categoryBoard : labels.categoryExecutive}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.display_order}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MemberForm
          initial={editing}
          labels={labels}
          lang={lang}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setBump((k) => k + 1); }}
        />
      )}
    </>
  );
}

function MemberForm({
  initial,
  labels,
  lang,
  onClose,
  onSaved,
}: {
  initial: MemberRow | null;
  labels: AdminLabels;
  lang: "en" | "ar";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<"board" | "executive">(initial?.category ?? "board");
  const [nameAr, setNameAr] = useState(initial?.full_name_ar ?? "");
  const [nameEn, setNameEn] = useState(initial?.full_name_en ?? "");
  const [posAr, setPosAr] = useState(initial?.position_ar ?? "");
  const [posEn, setPosEn] = useState(initial?.position_en ?? "");
  const [bioAr, setBioAr] = useState(initial?.bio_ar ?? "");
  const [bioEn, setBioEn] = useState(initial?.bio_en ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");
  const [order, setOrder] = useState(initial?.display_order ?? 0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToBucket(file, "image");
      setPhotoUrl(url);
      toast.success(labels.photoUploaded);
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !posAr.trim()) {
      toast.error(labels.requiredMemberFields);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category,
        full_name_ar: nameAr.trim(),
        full_name_en: nameEn.trim() || null,
        position_ar: posAr.trim(),
        position_en: posEn.trim() || null,
        bio_ar: bioAr.trim() || null,
        bio_en: bioEn.trim() || null,
        photo_url: photoUrl || null,
        display_order: Number(order) || 0,
      };
      if (initial) {
        const { error } = await supabase.from("members").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success(labels.updated);
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
        toast.success(labels.created);
      }
      onSaved();
    } catch (err: any) {
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {initial ? labels.editMember : labels.newMember}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{labels.category}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "board" | "executive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">{labels.categoryBoard}</SelectItem>
                  <SelectItem value="executive">{labels.categoryExecutive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order">{labels.displayOrder}</Label>
              <Input id="order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name_en">{labels.nameEn}</Label>
              <Input id="name_en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={120} />
            </div>
            <div dir="rtl">
              <Label htmlFor="name_ar">{labels.nameAr}</Label>
              <Input id="name_ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required maxLength={120} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pos_en">{labels.positionEn}</Label>
              <Input id="pos_en" value={posEn} onChange={(e) => setPosEn(e.target.value)} maxLength={120} />
            </div>
            <div dir="rtl">
              <Label htmlFor="pos_ar">{labels.positionAr}</Label>
              <Input id="pos_ar" value={posAr} onChange={(e) => setPosAr(e.target.value)} required maxLength={120} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bio_en">{labels.bioEn}</Label>
              <Textarea id="bio_en" value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={4} maxLength={1000} />
            </div>
            <div dir="rtl">
              <Label htmlFor="bio_ar">{labels.bioAr}</Label>
              <Textarea id="bio_ar" value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={4} maxLength={1000} />
            </div>
          </div>

          <div>
            <Label>{labels.photo}</Label>
            <div className="mt-2 flex items-center gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? labels.uploading : labels.uploadPhoto}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhoto(f);
                  }}
                />
              </label>
              {photoUrl && (
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setPhotoUrl("")}>
                  {labels.remove}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{labels.cancel}</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? labels.saveChanges : labels.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----- Partners admin -----

type PartnerRow = {
  id: string;
  name: string;
  logo_url: string;
  logo_light_url: string | null;
  size_class: string;
  display_order: number;
  show_on_home: boolean;
};

const SIZE_OPTIONS = ["h-16", "h-20", "h-24", "h-28", "h-32", "h-36", "h-40"] as const;

async function uploadPartnerLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `partners/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("news-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("news-images").getPublicUrl(path);
  return data.publicUrl;
}

function PartnersAdmin({ lang }: { lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    supabase
      .from("partners")
      .select("*")
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(toUserMessage(error));
        else setRows((data ?? []) as PartnerRow[]);
      });
  }, [bump]);

  const remove = async (id: string) => {
    if (!confirm(ar ? "هل تريد حذف هذا الشريك؟" : "Delete this partner?")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) toast.error(toUserMessage(error));
    else { toast.success(ar ? "تم الحذف" : "Deleted"); setBump((k) => k + 1); }
  };

  const toggleHome = async (row: PartnerRow, value: boolean) => {
    const { error } = await supabase.from("partners").update({ show_on_home: value }).eq("id", row.id);
    if (error) toast.error(toUserMessage(error));
    else setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, show_on_home: value } : p)));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {ar ? "الشركاء" : "Partners"} ({rows.length})
        </h2>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> {ar ? "شريك جديد" : "New partner"}
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-start text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">{ar ? "اللوغو (داكن)" : "Logo (dark)"}</th>
              <th className="px-4 py-3 text-start">{ar ? "اللوغو (فاتح)" : "Logo (light)"}</th>
              <th className="px-4 py-3 text-start">{ar ? "الاسم" : "Name"}</th>
              <th className="px-4 py-3 text-start">{ar ? "الحجم" : "Size"}</th>
              <th className="px-4 py-3 text-start">{ar ? "الترتيب" : "Order"}</th>
              <th className="px-4 py-3 text-start">{ar ? "ظاهر" : "Visible"}</th>
              <th className="px-4 py-3 text-end">{ar ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {ar ? "لا يوجد شركاء بعد." : "No partners yet."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex h-12 w-20 items-center justify-center rounded bg-zinc-900 p-1">
                    <img src={r.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.logo_light_url ? (
                    <div className="flex h-12 w-20 items-center justify-center rounded bg-white p-1">
                      <img src={r.logo_light_url} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.size_class}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.display_order}</td>
                <td className="px-4 py-3">
                  <Switch checked={r.show_on_home} onCheckedChange={(v) => toggleHome(r, v)} />
                </td>
                <td className="px-4 py-3 text-end">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PartnerForm
          initial={editing}
          lang={lang}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setBump((k) => k + 1); }}
        />
      )}
    </>
  );
}

function PartnerForm({
  initial, lang, onClose, onSaved,
}: {
  initial: PartnerRow | null;
  lang: "en" | "ar";
  onClose: () => void;
  onSaved: () => void;
}) {
  const ar = lang === "ar";
  const [name, setName] = useState(initial?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [logoLightUrl, setLogoLightUrl] = useState(initial?.logo_light_url ?? "");
  const [sizeClass, setSizeClass] = useState(initial?.size_class ?? "h-24");
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0);
  const [showOnHome, setShowOnHome] = useState(initial?.show_on_home ?? true);
  const [uploading, setUploading] = useState<"dark" | "light" | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file: File, which: "dark" | "light") => {
    setUploading(which);
    try {
      const url = await uploadPartnerLogo(file);
      if (which === "dark") setLogoUrl(url);
      else setLogoLightUrl(url);
      toast.success(ar ? "تم رفع الصورة" : "Logo uploaded");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !logoUrl) {
      toast.error(ar ? "الاسم واللوغو الداكن مطلوبان" : "Name and dark logo are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      logo_url: logoUrl,
      logo_light_url: logoLightUrl || null,
      size_class: sizeClass,
      display_order: displayOrder,
      show_on_home: showOnHome,
    };
    const { error } = initial
      ? await supabase.from("partners").update(payload).eq("id", initial.id)
      : await supabase.from("partners").insert(payload);
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? (initial ? "تم التحديث" : "تم الإنشاء") : (initial ? "Updated" : "Created"));
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {initial ? (ar ? "تعديل شريك" : "Edit partner") : (ar ? "شريك جديد" : "New partner")}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{ar ? "الاسم" : "Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{ar ? "اللوغو (للوضع الداكن)" : "Logo (for dark mode)"}</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-16 w-24 items-center justify-center rounded border border-border bg-zinc-900 p-1">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                  {uploading === "dark" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{ar ? "رفع" : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "dark"); e.target.value = ""; }}
                  />
                </label>
                {logoUrl && (
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setLogoUrl("")}>
                    {ar ? "إزالة" : "Remove"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label>{ar ? "اللوغو (للوضع الفاتح — اختياري)" : "Logo (for light mode — optional)"}</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-16 w-24 items-center justify-center rounded border border-border bg-white p-1">
                  {logoLightUrl ? (
                    <img src={logoLightUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                  {uploading === "light" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{ar ? "رفع" : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "light"); e.target.value = ""; }}
                  />
                </label>
                {logoLightUrl && (
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setLogoLightUrl("")}>
                    {ar ? "إزالة" : "Remove"}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ar ? "اتركه فارغاً لاستخدام نفس اللوغو في الوضعين." : "Leave empty to use the same logo in both modes."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>{ar ? "الحجم" : "Size"}</Label>
              <Select value={sizeClass} onValueChange={setSizeClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ar ? "ترتيب العرض" : "Display order"}</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={showOnHome} onCheckedChange={setShowOnHome} id="partner-show" />
              <Label htmlFor="partner-show">{ar ? "إظهار في الرئيسية" : "Show on home"}</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" disabled={saving || uploading !== null}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? (ar ? "حفظ التعديلات" : "Save changes") : (ar ? "إنشاء" : "Create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
