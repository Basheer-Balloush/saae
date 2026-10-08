import { createFileRoute, notFound } from "@tanstack/react-router";
import { resolvePublishedEvent } from "@/features/events/lib/events.functions";
import { PublicEventPage } from "@/features/events/PublicEventPage";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.slug) ||
      params.slug.length < 2 ||
      params.slug.length > 80
    )
      throw notFound();
    const event = await resolvePublishedEvent({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return event;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title_en ?? "Event"} — SAAE` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  return <PublicEventPage event={Route.useLoaderData()} />;
}
