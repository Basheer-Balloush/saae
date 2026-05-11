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
import { Loader2, Pencil, Plus, Trash2, LogOut, Upload, X } from "lucide-react";
import { z } from "zod";
import {
  COMMUNITY_KEYS,
  COMMUNITY_LABELS_EN,
  type CommunityKey,
} from "@/lib/communityCategories";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }] }),
  component: AdminDashboard,
});

type NewsRow = {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
  show_on_home: boolean;
};

const newsSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.enum(COMMUNITY_KEYS),
  published_at: z.string().min(1),
  show_on_home: z.boolean(),
  image_url: z.string().url().optional().or(z.literal("")),
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [items, setItems] = useState<NewsRow[]>([]);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        else setItems(data ?? []);
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
                  <td className="px-4 py-3 font-medium text-foreground">{row.title}</td>
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

function NewsForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: NewsRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [category, setCategory] = useState<CommunityKey>(
    (initial?.category as CommunityKey) ?? "data",
  );
  const [publishedAt, setPublishedAt] = useState(
    initial?.published_at ?? new Date().toISOString().slice(0, 10),
  );
  const [showOnHome, setShowOnHome] = useState(initial?.show_on_home ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("news-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newsSchema.safeParse({
      title,
      excerpt,
      category,
      published_at: publishedAt,
      show_on_home: showOnHome,
      image_url: imageUrl,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: parsed.data.title,
        excerpt: parsed.data.excerpt || null,
        category: parsed.data.category,
        published_at: parsed.data.published_at,
        show_on_home: parsed.data.show_on_home,
        image_url: parsed.data.image_url || null,
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {initial ? "Edit news" : "New news article"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={500} rows={3} />
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
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
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
