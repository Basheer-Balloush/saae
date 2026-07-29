import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { Button } from "@/components/ui/button";
import { Download, Instagram, Loader2, Share2 } from "lucide-react";
import storyAsset from "@/assets/saae-story-campaign.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { courseDestination } from "@/lib/lms-course-destination";
import { safeLmsRedirect } from "@/lib/lms-redirect";

const CAMPAIGN_SLUG = "gen-ai-event-2026-07-31";
const DEFAULT_DESTINATION = "/learning-management-system/student";
const STORY_PATH = "/learning-management-system/campaign/story";


export const Route = createFileRoute("/learning-management-system/campaign/story")({
  head: () => ({
    meta: [
      { title: "Share the Event Story · SAAE Campaign" },
      {
        name: "description",
        content:
          "Download the SAAE event Story image and share it to unlock the free Generative AI course.",
      },
      { property: "og:title", content: "Share the Event Story · SAAE Campaign" },
      {
        property: "og:description",
        content: "Share the SAAE event Story image and unlock the free course.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignStory,
});

const copy = {
  ar: {
    heading: "صورة الحملة",
    sub: "أضف الصورة إلى ستوري إنستغرام لتحصل على الدورة مجاناً.",
    share: "أضِف إلى الستوري",
    sharing: "جارٍ التحضير…",
    save: "حفظ الصورة",
    openInstagram: "فتح إنستغرام",
    alt: "صورة ستوري فعالية سآء",
    manual:
      "المشاركة المباشرة غير متاحة على هذا الجهاز. احفظ الصورة ثم افتح إنستغرام وأضفها إلى الستوري.",
    done: "تمت المشاركة! تابع للحصول على الدورة.",
    claim: "لقد شاركت الصورة — تابع إلى الدورة",
    claiming: "جارٍ تفعيل الدورة…",
    claimError: "تعذّر تفعيل الدورة الآن. حاول مرة أخرى.",
    unavailable: "الحملة غير متاحة حالياً.",
  },
  en: {
    heading: "Campaign Story image",
    sub: "Add the image to your Instagram Story to unlock the free course.",
    share: "Add to your Story",
    sharing: "Preparing…",
    save: "Save the image",
    openInstagram: "Open Instagram",
    alt: "SAAE event Story image",
    manual:
      "Direct sharing isn't available on this device. Save the image, then open Instagram and add it to your Story.",
    done: "Shared! Continue to get your course.",
    claim: "I shared it — continue to my course",
    claiming: "Unlocking your course…",
    claimError: "We couldn't unlock the course right now. Please try again.",
    unavailable: "This campaign isn't available right now.",
  },
} as const;

function CampaignStory() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = copy[lang];
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [shared, setShared] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleShare = async () => {
    setBusy(true);
    try {
      const res = await fetch(storyAsset.url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const file = new File([blob], "saae-story.jpg", {
        type: blob.type || "image/jpeg",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
        setShared(true);
        setManual(false);
        return;
      }
      setManual(true);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setManual(true);
    } finally {
      setBusy(false);
    }
  };

  // Idempotent: grants the free campaign course (if configured) and routes onward.
  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const { data, error } = await supabase.rpc("lms_claim_story_campaign", {
        _slug: CAMPAIGN_SLUG,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("empty");

      if (row.status === "campaign_unavailable") {
        setClaimError(t.unavailable);
        return;
      }

      if (row.course_id) {
        const dest = courseDestination(row.course_id, row.delivery_mode);
        navigate(dest);
        return;
      }

      navigate({
        to: safeLmsRedirect(row.destination) ?? DEFAULT_DESTINATION,
      });
    } catch {
      setClaimError(t.claimError);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-foreground">{t.heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>

        <img
          src={storyAsset.url}
          alt={t.alt}
          width={1080}
          height={1920}
          className="mt-6 w-full aspect-[9/16] object-cover rounded-2xl border border-border shadow-soft"
        />

        <Button className="mt-6 w-full" onClick={handleShare} disabled={busy}>
          <Share2 className="h-4 w-4 mx-2" />
          {busy ? t.sharing : t.share}
        </Button>

        {shared && <p className="mt-3 text-sm font-medium text-primary">{t.done}</p>}

        {manual && <p className="mt-3 text-sm text-muted-foreground">{t.manual}</p>}

        <div className="mt-3 grid gap-2">
          <Button asChild variant="outline" className="w-full">
            <a href={storyAsset.url} download="saae-story.jpg">
              <Download className="h-4 w-4 mx-2" />
              {t.save}
            </a>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
              <Instagram className="h-4 w-4 mx-2" />
              {t.openInstagram}
            </a>
          </Button>
        </div>

        <Button
          variant={shared ? "default" : "secondary"}
          className="mt-6 w-full"
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming && <Loader2 className="h-4 w-4 mx-2 animate-spin" />}
          {claiming ? t.claiming : t.claim}
        </Button>

        {claimError && <p className="mt-3 text-sm text-destructive">{claimError}</p>}
      </div>
    </div>
  );
}
