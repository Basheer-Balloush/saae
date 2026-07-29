import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
    sub: "احفظ الصورة وشاركها في ستوري إنستغرام.",
    save: "حفظ الصورة",
    alt: "صورة ستوري فعالية سآء",
  },
  en: {
    heading: "Campaign Story image",
    sub: "Save the image and share it to your Instagram Story.",
    save: "Save the image",
    alt: "SAAE event Story image",
  },
} as const;

function CampaignStory() {
  const { lang } = useLang();
  const t = copy[lang];

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
