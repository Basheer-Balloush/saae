import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { Newspaper, Users, Handshake, Sparkles, FileText, Bot, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Dashboard — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const cards = [
    { title: ar ? "الأخبار" : "News", href: "/admin", icon: Newspaper, desc: ar ? "إدارة الأخبار والمقالات" : "Manage news articles" },
    { title: ar ? "الأعضاء" : "Members", href: "/admin/members", icon: Users, desc: ar ? "مجلس الإدارة والفريق" : "Board & team members" },
    { title: ar ? "الشركاء" : "Partners", href: "/admin/partners", icon: Handshake, desc: ar ? "شعارات الشركاء" : "Partner logos" },
    { title: "CRM — Leads", href: "/admin/crm/leads/individuals", icon: Users, desc: ar ? "الأفراد والشركات" : "Individuals & companies" },
    { title: ar ? "استبيان المبادرة" : "Initiative Survey", href: "/admin/crm/forms/initiative-survey", icon: FileText, desc: ar ? "استجابات المستخدمين" : "User responses" },
    { title: ar ? "استبيان المشاريع" : "Event Survey", href: "/admin/crm/forms/event-survey", icon: FileText, desc: ar ? "استجابات المشاريع" : "Project responses" },
    { title: ar ? "مبادرة المليون" : "Million Initiative", href: "/admin/initiative", icon: Sparkles, desc: ar ? "التبرعات والإعدادات" : "Donations & settings" },
    { title: ar ? "الشات بوت" : "Chatbot", href: "/admin/chatbot", icon: Bot, desc: ar ? "قاعدة المعرفة والمحادثات" : "Knowledge & conversations" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {ar ? "مرحباً بك في لوحة التحكم" : "Welcome to the dashboard"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ar ? "اختر قسماً للبدء" : "Pick a section to get started"}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            to={c.href as any}
            className="group relative flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-foreground">{c.title}</h3>
                <ArrowRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-primary ${ar ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
