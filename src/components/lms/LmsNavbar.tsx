import { Link } from "@tanstack/react-router";
import { GraduationCap, Moon, Sun, Globe, LogOut, BookOpen, LayoutDashboard, Menu, X, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LmsRole } from "@/hooks/useLmsAuth";

type Props = {
  role: LmsRole;
  isAuthed: boolean;
  onSignOut: () => void;
};

export function LmsNavbar({ role, isAuthed, onSignOut }: Props) {
  const { lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const tr = lmsT[lang];
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-soft"
          : "bg-background/40 backdrop-blur-sm",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:px-10">
        <Link
          to="/learning-management-system"
          className="flex items-center gap-2 text-foreground font-bold"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline text-base">{tr.brand}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavItem to="/learning-management-system" label={tr.navHome} />
          <NavItem to="/learning-management-system/catalog" label={tr.navCatalog} />
          <NavItem to="/learning-management-system/verify" label={tr.verifyCertificate} />
          {isAuthed && (
            <NavItem
              to="/learning-management-system/student"
              label={tr.navMyCourses}
              icon={<BookOpen className="h-3.5 w-3.5" />}
            />
          )}
          {isAuthed && (
            <NavItem
              to="/learning-management-system/instructor"
              label={tr.navInstructor}
            />
          )}
          {role === "lms_admin" && (
            <NavItem
              to="/learning-management-system/admin"
              label={tr.navAdmin}
              icon={<LayoutDashboard className="h-3.5 w-3.5" />}
            />
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{lang === "ar" ? "EN" : "AR"}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {isAuthed ? (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4 mx-1" />
              <span className="hidden sm:inline">{tr.signOut}</span>
            </Button>
          ) : (
            <>
              <Link to="/learning-management-system/login">
                <Button variant="ghost" size="sm">{tr.signIn}</Button>
              </Link>
              <Link to="/learning-management-system/signup" className="hidden sm:block">
                <Button size="sm">{tr.signUp}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-muted text-foreground" }}
    >
      {icon}
      {label}
    </Link>
  );
}
