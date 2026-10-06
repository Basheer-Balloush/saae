import { Link, useLocation } from "@tanstack/react-router";
import { Gamepad2, Link2, type LucideIcon } from "lucide-react";
import { useT } from "@/components/console/ui";

/* The console's "Events" item: every tool used at an event or a booth, one tab
   each. Each tab is its own page, so old links keep working. */
const TABS: { to: string; ar: string; en: string; icon: LucideIcon }[] = [
  { to: "/admin/crm/registration-links", ar: "روابط التسجيل", en: "Sign-up links", icon: Link2 },
  { to: "/admin/crm/texpo", ar: "لعبة تكسبو", en: "Texpo game", icon: Gamepad2 },
];

export function EventsTabs() {
  const { t } = useT();
  const pathname = useLocation({ select: (l) => l.pathname.replace(/\/+$/, "") });
  return (
    <nav className="cx-tabs mb-6" aria-label={t("أدوات الفعاليات", "Event tools")}>
      {TABS.map(({ to, ar, en, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to as never}
            className="cx-tab"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            {t(ar, en)}
          </Link>
        );
      })}
    </nav>
  );
}
