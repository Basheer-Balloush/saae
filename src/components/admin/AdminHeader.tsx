import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Globe, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";

const TITLES: Record<string, { ar: string; en: string }> = {
  "/admin": { ar: "الأخبار", en: "News" },
  "/admin/dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "/admin/members": { ar: "الأعضاء", en: "Members" },
  "/admin/partners": { ar: "الشركاء", en: "Partners" },
  "/admin/chatbot": { ar: "الشات بوت", en: "Chatbot" },
  "/admin/initiative": { ar: "مبادرة المليون", en: "Million Initiative" },
  "/admin/initiative-survey": { ar: "استبيان المبادرة", en: "Initiative Survey" },
  "/admin/event-survey": { ar: "استبيان المشاريع", en: "Event Survey" },
};

export function AdminHeader() {
  const { user } = useAuth();
  const { lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title =
    TITLES[pathname]?.[lang] ??
    (lang === "ar" ? "لوحة الإدارة" : "Admin");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">
        {title}
      </h1>
      <div className="ms-auto flex items-center gap-2">
        <Link
          to="/"
          className="hidden text-xs uppercase tracking-wider text-muted-foreground hover:text-primary sm:inline"
        >
          {lang === "ar" ? "الموقع ←" : "← Site"}
        </Link>
        <Button variant="ghost" size="sm" onClick={toggleLang} aria-label="Toggle language">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === "ar" ? "English" : "العربية"}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        {user?.email && (
          <div className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:block">
            {user.email}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/admin/login" });
          }}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === "ar" ? "خروج" : "Sign out"}</span>
        </Button>
      </div>
    </header>
  );
}
