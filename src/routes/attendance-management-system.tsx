import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAmsAuth } from "@/hooks/useAmsAuth";
import { registerAmsServiceWorker } from "@/lib/ams-pwa";
import { AmsNavbar } from "@/components/ams/AmsNavbar";
import { AmsInstallButton } from "@/components/ams/AmsInstallButton";
import { AmsFooter } from "@/components/ams/AmsFooter";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";

export const Route = createFileRoute("/attendance-management-system")({
  head: () => ({
    meta: [
      { title: "Attendance Management System — SAAE" },
      {
        name: "description",
        content:
          "Internal attendance management system for SAAE staff and members to track presence, sessions, and reports.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { name: "theme-color", content: "#1d4ed8" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AMS" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "Attendance Management System — SAAE" },
      {
        property: "og:description",
        content:
          "Internal attendance tool for SAAE staff to track sessions, registrants and reports.",
      },
      { property: "og:url", content: "https://aisyria.org/attendance-management-system" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/attendance-management-system" },
      { rel: "manifest", href: "/ams-manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/ams-icon-192.png" },
    ],
  }),
  component: AmsLayout,
});

function AmsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasAccess, loading } = useAmsAuth();
  const { lang } = useLang();
  const tr = amsT[lang];

  const isLoginPage = location.pathname.endsWith("/login");

  useEffect(() => {
    registerAmsServiceWorker();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isLoginPage && (!user || !hasAccess)) {
      navigate({ to: "/attendance-management-system/login" });
    }
  }, [loading, user, hasAccess, isLoginPage, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/attendance-management-system/login" });
  };

  const showSignOut = !isLoginPage && !!user && hasAccess;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AmsNavbar
        onSignOut={handleSignOut}
        showSignOut={showSignOut}
        extra={
          <>
            {showSignOut && <DashboardLink />}
            <AmsInstallButton />
          </>
        }
      />
      <div className="flex-1 pt-20 flex flex-col">
        {isLoginPage ? (
          <Outlet />
        ) : loading || !user || !hasAccess ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm text-muted-foreground">{tr.loading}</div>
          </div>
        ) : (
          <main className="flex-1">
            <Outlet />
          </main>
        )}
      </div>
      <AmsFooter />
    </div>
  );
}

/** Back to the console: the admin home for admins, the workspace for instructors. */
function DashboardLink() {
  const { role } = useLmsAuth();
  const { lang } = useLang();
  const admin = role === "admin";
  return (
    <Link
      to={admin ? "/admin" : "/learning-management-system/instructor"}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#048090] px-3 text-xs font-bold text-white transition-colors hover:bg-[#05909f]"
      aria-label={lang === "ar" ? "لوحة التحكم" : "Dashboard"}
    >
      <LayoutDashboard className="h-4 w-4" />
      <span className="hidden min-[400px]:inline">
        {lang === "ar" ? "لوحة التحكم" : "Dashboard"}
      </span>
    </Link>
  );
}
