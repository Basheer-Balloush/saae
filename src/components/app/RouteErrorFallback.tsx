import { useRouter } from "@tanstack/react-router";

/* Shown whenever any page fails to load. Every page gets its own copy, so an
   error (even one thrown without a message) never blanks the whole screen. */
export function RouteErrorFallback({ error, reset }: { error: unknown; reset: () => void }) {
  if (error !== undefined) console.error(error);
  const router = useRouter();
  const isAr = typeof document !== "undefined" && document.documentElement.lang !== "en";
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isAr ? "تعذّر تحميل الصفحة" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? "حدث خطأ. جرّب مرة أخرى أو عُد إلى الرئيسية." : "Something went wrong. Try again or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isAr ? "حاول مجدداً" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            {isAr ? "الرئيسية" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}
