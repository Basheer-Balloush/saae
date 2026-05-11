import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAmsAuth } from "@/hooks/useAmsAuth";
import { registerAmsServiceWorker } from "@/lib/ams-pwa";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";

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

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir="ltr">
        <Outlet />
      </div>
    );
  }

  if (loading || !user || !hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="ltr">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/attendance-management-system"
            className="flex items-center gap-2 font-semibold"
          >
            <Clock className="h-5 w-5 text-primary" />
            <span>Attendance Management System</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
