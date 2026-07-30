import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Megaphone, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toUserMessage } from "@/lib/safe-error";

const CAMPAIGN_SLUG = "gen-ai-event-2026-07-31";

export const Route = createFileRoute("/learning-management-system/admin/campaign")({
  head: () => ({
    meta: [{ title: "Training & Learning Platform Admin · Story campaign" }],
  }),
  component: AdminCampaign,
});

type Campaign = {
  id: string;
  slug: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  title_ar: string;
  title_en: string;
  story_image_url: string | null;
  instagram_handle: string;
  course_ref: string | null;
  post_share_destination: string | null;
  allow_download_fallback: boolean;
};

// <input type="datetime-local"> works in local time without a zone suffix.
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

function AdminCampaign() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("lms_story_campaigns")
      .select(
        "id, slug, active, starts_at, ends_at, title_ar, title_en, story_image_url, instagram_handle, course_ref, post_share_destination, allow_download_fallback",
      )
      .eq("slug", CAMPAIGN_SLUG)
      .maybeSingle();
    if (err) setError(toUserMessage(err));
    else setCampaign((data as Campaign) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof Campaign>(key: K, value: Campaign[K]) =>
    setCampaign((c) => (c ? { ...c, [key]: value } : c));

  const save = async () => {
    if (!campaign || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: err } = await supabase
      .from("lms_story_campaigns")
      .update({
        active: campaign.active,
        starts_at: campaign.starts_at,
        ends_at: campaign.ends_at,
        title_ar: campaign.title_ar.trim(),
        title_en: campaign.title_en.trim(),
        story_image_url: campaign.story_image_url?.trim() || null,
        instagram_handle: campaign.instagram_handle.trim(),
        course_ref: campaign.course_ref?.trim() || null,
        post_share_destination: campaign.post_share_destination?.trim() || null,
        allow_download_fallback: campaign.allow_download_fallback,
      })
      .eq("id", campaign.id);
    if (err) setError(toUserMessage(err));
    else setSaved(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <p className="text-center py-20 text-muted-foreground">
        {ar ? "جارٍ التحميل..." : "Loading..."}
      </p>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">
          {ar ? "لا توجد حملة معرّفة." : "No campaign configured."}
        </p>
        <Button variant="outline" className="mt-4" onClick={load}>
          {ar ? "إعادة المحاولة" : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="h-7 w-7 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">
          {ar ? "حملة الستوري" : "Story campaign"}
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="active">{ar ? "الحملة مفعّلة" : "Campaign active"}</Label>
          <Switch id="active" checked={campaign.active} onCheckedChange={(v) => set("active", v)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="starts">{ar ? "تبدأ في" : "Starts at"}</Label>
            <Input
              id="starts"
              type="datetime-local"
              value={toLocalInput(campaign.starts_at)}
              onChange={(e) => set("starts_at", fromLocalInput(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ends">{ar ? "تنتهي في" : "Ends at"}</Label>
            <Input
              id="ends"
              type="datetime-local"
              value={toLocalInput(campaign.ends_at)}
              onChange={(e) => set("ends_at", fromLocalInput(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title_ar">{ar ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
            <Input
              id="title_ar"
              dir="rtl"
              value={campaign.title_ar}
              onChange={(e) => set("title_ar", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title_en">{ar ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
            <Input
              id="title_en"
              dir="ltr"
              value={campaign.title_en}
              onChange={(e) => set("title_en", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="image">{ar ? "رابط صورة الستوري" : "Story image URL"}</Label>
          <Input
            id="image"
            dir="ltr"
            placeholder="https://…"
            value={campaign.story_image_url ?? ""}
            onChange={(e) => set("story_image_url", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="handle">{ar ? "حساب إنستغرام" : "Instagram handle"}</Label>
            <Input
              id="handle"
              dir="ltr"
              value={campaign.instagram_handle}
              onChange={(e) => set("instagram_handle", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course">{ar ? "الدورة المرتبطة" : "Assigned course"}</Label>
            <select
              id="course"
              dir={ar ? "rtl" : "ltr"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={courses.some((c) => c.id === campaign.course_ref) ? campaign.course_ref! : ""}
              onChange={(e) => set("course_ref", e.target.value || null)}
            >
              <option value="">{ar ? "— بدون دورة —" : "— No course —"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {(ar ? c.title_ar : c.title_en || c.title_ar) || c.slug} ({c.slug})
                </option>
              ))}
            </select>
            {campaign.course_ref && !courses.some((c) => c.id === campaign.course_ref) && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {ar ? "القيمة المحفوظة حالياً: " : "Currently stored value: "}
                {campaign.course_ref}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dest">{ar ? "الوجهة بعد المشاركة" : "Destination after sharing"}</Label>
          <Input
            id="dest"
            dir="ltr"
            placeholder="/learning-management-system/student"
            value={campaign.post_share_destination ?? ""}
            onChange={(e) => set("post_share_destination", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="fallback">
            {ar ? "السماح بتحميل الصورة كبديل" : "Allow download fallback"}
          </Label>
          <Switch
            id="fallback"
            checked={campaign.allow_download_fallback}
            onCheckedChange={(v) => set("allow_download_fallback", v)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && <p className="text-sm text-primary">{ar ? "تم الحفظ" : "Saved"}</p>}

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="h-4 w-4 mx-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mx-2" />
          )}
          {ar ? "حفظ التغييرات" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
