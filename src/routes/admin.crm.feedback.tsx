import { createFileRoute, redirect } from "@tanstack/react-router";

/* Visitor feedback lives on the Chatbot page now. */
export const Route = createFileRoute("/admin/crm/feedback")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/chatbot", search: { tab: undefined } });
  },
});
