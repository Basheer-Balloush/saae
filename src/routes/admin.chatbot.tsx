import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { AdminChatbotSection } from "@/components/admin/AdminChatbotSection";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/chatbot")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Chatbot — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChatbotPage,
});

function ChatbotPage() {
  const { lang } = useLang();
  return <AdminChatbotSection lang={lang} />;
}
