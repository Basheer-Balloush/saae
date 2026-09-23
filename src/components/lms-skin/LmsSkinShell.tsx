import { Link, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GraduationCap, LayoutDashboard, LogOut, Presentation } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import type { LmsRole } from "@/hooks/useLmsAuth";
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

const MainSiteFooter = lazy(() =>
  import("./LmsMainFooter").then((module) => ({ default: module.LmsMainFooter })),
);

/** Moaz's LMS chrome: ambient ground, language switch, tubelight menu and footer. */
export function LmsSkinShell({
  role,
  isAuthed,
  onSignOut,
  mainSiteFooter = false,
  children,
}: Props) {
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
        {!mainSiteFooter && <SkinFooter />}
      </div>
      {mainSiteFooter && (
        <Suspense fallback={null}>
          <MainSiteFooter />
        </Suspense>
      )}
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

  const close = () => setOpen(false);

  return (
    <nav
      className={`radial-nav${open ? " is-open" : ""}`}
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

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/saae_sy?igsh=ZjE0eXN0Y3hlODNz",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/18SQ11hcct/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.4V13h2.73v8z"
        />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.5 9H3.6v12h2.9zM5.05 3.6a1.68 1.68 0 1 0 0 3.36 1.68 1.68 0 0 0 0-3.36M20.4 21h-2.9v-5.83c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V21h-2.9V9h2.78v1.64h.04a3.05 3.05 0 0 1 2.74-1.5c2.94 0 3.48 1.93 3.48 4.44z"
        />
      </svg>
    ),
  },
];

function SkinFooter() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const explore = [
    { to: "/about", label: ar ? "عن الجمعية" : "About SAAE" },
    { to: "/partners", label: ar ? "الشركاء" : "Partners" },
    { to: "/initiative", label: ar ? "المبادرة" : "Initiative" },
    { to: "/contact", label: ar ? "تواصل معنا" : "Contact" },
    { to: "/learning-management-system/internships", label: lmsInternshipsT[lang].navInternships },
    { to: "/learning-management-system/verify", label: tr.verifyCertificate },
    { to: "/learning-management-system/student", label: tr.navMyCourses },
    { to: "/learning-management-system/profile", label: tr.navProfile },
  ];

  return (
    <footer className="site-footer">
      <div className="page-shell footer-main">
        <div className="footer-identity">
          <img
            className="footer-logo footer-logo-en"
            src="/cinematic/images/saae-logo-en.png"
            alt="Syrian Association for AI & Entrepreneurship"
            width="1090"
            height="340"
            decoding="async"
          />
          <img
            className="footer-logo footer-logo-ar"
            src="/cinematic/images/saae-logo-ar.png"
            alt="الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
            width="960"
            height="340"
            decoding="async"
          />
          <p className="footer-name">
            {ar
              ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
              : "Syrian Association for AI & Entrepreneurship"}
          </p>
          <p className="footer-location">
            <a
              href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6"
              target="_blank"
              rel="noopener noreferrer"
            >
              {ar
                ? "دمشق، بجانب وزارة التعليم العالي والبحث العلمي"
                : "Damascus, beside the Ministry of Higher Education and Scientific Research"}
            </a>
          </p>
          <p className="footer-claim">
            {ar
              ? "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي."
              : "Syria’s first official organisation dedicated to artificial intelligence."}
          </p>
        </div>

        <nav className="footer-col" aria-labelledby="lms-footer-explore">
          <h2 className="footer-col-title" id="lms-footer-explore">
            {ar ? "استكشف" : "Explore"}
          </h2>
          <ul>
            {explore.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col footer-reach">
          <h2 className="footer-col-title">{ar ? "تواصل مع الجمعية" : "Reach SAAE"}</h2>
          <ul>
            <li>
              <a href="mailto:info@aisyria.org">info@aisyria.org</a>
            </li>
            <li>
              <a href="tel:+963930763547" dir="ltr">
                +963 930 763 547
              </a>
            </li>
          </ul>
          <ul
            className="footer-social"
            aria-label={ar ? "الجمعية على منصات التواصل" : "SAAE on social platforms"}
          >
            {SOCIALS.map(({ label, href, icon }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  {icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="page-shell footer-bottom">
        <span>
          {ar
            ? "ستُنشر المعلومات الرسمية والبرامج والتسجيل على هذا الموقع."
            : "Official information, programmes and registration will be published on this website."}
        </span>
        <span>© {new Date().getFullYear()} SAAE</span>
      </div>
    </footer>
  );
}
