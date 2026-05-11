import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAmsAuth } from "@/hooks/useAmsAuth";
import { registerAmsServiceWorker } from "@/lib/ams-pwa";
import { AmsNavbar } from "@/components/ams/AmsNavbar";
import { AmsInstallButton } from "@/components/ams/AmsInstallButton";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";

export const Route = createFileRoute("/attendance-management-system")({
  head: () => ({
    meta: [
      { title: "Attendance Management System" },
      { name: "description", content: "Attendance management system." },
      { name: "theme-color", content: "#1d4ed8" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "AMS" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
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
    <div className="min-h-screen bg-background text-foreground">
      <AmsNavbar
        onSignOut={handleSignOut}
        showSignOut={showSignOut}
        extra={<AmsInstallButton />}
      />
      <div className="pt-20">
        {isLoginPage ? (
          <Outlet />
        ) : loading || !user || !hasAccess ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm text-muted-foreground">{tr.loading}</div>
          </div>
        ) : (
          <main>
            <Outlet />
          </main>
        )}
      </div>
    </div>
  );
}
