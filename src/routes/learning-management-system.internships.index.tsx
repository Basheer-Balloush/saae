import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, MapPin, Clock3, Search, Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { listPublicInternships, type PublicInternshipCard } from "@/lib/lms-internships-public.functions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/learning-management-system/internships/")({
  head: () => ({
    meta: [
      { title: "Internship Opportunities — SAAE" },
      { name: "description", content: "Browse open internship opportunities at SAAE and apply through the Training and Learning Platform." },
      { property: "og:title", content: "Internship Opportunities — SAAE" },
      { property: "og:description", content: "Browse open internship opportunities at SAAE and apply through the Training and Learning Platform." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://aisyria.org/learning-management-system/internships" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/learning-management-system/internships" },
    ],
  }),
  component: PublicInternshipsList,
});

const PAGE_SIZE = 12;

function PublicInternshipsList() {
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  const listFn = useServerFn(listPublicInternships);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  // debounce
  useDebounced(q, 300, (v) => {
    setDebouncedQ(v.trim());
    setPage(1);
  });

  const opts = queryOptions({
    queryKey: ["public-internships", { page, q: debouncedQ }],
    queryFn: () => listFn({ data: { page, page_size: PAGE_SIZE, q: debouncedQ || undefined } }),
    staleTime: 60_000,
  });
  const { data, isLoading, isError, refetch } = useQuery(opts);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14" dir={dir}>
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          {t.internshipsTitle}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          {t.internshipsSubtitle}
        </p>
      </header>

      <div className="mb-6 relative max-w-md">
        <Search
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`}
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "ابحث في الفرص المتاحة" : "Search opportunities"}
          className={dir === "rtl" ? "pr-9" : "pl-9"}
          dir="auto"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="text-center py-16">
          <p className="text-destructive mb-3">{t.errorLoad}</p>
          <Button variant="outline" onClick={() => void refetch()}>{t.errorRetry}</Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          {t.internshipsEmpty}
        </div>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <InternshipCard key={item.id} item={item} lang={lang} />
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-muted-foreground">
                {lang === "ar"
                  ? `الصفحة ${page} من ${totalPages}`
                  : `Page ${page} of ${totalPages}`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {lang === "ar" ? "السابق" : "Previous"}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  {lang === "ar" ? "التالي" : "Next"}
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function InternshipCard({ item, lang }: { item: PublicInternshipCard; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const title = lang === "ar" ? item.title_ar : item.title_en || item.title_ar;
  const summary = lang === "ar" ? item.summary_ar : item.summary_en;
  const location = lang === "ar" ? item.location_ar : item.location_en;
  const duration = lang === "ar" ? item.duration_ar : item.duration_en;
  const closed = item.status === "closed";

  return (
    <li>
      <Link
        to="/learning-management-system/internships/$slug"
        params={{ slug: item.slug }}
        className="group block h-full rounded-2xl border border-border bg-card overflow-hidden shadow-soft transition hover:border-primary/60 hover:shadow-md"
      >
        {item.cover_url ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={item.cover_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 to-secondary/10" />
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-foreground leading-snug line-clamp-2" dir="auto">
              {title}
            </h2>
            {closed && (
              <Badge variant="outline" className="shrink-0 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                {t.internshipClosed}
              </Badge>
            )}
          </div>
          {summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2" dir="auto">
              {summary}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <span dir="auto">{location}</span></span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> <span dir="auto">{duration}</span></span>
            )}
            {item.deadline_at && (
              <span className="inline-flex items-center gap-1" dir="ltr">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(item.deadline_at).toLocaleDateString(lang)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

// tiny debounce hook
function useDebounced(value: string, ms: number, onChange: (v: string) => void) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = { current: value };
  ref.current = value;
  // use effect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useDebounceEffect(value, ms, onChange);
}
function useDebounceEffect(value: string, ms: number, cb: (v: string) => void) {
  // separate to avoid ESLint hook-in-conditional; imported inline
  const React = require("react") as typeof import("react");
  React.useEffect(() => {
    const id = setTimeout(() => cb(value), ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms]);
}
