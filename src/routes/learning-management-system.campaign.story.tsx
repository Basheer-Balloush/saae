import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Download, Instagram, Share2 } from "lucide-react";
import storyAsset from "@/assets/saae-story-campaign.jpg.asset.json";

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
  },
} as const;

function CampaignStory() {
  const { lang } = useLang();
  const t = copy[lang];
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [shared, setShared] = useState(false);

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

        <Button asChild className="mt-6 w-full">
          <a href={storyAsset.url} download="saae-story.jpg">
            <Download className="h-4 w-4 mx-2" />
            {t.save}
          </a>
        </Button>
      </div>
    </div>
  );
}
