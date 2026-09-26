import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import appCss from "../styles.css?url";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { AssistantFab } from "@/components/site/AssistantFab";
import { RouteProgress } from "@/components/site/RouteProgress";
import { ScrollToHash } from "@/components/site/ScrollToHash";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { isSkinnedLmsPath } from "@/components/lms-skin/skin";

function NotFoundComponent() {
  const isAr = typeof document !== "undefined" && document.documentElement.lang === "ar";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {isAr ? "الصفحة غير موجودة" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isAr ? "العودة للرئيسية" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const getHostname = createIsomorphicFn()
  .client(() => window.location.hostname)
  .server(() => {
    try {
      const { getRequestHost } =
        // Server-only conditional import, stripped from the client branch.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
      const host = getRequestHost({ xForwardedHost: true });
      return host ? String(host).split(":")[0] : null;
    } catch {
      return null;
    }
  });

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    const hostname = getHostname();
    if (hostname === "lms.aisyria.org" && location.pathname === "/") {
      throw redirect({ to: "/learning-management-system" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "-R7QfJtnlnCi-R9h33rfJJDjraUk3I1Quul6-TL4eYI" },
      { name: "author", content: "Syrian Association for AI & Entrepreneurship" },
      { property: "og:site_name", content: "SAAE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preload", as: "image", href: "/cinematic/images/saae-tree-loader.png" },
      { rel: "preload", as: "image", href: "/cinematic/images/saae-logo-en.png" },
      // Preconnect to the data + asset origins used on almost every page
      // so the browser opens the TCP/TLS connection in parallel with the
      // initial HTML parse. Cuts first-image / first-query latency by
      // 100-300ms on cold loads — critical at high concurrency.
      { rel: "preconnect", href: import.meta.env.VITE_SUPABASE_URL, crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: import.meta.env.VITE_SUPABASE_URL },
      { rel: "dns-prefetch", href: "https://video.bunnycdn.com" },
      { rel: "dns-prefetch", href: "https://images.unsplash.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NGO",
          name: "Syrian Association for AI & Entrepreneurship",
          alternateName: "SAAE",
          url: "https://aisyria.org",
          logo: "https://aisyria.org/favicon.png",
          email: "info@aisyria.org",
          telephone: "+963-930-763-547",
          description:
            "The first official Syrian organization dedicated to artificial intelligence, innovation, and entrepreneurship.",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Damascus",
            addressCountry: "SY",
          },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "info@aisyria.org",
            telephone: "+963-930-763-547",
            areaServed: "SY",
            availableLanguage: ["Arabic", "English"],
          },
          sameAs: [
            "https://www.instagram.com/saae_sy",
            "https://www.facebook.com/share/18SQ11hcct/",
            "https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/",
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/* The cinematic pages and the redesigned LMS are dark. Painting html and body
   dark from the first byte stops the white frame a full page load shows while
   the rest of the page streams in. Light pages and the dashboards keep the
   default ground. */
const CINEMATIC_PATH = /^\/(about|contact|initiative|partners|news(\/[^/]+)?)?\/?$/;
const DARK_GROUND = { backgroundColor: "#06232a", colorScheme: "dark" } as const;
/* The admin console, the instructor workspace and the attendance app. */
const CONSOLE_PATH =
  /^\/(admin(\/|$)|attendance-management-system(\/|$)|learning-management-system\/(admin|instructor)(\/|$))/;
const isDarkPath = (pathname: string) =>
  CINEMATIC_PATH.test(pathname) || isSkinnedLmsPath(pathname) || CONSOLE_PATH.test(pathname);

function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const ground = isDarkPath(pathname) ? DARK_GROUND : undefined;
  const themeInit = `(function(){try{var t=localStorage.getItem('saae-theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');if(/^\\/(admin(\\/|$)|attendance-management-system(\\/|$)|learning-management-system\\/(admin|instructor)(\\/|$))/.test(location.pathname))document.documentElement.classList.add('cx-dark','dark');var l=localStorage.getItem('saae-lang')==='en'?'en':'ar';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`;
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning style={ground}>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-MM4Y7E9Y96" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-MM4Y7E9Y96');`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <HeadContent />
      </head>
      <body style={ground}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function FormValidationHandler() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  useEffect(() => {
    const labelFor = (el: HTMLElement): string => {
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lbl?.textContent) return lbl.textContent.replace(/[*]/g, "").trim();
      }
      const aria =
        el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name");
      return aria || (isAr ? "هذا الحقل" : "this field");
    };
    const handler = (e: Event) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!t || !("validity" in t)) return;
      e.preventDefault();
      const v = t.validity;
      const name = labelFor(t);
      let msg = "";
      if (v.valueMissing) msg = isAr ? `يرجى ملء "${name}"` : `Please fill in "${name}"`;
      else if (v.typeMismatch && t.type === "email")
        msg = isAr ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email";
      else if (v.typeMismatch && t.type === "url")
        msg = isAr ? "يرجى إدخال رابط صالح" : "Please enter a valid URL";
      else if (v.tooShort) msg = isAr ? `"${name}" قصير جداً` : `"${name}" is too short`;
      else if (v.tooLong) msg = isAr ? `"${name}" طويل جداً` : `"${name}" is too long`;
      else if (v.patternMismatch)
        msg = isAr ? `صيغة "${name}" غير صحيحة` : `"${name}" format is invalid`;
      else msg = isAr ? `يرجى التحقق من "${name}"` : `Please check "${name}"`;
      toast.error(msg);
      (t as HTMLElement).focus({ preventScroll: false });
    };
    document.addEventListener("invalid", handler, true);
    return () => document.removeEventListener("invalid", handler, true);
  }, [isAr]);
  return null;
}

const SCROLL_POSITIONS = "saae-scroll-positions";

function readScrollPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_POSITIONS) || "{}");
  } catch {
    return {};
  }
}

/* Back and Forward return to where the visitor was; any other arrival (a
   link, a reload) starts at the top.

   Two things make this harder than it looks. On Back the address changes to
   the page being returned to while the page being left is still on screen,
   and Safari scrolls during its back animation: anything recorded in that
   moment would overwrite the position being returned to (with the article's
   0, which is how Back kept landing at the top on iPhones). So the position
   is read the instant Back is pressed and nothing is recorded until it has
   been put back. And a page like the homepage is not its full height when it
   first shows (the desktop film builds its sections a moment later, the
   phone's runways are sized by script), so the position is re-applied until
   the page can hold it and it has stayed put, and given up only when the
   visitor actually scrolls. */
function ScrollRestoration() {
  const location = useLocation();
  const pending = useRef<{ target: number | null; paused: boolean; release: number }>({
    target: null,
    paused: false,
    release: 0,
  });

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const state = pending.current;
    const hold = () => {
      state.paused = true;
      state.target = readScrollPositions()[window.location.pathname] ?? 0;
      // Back within one page (a hash) never re-renders it: don't stay paused.
      window.clearTimeout(state.release);
      state.release = window.setTimeout(() => {
        state.paused = false;
      }, 16000);
    };
    // A whole-page Back (from a page outside the app) arrives as a load.
    const entry = performance.getEntriesByType?.("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    if (entry?.type === "back_forward") hold();

    let ticking = false;
    const onScroll = () => {
      if (ticking || state.paused) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (state.paused) return;
        const m = readScrollPositions();
        m[window.location.pathname] = window.scrollY;
        try {
          sessionStorage.setItem(SCROLL_POSITIONS, JSON.stringify(m));
        } catch {
          // Scroll restoration remains optional when session storage is blocked.
        }
      });
    };
    window.addEventListener("popstate", hold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("popstate", hold);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(state.release);
    };
  }, []);

  useEffect(() => {
    const state = pending.current;
    const target = location.pathname === "/contact" ? 0 : (state.target ?? 0);
    state.target = null;
    type Engine = { scrollTo: (y: number, o?: { immediate?: boolean }) => void };
    const go = (y: number) => {
      const engine = (window as Window & { saaeScroll?: Engine }).saaeScroll;
      if (engine) engine.scrollTo(y, { immediate: true });
      else window.scrollTo({ top: y, left: 0, behavior: "auto" });
    };
    const resume = () => {
      window.clearTimeout(state.release);
      state.paused = false;
    };
    if (window.location.hash) return resume();
    if (target <= 0) {
      requestAnimationFrame(() => {
        go(0);
        resume();
      });
      return;
    }

    const w = window as Window & { saaeRestoreTarget?: number };
    w.saaeRestoreTarget = target;
    const started = performance.now();
    let settledSince = 0;
    let timer = 0;
    let stopped = false;
    // Scrolling is the visitor taking over; a tap is not.
    const cancelOn = ["wheel", "touchmove", "keydown"] as const;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      if (w.saaeRestoreTarget === target) delete w.saaeRestoreTarget;
      for (const type of cancelOn) window.removeEventListener(type, stop);
      resume();
    };
    for (const type of cancelOn) window.addEventListener(type, stop, { passive: true });
    const attempt = () => {
      if (stopped) return;
      const now = performance.now();
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room >= target - 2) {
        if (Math.abs(window.scrollY - target) > 2) {
          go(target);
          settledSince = 0;
        } else if (!settledSince) settledSince = now;
        else if (now - settledSince > 1200) return stop();
      }
      if (now - started > 15000) return stop();
      timer = window.setTimeout(attempt, 100);
    };
    attempt();
    return stop;
  }, [location.pathname]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const isAms = location.pathname.startsWith("/attendance-management-system");
  const isLms = location.pathname.startsWith("/learning-management-system");
  const isAdmin =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/learning-management-system/admin");
  const isStandaloneProfile = location.pathname.startsWith("/profile/");
  /* Console pages share one frame; keeping one key stops the sidebar and its
     data from remounting on every click inside the console. */
  const isConsole =
    /^\/admin(\/|$)/.test(location.pathname) && location.pathname !== "/admin/login"
      ? true
      : /^\/learning-management-system\/(admin|instructor)(\/|$)/.test(location.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ConfirmProvider>
            <FormValidationHandler />
            <ScrollRestoration />
            <ScrollToHash />
            <RouteProgress />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isConsole ? "console" : location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            {/* The homepage's Abu Al-Joud opens the chat there, on every screen size. */}
            {!isAms && !isLms && !isAdmin && !isStandaloneProfile && (
              <AssistantFab hideTrigger={location.pathname === "/"} />
            )}
            <Toaster richColors position="top-center" />
          </ConfirmProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
