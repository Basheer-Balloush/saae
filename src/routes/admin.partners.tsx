import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { PartnersAdmin } from "./admin.index";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/partners")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Partners — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const { lang } = useLang();
  return <PartnersAdmin lang={lang} />;
}
