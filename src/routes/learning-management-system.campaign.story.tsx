import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

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

function CampaignStory() {
  const { lang } = useLang();
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
      <p className="text-muted-foreground">
        {lang === "ar"
          ? "صورة الحملة ستتوفر قريباً."
          : "The campaign image will be available soon."}
      </p>
    </div>
  );
}
