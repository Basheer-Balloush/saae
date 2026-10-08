// Legacy URL: Texpo is now one event in the Events dashboard.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { TEXPO_EVENT_ID } from "@/features/events/lib/events";
import { requireAdminBeforeLoad } from "@/lib/auth/admin-route-guard";

export const Route = createFileRoute("/admin/crm/texpo")({
  ssr: false,
  beforeLoad: async () => {
    await requireAdminBeforeLoad();
    throw redirect({ to: "/admin/events/$id", params: { id: TEXPO_EVENT_ID }, replace: true });
  },
});
