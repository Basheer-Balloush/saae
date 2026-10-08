import { createFileRoute } from "@tanstack/react-router";
import { TexpoGame } from "@/features/texpo/TexpoGame";

const TITLE = "العب وتعلّم مع أبو الجود · Texpo 2026 — SAAE";
const DESCRIPTION =
  "7 أسئلة عن الذكاء الاصطناعي في حياتنا اليومية مع أبو الجود. العب واربح كوبون هدية من الجمعية بخصم يصل إلى 50٪.";

export const Route = createFileRoute("/texpo")({
  // The game runs on the device (timer, saved play), so the server sends the shell only.
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { l?: string } => ({
    l: typeof s.l === "string" && s.l.length <= 40 ? s.l : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://www.aisyria.org/mascot/abu-al-joud/celebrate.webp",
      },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#06232a" },
    ],
  }),
  component: TexpoPage,
});

function TexpoPage() {
  const { l } = Route.useSearch();
  return <TexpoGame link={l} />;
}
