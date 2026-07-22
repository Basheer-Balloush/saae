import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { MembersAdmin, ADMIN_TEXT } from "./admin.index";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/members")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Members — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { lang } = useLang();
  return <MembersAdmin labels={ADMIN_TEXT[lang]} lang={lang} />;
}
