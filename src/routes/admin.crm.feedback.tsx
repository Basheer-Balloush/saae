import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { ChatFeedbackPanel } from "@/components/admin/ChatFeedbackPanel";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/crm/feedback")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Feedback — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { lang } = useLang();
  return <ChatFeedbackPanel lang={lang === "ar" ? "ar" : "en"} />;
}
