import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import appCss from "../styles.css?url";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { AssistantFab } from "@/components/site/AssistantFab";

function NotFoundComponent() {
  const isAr = (typeof document !== "undefined" && document.documentElement.lang === "ar");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {isAr ? "الصفحة غير موجودة" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها." : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isAr ? "العودة للرئيسية" : "Go home"}
          </Link>
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "lms.aisyria.org" &&
      location.pathname === "/"
    ) {
      throw redirect({ to: "/learning-management-system" });
    }
  },
  head: () => ({

    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SAAE — Syrian Association for AI & Entrepreneurship" },
      { name: "description", content: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — نشر ثقافة الذكاء الاصطناعي وريادة الأعمال في سوريا عبر مجتمعات تقنية متخصصة." },
      { name: "author", content: "Syrian Association for AI & Entrepreneurship" },
      { property: "og:site_name", content: "SAAE" },
      { property: "og:title", content: "SAAE — Syrian Association for AI & Entrepreneurship" },
      { property: "og:description", content: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — نشر ثقافة الذكاء الاصطناعي وريادة الأعمال في سوريا عبر مجتمعات تقنية متخصصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SAAE — Syrian Association for AI & Entrepreneurship" },
      { name: "twitter:description", content: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — نشر ثقافة الذكاء الاصطناعي وريادة الأعمال في سوريا عبر مجتمعات تقنية متخصصة." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3DsKbVScNmfZw2PahDdK8aVoCdp2/social-images/social-1779006179384-Screenshot_2026-05-11_030655.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/3DsKbVScNmfZw2PahDdK8aVoCdp2/social-images/social-1779006179384-Screenshot_2026-05-11_030655.webp" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
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
          "@type": "Organization",
          name: "Syrian Association for AI & Entrepreneurship",
          alternateName: "SAAE",
          url: "https://aisyria.org",
          logo: "https://aisyria.org/favicon.png",
          description: "The first official Syrian organization dedicated to artificial intelligence, innovation, and entrepreneurship.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const themeInit = `(function(){try{var t=localStorage.getItem('saae-theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');var l=localStorage.getItem('saae-lang')||'en';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`;
  return (
    <html lang="en">
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
      <body>
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
      const aria = el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name");
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
      else if (v.typeMismatch && t.type === "email") msg = isAr ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email";
      else if (v.typeMismatch && t.type === "url") msg = isAr ? "يرجى إدخال رابط صالح" : "Please enter a valid URL";
      else if (v.tooShort) msg = isAr ? `"${name}" قصير جداً` : `"${name}" is too short`;
      else if (v.tooLong) msg = isAr ? `"${name}" طويل جداً` : `"${name}" is too long`;
      else if (v.patternMismatch) msg = isAr ? `صيغة "${name}" غير صحيحة` : `"${name}" format is invalid`;
      else msg = isAr ? `يرجى التحقق من "${name}"` : `Please check "${name}"`;
      toast.error(msg);
      (t as HTMLElement).focus({ preventScroll: false });
    };
    document.addEventListener("invalid", handler, true);
    return () => document.removeEventListener("invalid", handler, true);
  }, [isAr]);
  return null;
}

function ScrollRestoration() {
  const location = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const key = "saae-scroll-positions";
    const read = (): Record<string, number> => {
      try { return JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { return {}; }
    };
    const write = (m: Record<string, number>) => {
      try { sessionStorage.setItem(key, JSON.stringify(m)); } catch {}
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const m = read();
        m[window.location.pathname] = window.scrollY;
        write(m);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const key = "saae-scroll-positions";
    let saved = 0;
    try {
      const m = JSON.parse(sessionStorage.getItem(key) || "{}");
      saved = typeof m[location.pathname] === "number" ? m[location.pathname] : 0;
    } catch {}
    requestAnimationFrame(() => {
      window.scrollTo({ top: saved, left: 0, behavior: "auto" });
    });
  }, [location.pathname]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const isAms = location.pathname.startsWith("/attendance-management-system");
  const isLms = location.pathname.startsWith("/learning-management-system");
  const isAdmin = location.pathname.startsWith("/admin") || location.pathname.startsWith("/super-admin") || location.pathname.startsWith("/learning-management-system/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <FormValidationHandler />
          <ScrollToTop />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          {!isAms && !isLms && !isAdmin && <AssistantFab />}
          <Toaster richColors position="top-center" />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
