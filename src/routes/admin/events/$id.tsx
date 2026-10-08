import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/auth/admin-route-guard";
import { EventDetail } from "@/features/events/EventDetail";

export const Route = createFileRoute("/admin/events/$id")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Event — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <EventDetail key={id} id={id} />;
}
