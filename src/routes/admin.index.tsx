import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { Loader2, Pencil, Plus, Trash2, LogOut, Upload, X, Globe } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { z } from "zod";
import {
  COMMUNITY_KEYS,
  COMMUNITY_LABELS_AR,
  COMMUNITY_LABELS_EN,
  type CommunityKey,
} from "@/lib/communityCategories";

const STR = {
  en: {
    backToSite: "← Site",
    adminTitle: "Admin Dashboard",
    signOut: "Sign out",
    news: "News",
    members: "Members",
    allNews: "All news",
    newArticle: "New article",
    cover: "Cover",
    title: "Title",
    category: "Category",
    date: "Date",
    onHome: "On home",
    actions: "Actions",
    noNews: "No news yet. Create your first article.",
    deleteNewsConfirm: "Delete this news item?",
    deleted: "Deleted",
    editNews: "Edit news",
    newNewsArticle: "New news article",
    titleEnL

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }] }),
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
  category: z.enum(COMMUNITY_KEYS),
  published_at: z.string().min(1),
  show_on_home: z.boolean(),
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { t, toggle: toggleLang } = useLang();
  const [items, setItems] = useState<NewsRow[]>([]);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"news" | "members">("news");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/admin/login" });
      else if (!isAdmin) {
        toast.error("You don't have admin access.");
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
        if (error) toast.error(error.message);
        else setItems((data ?? []) as NewsRow[]);
      });
  }, [isAdmin, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this news item?")) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refresh();
    }
  };

  const toggleHome = async (row: NewsRow, value: boolean) => {
    const { error } = await supabase.from("news").update({ show_on_home: value }).eq("id", row.id);
    if (error) toast.error(error.message);
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
    <div className="min-h-screen bg-background" dir="ltr">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              ← Site
            </Link>
            <h1 className="mt-1 text-xl font-bold text-foreground">News Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" /> {t.nav.langToggle}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("news")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "news" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            News
          </button>
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "members" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Members
          </button>
        </div>

        {tab === "news" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">All news ({items.length})</h2>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> New article
              </Button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Cover</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">On home</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No news yet. Create your first article.
                      </td>
                    </tr>
                  )}
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {row.image_url ? (
                          <img src={row.image_url} alt="" className="h-12 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-16 rounded bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.title_en || row.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {COMMUNITY_LABELS_EN[row.category as CommunityKey] ?? row.category}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.published_at}</td>
                      <td className="px-4 py-3">
                        <Switch checked={row.show_on_home} onCheckedChange={(v) => toggleHome(row, v)} />
                      </td>
                      <td className="px-4 py-3 text-right">
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
        ) : (
          <MembersAdmin />
        )}
      </main>

      {showForm && (
        <NewsForm
          initial={editing}
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

async function uploadToBucket(file: File, kind: "image" | "video"): Promise<string> {
  const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
  const path = `${kind}s/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("news-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("news-images").getPublicUrl(path);
  return data.publicUrl;
}

function NewsForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: NewsRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleAr, setTitleAr] = useState(initial?.title_ar ?? initial?.title ?? "");
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? initial?.title ?? "");
  const [excerptAr, setExcerptAr] = useState(initial?.excerpt_ar ?? initial?.excerpt ?? "");
  const [excerptEn, setExcerptEn] = useState(initial?.excerpt_en ?? initial?.excerpt ?? "");
  const [contentAr, setContentAr] = useState(initial?.content_ar ?? initial?.content ?? "");
  const [contentEn, setContentEn] = useState(initial?.content_en ?? initial?.content ?? "");
  const [category, setCategory] = useState<CommunityKey>(
    (initial?.category as CommunityKey) ?? "data",
  );
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
      toast.success("Cover uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
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
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
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
      toast.success(`${urls.length} video(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
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
      category,
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
        category: parsed.data.category,
        published_at: parsed.data.published_at,
        show_on_home: parsed.data.show_on_home,
        image_url: imageUrl || null,
        images,
        videos,
      };
      if (initial) {
        const { error } = await supabase.from("news").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("news").insert(payload);
        if (error) throw error;
        toast.success("Created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="ltr">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {initial ? "Edit news" : "New news article"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title_en">Title (English)</Label>
              <Input id="title_en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required maxLength={200} />
            </div>
            <div dir="rtl">
              <Label htmlFor="title_ar">العنوان (عربي)</Label>
              <Input id="title_ar" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required maxLength={200} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="excerpt_en">Excerpt (English)</Label>
              <Textarea id="excerpt_en" value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} maxLength={500} rows={3} />
            </div>
            <div dir="rtl">
              <Label htmlFor="excerpt_ar">المقتطف (عربي)</Label>
              <Textarea id="excerpt_ar" value={excerptAr} onChange={(e) => setExcerptAr(e.target.value)} maxLength={500} rows={3} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="content_en">Full content (English)</Label>
              <Textarea id="content_en" value={contentEn} onChange={(e) => setContentEn(e.target.value)} rows={10} />
            </div>
            <div dir="rtl">
              <Label htmlFor="content_ar">النص الكامل (عربي)</Label>
              <Textarea id="content_ar" value={contentAr} onChange={(e) => setContentAr(e.target.value)} rows={10} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Community (category)</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CommunityKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITY_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {COMMUNITY_LABELS_EN[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="mt-2 flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-20 w-28 rounded object-cover" />
              ) : (
                <div className="h-20 w-28 rounded bg-muted" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload cover"}
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
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <Label>Gallery images (carousel)</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={url} className="relative h-20 w-28">
                  <img src={url} alt="" className="h-full w-full rounded object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="inline-flex h-20 w-28 cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-input text-xs font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                Add
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
            <Label>Videos</Label>
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
                    Remove
                  </button>
                </div>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload video(s)"}
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
              <p className="text-sm font-medium text-foreground">Show on home page</p>
              <p className="text-xs text-muted-foreground">Appears in the homepage news carousel.</p>
            </div>
            <Switch checked={showOnHome} onCheckedChange={setShowOnHome} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? "Save changes" : "Create"}
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

function MembersAdmin() {
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
        if (error) toast.error(error.message);
        else setList((data ?? []) as MemberRow[]);
      });
  }, [bump]);

  const remove = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setBump((k) => k + 1); }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Members ({list.length})</h2>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New member
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No members yet.
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
                <td className="px-4 py-3 font-medium text-foreground">{m.full_name_en || m.full_name_ar}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.position_en || m.position_ar}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{m.category}</td>
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
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setBump((k) => k + 1); }}
        />
      )}
    </>
  );
}

function MemberForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: MemberRow | null;
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
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !posAr.trim()) {
      toast.error("Arabic name and position are required");
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
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
        toast.success("Created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="ltr">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {initial ? "Edit member" : "New member"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "board" | "executive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Board of Directors</SelectItem>
                  <SelectItem value="executive">Executive Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order">Display order</Label>
              <Input id="order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name_en">Name (English)</Label>
              <Input id="name_en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={120} />
            </div>
            <div dir="rtl">
              <Label htmlFor="name_ar">الاسم (عربي)</Label>
              <Input id="name_ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required maxLength={120} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pos_en">Position (English)</Label>
              <Input id="pos_en" value={posEn} onChange={(e) => setPosEn(e.target.value)} maxLength={120} />
            </div>
            <div dir="rtl">
              <Label htmlFor="pos_ar">المنصب (عربي)</Label>
              <Input id="pos_ar" value={posAr} onChange={(e) => setPosAr(e.target.value)} required maxLength={120} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bio_en">Bio (English)</Label>
              <Textarea id="bio_en" value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={4} maxLength={1000} />
            </div>
            <div dir="rtl">
              <Label htmlFor="bio_ar">نبذة (عربي)</Label>
              <Textarea id="bio_ar" value={bioAr} onChange={(e) => setBioAr(e.target.value)} rows={4} maxLength={1000} />
            </div>
          </div>

          <div>
            <Label>Photo</Label>
            <div className="mt-2 flex items-center gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload photo"}
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
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
