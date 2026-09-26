import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ExternalLink, Languages, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { NAV, SYSTEM_ENTRY, isNavActive, systemForPath, type NavItem } from "./nav";
import { useConsoleCounts, type ConsoleCounts } from "./useConsoleCounts";
import "./console.css";

/* The one frame around every management page: CMS, LMS admin, the
   instructor workspace and the AMS dashboard. The system and its menu come
   from the address, so each layout only has to wrap its outlet. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { lang, dir, toggle } = useLang();
  const ar = lang === "ar";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const isAdmin = role === "admin";
  const system = systemForPath(pathname, isAdmin);
  const { data: counts } = useConsoleCounts(isAdmin);
  const [open, setOpen] = useState(false);

  // Close the phone drawer after every navigation.
  useEffect(() => setOpen(false), [pathname]);

  useConsoleRoot();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: isAdmin ? "/admin/login" : "/learning-management-system/login" });
  };

  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";
  const badge = (item: NavItem) => {
    if (!item.count || !counts) return 0;
    const keys = Array.isArray(item.count) ? item.count : [item.count];
    return keys.reduce((sum, k) => sum + (counts[k as keyof ConsoleCounts] ?? 0), 0);
  };
  const title =
    system === "instructor"
      ? ar
        ? "مساحة المدرّب"
        : "Instructor workspace"
      : ar
        ? "لوحة الإدارة"
        : "Admin console";

  return (
    <div className="cx" dir={dir} data-nav-open={open}>
      <ConsoleAmbient />
      <aside className="cx-side" aria-label={ar ? "القائمة الرئيسية" : "Main menu"}>
        <Link
          to={isAdmin ? "/admin" : "/learning-management-system/instructor"}
          className="cx-brand"
        >
          <span className="cx-brand-tree" aria-hidden="true" />
          <span>
            <span className="cx-brand-name">SAAE</span>
            <span className="cx-brand-sub">{title}</span>
          </span>
        </Link>

        {isAdmin && (
          <nav className="cx-switch" aria-label={ar ? "الأنظمة" : "Systems"}>
            {(["cms", "lms", "ams"] as const).map((key) => {
              const s = SYSTEM_ENTRY[key];
              const Icon = s.icon;
              return (
                <Link key={key} to={s.to as never} data-active={system === key}>
                  <Icon />
                  {ar ? s.ar : s.en}
                </Link>
              );
            })}
          </nav>
        )}

        <nav className="cx-nav">
          {NAV[system].map((group, gi) => (
            <div key={gi} className={gi ? "cx-nav-group" : ""}>
              {group.en && <div className="cx-nav-label">{ar ? group.ar : group.en}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const n = badge(item);
                return (
                  <Link
                    key={item.to + item.en}
                    to={item.to as never}
                    data-active={isNavActive(item, pathname)}
                  >
                    <Icon />
                    <span className="truncate">{ar ? item.ar : item.en}</span>
                    {n > 0 && <span className="cx-nav-count">{n}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="cx-side-foot">
          {user && (
            <div className="cx-user">
              <span className="cx-avatar" aria-hidden="true">
                {(name || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="cx-user-name block truncate">{name}</span>
                <span className="cx-user-mail block truncate">{user.email}</span>
              </span>
            </div>
          )}
          <div className="cx-side-actions">
            <button type="button" onClick={toggle} title={ar ? "English" : "العربية"}>
              <Languages />
              {ar ? "EN" : "ع"}
            </button>
            <a
              href={isAdmin ? "/" : "/learning-management-system"}
              target="_blank"
              rel="noreferrer"
              title={ar ? "عرض الموقع" : "View site"}
            >
              <ExternalLink />
              {ar ? "الموقع" : "Site"}
            </a>
            <button type="button" onClick={signOut} title={ar ? "تسجيل الخروج" : "Sign out"}>
              <LogOut />
              {ar ? "خروج" : "Out"}
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="cx-scrim"
        aria-label={ar ? "إغلاق القائمة" : "Close menu"}
        onClick={() => setOpen(false)}
      />

      <div className="cx-main">
        <div className="cx-topbar">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={ar ? "القائمة" : "Menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="cx-brand-tree" style={{ width: 24, height: 26 }} aria-hidden="true" />
          <span className="text-[15px] font-bold text-white">{title}</span>
        </div>
        <main className="cx-content">{children}</main>
      </div>
    </div>
  );
}

/** Dialogs and sheets render outside the console frame, so the dark palette
    goes on <html> while a console page is open. Moving between systems
    unmounts one frame and mounts another, sometimes in a later commit, so
    the class is counted and only removed once no frame has come back. */
let consoleFrames = 0;
export function useConsoleRoot() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    consoleFrames++;
    root.classList.add("cx-dark", "dark");
    return () => {
      consoleFrames--;
      window.setTimeout(() => {
        if (consoleFrames > 0) return;
        root.classList.remove("cx-dark");
        // The site keeps its own light/dark choice.
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("saae-theme");
        } catch {
          /* storage blocked */
        }
        if (saved !== "dark") root.classList.remove("dark");
      }, 400);
    };
  }, []);
}

/** The site's ground (grade, glow, vignette, grain, tree) behind console pages. */
export function ConsoleAmbient() {
  return (
    <div className="cx-ambient" aria-hidden="true">
      <span className="a1" />
      <span className="a2" />
      <i />
    </div>
  );
}
