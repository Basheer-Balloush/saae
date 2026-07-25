import { Link } from "@tanstack/react-router";
import { Menu, X, Moon, Sun, Globe, LogOut, BookOpen, LayoutDashboard, ShieldCheck, GraduationCap, ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { lmsT } from "@/lib/lms-i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LmsRole } from "@/hooks/useLmsAuth";
import logo from "@/assets/saae-logo-horizontal.png";
import logoEnLight from "@/assets/saae-logo-en-light.png";
import logoEnDark from "@/assets/saae-logo-en-dark.png";
import logoArDark from "@/assets/saae-logo-ar-dark.png";
import logoArLight from "@/assets/saae-logo-ar-light.png";

type Props = {
  role: LmsRole;
  isAuthed: boolean;
  onSignOut: () => void;
};

type NavLink = { to: string; label: string; icon?: React.ReactNode };

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
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links: NavLink[] = [];
  if (isAuthed) {
    links.push({ to: "/learning-management-system/profile", label: tr.navProfile });
  } else {
    links.push({ to: "/learning-management-system", label: tr.navHome });
  }
  links.push(
    { to: "/learning-management-system/catalog", label: tr.navCatalog },
    { to: "/learning-management-system/internships", label: lmsInternshipsT[lang].navInternships },
    { to: "/learning-management-system/verify", label: tr.verifyCertificate },
  );

  if (isAuthed) {
    links.push({ to: "/learning-management-system/student", label: tr.navMyCourses });
  }
  if (role === "lms_instructor" || role === "lms_admin") {
    links.push({ to: "/learning-management-system/instructor", label: tr.navInstructor });
  }
  if (role === "lms_admin") {
    links.push({ to: "/learning-management-system/admin", label: tr.navAdmin, icon: <LayoutDashboard className="h-3.5 w-3.5" /> });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-soft"
          : "bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between gap-6 px-6 py-3 lg:px-10">
        {/* Logo: SAAE variants like the main site */}
        <Link
          to="/learning-management-system"
          className="relative flex items-center gap-3"
          aria-label="SAAE Training and Learning Platform"
        >
          {(() => {
            const isEnLight = lang === "en" && theme === "light";
            const isEnDark = lang === "en" && theme === "dark";
            const isArDark = lang === "ar" && theme === "dark";
            const isArLight = lang === "ar" && theme === "light";
            const variants = [
              { src: logoEnLight, show: isEnLight, alt: "SAAE — Training and Learning Platform" },
              { src: logoEnDark, show: isEnDark, alt: "SAAE — Training and Learning Platform" },
              { src: logoArDark, show: isArDark, alt: "منصّة التدريب والتعلّم — SAAE" },
              { src: logoArLight, show: isArLight, alt: "منصّة التدريب والتعلّم — SAAE" },
              { src: logo, show: !(isEnLight || isEnDark || isArDark || isArLight), alt: "SAAE" },
            ];
            return variants.map((v, i) => (
              <img
                key={i}
                src={v.src}
                alt={v.alt}
                className={cn(
                  "h-10 w-auto sm:h-11 transition-opacity duration-150",
                  v.show ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none",
                )}
                fetchPriority="high"
                decoding="async"
              />
            ));
          })()}
        </Link>

        {/* Desktop nav with animated underline */}
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to + l.label}
              to={l.to}
              className="group relative inline-flex items-center gap-1.5 text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
              activeProps={{ className: "!text-secondary [&_.lms-underline]:scale-x-100" }}
              activeOptions={{ exact: l.to === "/learning-management-system" }}
            >
              {l.icon}
              {l.label}
              <span className="lms-underline pointer-events-none absolute -bottom-1.5 left-0 right-0 h-0.5 origin-center scale-x-0 rounded-full bg-secondary transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        {/* Right cluster: lang / theme / auth / mobile menu */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label={lang === "ar" ? "العودة للموقع" : "Back to site"}
          >
            {lang === "ar" ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
            <span>{lang === "ar" ? "الموقع" : "Site"}</span>
          </Link>
          <button
            onClick={toggleLang}
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {lang === "ar" ? "EN" : "AR"}
          </button>
          <button
            onClick={toggleTheme}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {isAuthed ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="hidden md:inline-flex">
              <LogOut className="h-4 w-4 mx-1" />
              <span>{tr.signOut}</span>
            </Button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5">
              <Link to="/learning-management-system/login">
                <Button variant="ghost" size="sm">{tr.signIn}</Button>
              </Link>
              <Link to="/learning-management-system/signup">
                <Button size="sm">{tr.signUp}</Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — same pattern as site Navbar */}
      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <Link
                key={l.to + l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: l.to === "/learning-management-system" }}
              >
                {l.icon}
                {l.label}
              </Link>
            ))}

            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
            >
              {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {lang === "ar" ? "العودة للموقع الرئيسي" : "Back to main site"}
            </Link>

            {isAuthed ? (
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                {tr.signOut}
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/learning-management-system/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">{tr.signIn}</Button>
                </Link>
                <Link to="/learning-management-system/signup" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">{tr.signUp}</Button>
                </Link>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="flex-1 rounded-full border border-border px-3 py-2 text-xs font-semibold"
              >
                {lang === "ar" ? "EN" : "AR"}
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-full border border-border px-3 py-2 text-xs font-semibold"
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
