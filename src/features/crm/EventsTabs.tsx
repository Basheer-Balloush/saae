import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Link2, type LucideIcon } from "lucide-react";
import { useT } from "@/components/console/ui";

/* Legacy sign-up link management remains accessible from Events. */
const TABS: { to: string; ar: string; en: string; icon: LucideIcon }[] = [
  { to: "/admin/crm/registration-links", ar: "روابط التسجيل", en: "Sign-up links", icon: Link2 },
  { to: "/admin/events", ar: "كل الفعاليات", en: "All events", icon: CalendarDays },
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
