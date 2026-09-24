import { Link, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GraduationCap, LayoutDashboard, LogOut, Presentation } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import type { LmsRole } from "@/hooks/useLmsAuth";
import { Footer } from "@/components/site/Footer";
import {
  IconCourses,
  IconGlobe,
  IconHome,
  IconInternships,
  IconLogin,
  IconProfile,
  IconSignup,
  IconStudent,
  IconVerify,
} from "./icons";

type Props = {
  role: LmsRole;
  isAuthed: boolean;
  onSignOut: () => void;
  mainSiteFooter?: boolean;
  children: ReactNode;
};

/** LMS chrome with homepage ambient ground, language switch, tubelight menu, and official homepage footer. */
export function LmsSkinShell({ role, isAuthed, onSignOut, children }: Props) {
  const { lang } = useLang();
  /* "dark" puts the shared components (buttons, fields, reviews) on the
     site's dark palette; lms-db.css tints its tokens to the LMS petrol. */
  return (
    <>
      <div className="lms-skin dark">
        <a className="skip-link" href="#main-content">
          {lang === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        <div className="ambient" aria-hidden="true">
          <span className="orb-petrol" />
          <span className="orb-olive" />
        </div>
        <LanguageSwitch />
        <TubeNav role={role} isAuthed={isAuthed} onSignOut={onSignOut} />
        <main id="main-content">{children}</main>
      </div>
      <Footer />
    </>
  );
}

function LanguageSwitch() {
  const { lang, toggle } = useLang();
  const ar = lang === "ar";
  return (
    <button
      className="language-switch radial-language"
      type="button"
      aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
      aria-pressed={ar}
      onClick={toggle}
    >
      <IconGlobe />
      <span className="language-switch-label">{ar ? "English" : "العربية"}</span>
    </button>
  );
}

type NavEntry = { to: string; label: string; icon: ReactNode; exact?: boolean };

/* The same links, by role, as the dashboard navbar (LmsNavbar). */
function TubeNav({ role, isAuthed, onSignOut }: Omit<Props, "children">) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLSpanElement>(null);

  const links: NavEntry[] = [
    { to: "/", label: ar ? "العودة للموقع" : "Back to site", icon: <IconHome />, exact: true },
    { to: "/learning-management-system", label: tr.navHome, icon: <GraduationCap />, exact: true },
    ...(isAuthed
      ? [{ to: "/learning-management-system/profile", label: tr.navProfile, icon: <IconProfile /> }]
      : []),
    { to: "/learning-management-system/catalog", label: tr.navCatalog, icon: <IconCourses /> },
    {
      to: "/learning-management-system/internships",
      label: lmsInternshipsT[lang].navInternships,
      icon: <IconInternships />,
    },
    { to: "/learning-management-system/verify", label: tr.verifyCertificate, icon: <IconVerify /> },
  ];
  if (isAuthed) {
    links.push({
      to: "/learning-management-system/student",
      label: tr.navMyCourses,
      icon: <IconStudent />,
    });
  }
  if (role === "lms_instructor" || role === "admin") {
    links.push({
      to: "/learning-management-system/instructor",
      label: tr.navInstructor,
      icon: <Presentation />,
    });
  }
  if (role === "admin") {
    links.push({
      to: "/learning-management-system/admin",
      label: tr.navAdmin,
      icon: <LayoutDashboard />,
    });
  }

  /* The lamp spans the active item, measured from the pill's padding edge. */
  const moveLamp = useCallback(() => {
    const items = itemsRef.current;
    const lamp = lampRef.current;
    if (!items || !lamp) return;
    const active = items.querySelector<HTMLElement>(
      '.radial-nav-item[data-status="active"], .radial-nav-item[aria-current="page"]',
    );
    if (!active) {
      lamp.classList.remove("is-on");
      return;
    }
    lamp.classList.add("is-on");
    lamp.style.width = `${active.offsetWidth}px`;
    lamp.style.transform = `translateX(${active.offsetLeft}px)`;
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(moveLamp);
    return () => cancelAnimationFrame(frame);
  }, [moveLamp, open, lang, pathname, isAuthed, role]);

  useEffect(() => {
    window.addEventListener("resize", moveLamp, { passive: true });
    document.fonts?.ready.then(moveLamp).catch(() => {});
    return () => window.removeEventListener("resize", moveLamp);
  }, [moveLamp]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Once the page scrolls, navigation.css fades a band in behind the fixed
  // logo and language buttons so headings no longer collide with them.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <nav
      className={`radial-nav${open ? " is-open" : ""}${scrolled ? " is-scrolled" : ""}`}
      ref={navRef}
      aria-label={ar ? "تنقّل منصة التعلّم" : "Learning platform navigation"}
    >
      <div className="radial-nav-items" ref={itemsRef} aria-hidden={!open} inert={!open}>
        <span className="tube-lamp" aria-hidden="true" ref={lampRef} />
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="radial-nav-item"
            activeOptions={{ exact: !!l.exact }}
            onClick={close}
          >
            {l.icon}
            <span className="radial-nav-label">{l.label}</span>
          </Link>
        ))}
        <span className="tube-divider" aria-hidden="true" />
        {isAuthed ? (
          <button
            type="button"
            className="tube-auth tube-login"
            onClick={() => {
              close();
              onSignOut();
            }}
          >
            <LogOut />
            <span className="tube-auth-label">{tr.signOut}</span>
          </button>
        ) : (
          <>
            <Link
              to="/learning-management-system/login"
              className="tube-auth tube-login"
              onClick={close}
            >
              <IconLogin />
              <span className="tube-auth-label">{tr.signIn}</span>
            </Link>
            <Link
              to="/learning-management-system/signup"
              className="tube-auth tube-signup"
              onClick={close}
            >
              <IconSignup />
              <span className="tube-auth-label">{tr.signUp}</span>
            </Link>
          </>
        )}
      </div>
      <button
        className="radial-nav-toggle"
        type="button"
        aria-expanded={open}
        aria-label={
          open ? (ar ? "إغلاق التنقل" : "Close navigation") : ar ? "فتح التنقل" : "Open navigation"
        }
        onClick={() => setOpen((v) => !v)}
      >
        <img className="radial-nav-tree" src="/cinematic/images/logo-tree-transparent.png" alt="" />
      </button>
    </nav>
  );
}

