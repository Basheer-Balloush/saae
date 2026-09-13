import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { listPublicInternships, type PublicInternshipCard } from "@/lib/lms-internships-public.functions";
import { SubHero } from "@/components/lms-skin/SubHero";
import { IconSearch } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

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
      ...LMS_SKIN_LINKS,
    ],
  }),
  component: PublicInternshipsList,
});

const PAGE_SIZE = 12;

function PublicInternshipsList() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const t = lmsInternshipsT[lang];
  const listFn = useServerFn(listPublicInternships);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);


  const opts = queryOptions({
    queryKey: ["public-internships", { page, q: debouncedQ }],
    queryFn: () => listFn({ data: { page, page_size: PAGE_SIZE, q: debouncedQ || undefined } }),
    staleTime: 60_000,
  });
  const { data, isLoading, isError, refetch } = useQuery(opts);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <SubHero
        id="intern-title"
        eyebrow={t.internshipsTitle}
        titleSpans={ar ? ["تدرّب", "على عمل حقيقي"] : ["Train", "on real work"]}
        lede={t.internshipsSubtitle}
        copyChildren={
          <form
            className="lms-search"
            role="search"
            aria-label={ar ? "ابحث في الفرص المتاحة" : "Search opportunities"}
            onSubmit={(e) => {
              e.preventDefault();
              setDebouncedQ(q.trim());
              setPage(1);
            }}
          >
            <IconSearch />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ar ? "ابحث في الفرص المتاحة" : "Search opportunities"}
              aria-label={ar ? "ابحث في الفرص المتاحة" : "Search opportunities"}
              dir="auto"
            />
            <button type="submit">{ar ? "ابحث" : "Search"}</button>
          </form>
        }
      />

      <section className="lms-section" aria-label={t.internshipsTitle}>
        <div className="page-shell">
          {isLoading && (
            <div className="state-box">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {isError && (
            <div className="state-box">
              <p>{t.errorLoad}</p>
              <button type="button" className="action action-secondary" onClick={() => void refetch()}>
                {t.errorRetry}
              </button>
            </div>
          )}

          {!isLoading && !isError && data && data.items.length === 0 && (
            <p className="state-box">{t.internshipsEmpty}</p>
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <>
              <ul className="opp-grid">
                {data.items.map((item) => (
                  <InternshipCard key={item.id} item={item} lang={lang} />
                ))}
              </ul>

              {totalPages > 1 && (
                <nav className="lms-pager" aria-label="Pagination">
                  <button type="button" className="action action-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    {ar ? "→ السابق" : "← Previous"}
                  </button>
                  <span>{ar ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
                  <button type="button" className="action action-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    {ar ? "التالي ←" : "Next →"}
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function InternshipCard({ item, lang }: { item: PublicInternshipCard; lang: "ar" | "en" }) {
  const t = lmsInternshipsT[lang];
  const ar = lang === "ar";
  const title = lang === "ar" ? item.title_ar : item.title_en || item.title_ar;
  const summary = lang === "ar" ? item.summary_ar : item.summary_en;
  const location = lang === "ar" ? item.location_ar : item.location_en;
  const duration = lang === "ar" ? item.duration_ar : item.duration_en;
  const closed = item.status === "closed";
  const meta = [
    location,
    duration,
    item.deadline_at ? `${t.internshipDeadline}: ${new Date(item.deadline_at).toLocaleDateString(lang)}` : null,
  ].filter(Boolean);

  return (
    <li className="opp-card is-link">
      <Link to="/learning-management-system/internships/$slug" params={{ slug: item.slug }}>
        {item.cover_url ? <img className="opp-cover" src={item.cover_url} alt="" loading="lazy" /> : null}
        <span className="opp-body">
          <span className="opp-tag">{ar ? "فرصة تدريب" : "Internship"}</span>
          <h3 dir="auto">{title}</h3>
          {meta.length > 0 && (
            <span className="opp-meta" dir="auto">
              {meta.join(" · ")}
            </span>
          )}
          {summary && (
            <span className="opp-summary" dir="auto">
              {summary}
            </span>
          )}
          <span className="opp-foot">
            <span className={`status ${closed ? "is-review" : "is-open"}`}>
              {closed ? t.internshipClosed : ar ? "التقديم مفتوح" : "Open"}
            </span>
            <span className="opp-apply">
              <span>{ar ? "تفاصيل الفرصة" : "View the internship"}</span> <span aria-hidden="true">{ar ? "←" : "→"}</span>
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
