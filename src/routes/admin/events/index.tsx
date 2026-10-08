import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/auth/admin-route-guard";
import { EventsPage } from "@/features/events/EventsPage";

export const Route = createFileRoute("/admin/events/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Events — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EventsPage,
});
