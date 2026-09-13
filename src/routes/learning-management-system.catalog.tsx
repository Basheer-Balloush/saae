import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import type { CourseCardData } from "@/components/lms/CourseCard";
import { SkinCourseCard } from "@/components/lms-skin/SkinCourseCard";
import { SubHero } from "@/components/lms-skin/SubHero";
import { IconSearch } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS, categoryTone } from "@/components/lms-skin/skin";
import {
  PAGE_SIZE,
  parseCatalogSearch,
  validateCatalogSearch,
  type CatalogSearchInput,
} from "@/lib/lms-catalog-search";

type Category = { id: string; name_ar: string; name_en: string | null; slug: string };

type CatalogCourse = CourseCardData & { category_id?: string | null };

type LoaderData = {
  courses: CatalogCourse[];
  categories: Category[];
  total: number;
};

export const Route = createFileRoute("/learning-management-system/catalog")({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => parseCatalogSearch(search as Record<string, unknown>),
  loader: async ({ deps }): Promise<LoaderData> => {
    // Bounded, server-side filtered + paginated public list.
    const [{ data: cs, error }, { data: cats }] = await Promise.all([
      supabase.rpc("lms_list_catalog_public", {
        _limit: PAGE_SIZE,
        _offset: (deps.page - 1) * PAGE_SIZE,
        _category_slug: deps.category || undefined,
        _level: deps.level || undefined,
        _search: deps.q || undefined,
        _price: deps.price || undefined,
      }),
      supabase.from("lms_categories").select("id,name_ar,name_en,slug").order("display_order"),
    ]);
    if (error) throw new Error("catalog_load_failed");
    const rows = (cs as unknown as (CatalogCourse & { total_count: number })[]) ?? [];
    return {
      courses: rows,
      categories: (cats as unknown as Category[]) ?? [],
      total: Number(rows[0]?.total_count ?? 0),
    };
  },

  head: () => {
    const url = "https://aisyria.org/learning-management-system/catalog";
    const title = "Course Catalog — SAAE Training and Learning Platform";
    const description =
      "Browse all published courses on the SAAE Training and Learning Platform — filter by category, level, and price to find the right course for you.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }, ...LMS_SKIN_LINKS],
    };
  },
  component: Catalog,
  errorComponent: CatalogError,
});

function CatalogError({ reset }: { reset: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const router = useRouter();
  return (
    <SubHero
      id="catalog-error-title"
      eyebrow={ar ? "الكتالوج" : "Catalog"}
      titleSpans={[ar ? "تعذّر تحميل الدورات" : "Couldn't load courses"]}
      lede={ar ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "A connection error occurred. Please try again."}
      copyChildren={
        <p className="catalog-error" style={{ marginTop: 28 }}>
          <button
            type="button"
            className="action action-primary"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </p>
      }
    />
  );
}

function Catalog() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const data = Route.useLoaderData();
  const search = parseCatalogSearch(Route.useSearch() as Record<string, unknown>);
  const navigate = useNavigate({ from: Route.fullPath });

  const { courses, categories, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toneById = new Map(categories.map((c: Category, i: number) => [c.id, categoryTone(i, `${c.name_en ?? ""} ${c.name_ar}`)]));

  // Search box: local state mirrors the URL, debounced back into it.
  const [q, setQ] = useState(search.q);
  const urlQ = search.q;
  const typedRef = useRef(false);

  // Back/forward or a reset changes the URL: adopt it and drop pending typing.
  useEffect(() => {
    typedRef.current = false;
    setQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (!typedRef.current) return;
    const t = setTimeout(() => {
      if (q === urlQ) return;
      navigate({ search: (prev: CatalogSearchInput) => ({ ...prev, q, page: 1 }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q, urlQ, navigate]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (q === urlQ) return;
    navigate({ search: (prev: CatalogSearchInput) => ({ ...prev, q, page: 1 }), replace: true });
  };

  const setFilter = (key: "category" | "level" | "price", value: string) =>
    // Any filter change resets pagination.
    navigate({ search: (prev: CatalogSearchInput) => ({ ...prev, [key]: value === "all" ? "" : value, page: 1 }) });

  const goToPage = (page: number) =>
    navigate({ search: (prev: CatalogSearchInput) => ({ ...prev, page: Math.max(1, Math.min(totalPages, page)) }) });

  const hasFilters = !!(search.q || search.category || search.level || search.price);

  const filterRows: { key: "category" | "level" | "price"; label: string; options: { value: string; label: string }[] }[] = [
    {
      key: "category",
      label: tr.filterCategory,
      options: [
        { value: "all", label: tr.all },
        ...categories.map((c: Category) => ({ value: c.slug, label: ar ? c.name_ar : c.name_en || c.name_ar })),
      ],
    },
    {
      key: "level",
      label: tr.filterLevel,
      options: [
        { value: "all", label: tr.all },
        { value: "beginner", label: tr.beginner },
        { value: "intermediate", label: tr.intermediate },
        { value: "advanced", label: tr.advanced },
      ],
    },
    {
      key: "price",
      label: tr.filterPrice,
      options: [
        { value: "all", label: tr.all },
        { value: "free", label: tr.free },
        { value: "paid", label: tr.paid },
      ],
    },
  ];

  return (
    <>
      <SubHero
        id="catalog-title"
        eyebrow={ar ? "الكتالوج" : "Catalog"}
        titleSpans={ar ? ["كل", "الدورات"] : ["Every", "course"]}
        lede={
          ar
            ? "جميع الدورات المنشورة على منصّة التعلّم في الجمعية — ابحث وصفِّ حسب المجال والمستوى والسعر."
            : "Every published course on the SAAE learning platform — search, then filter by field, level and price."
        }
        copyChildren={
          <form className="lms-search" role="search" aria-label={tr.search} onSubmit={submitSearch}>
            <IconSearch />
            <input
              type="search"
              name="q"
              autoComplete="off"
              aria-label={ar ? "ابحث في الدورات" : "Search courses"}
              placeholder={ar ? "ابحث في الدورات والمهارات…" : "Search courses and skills…"}
              value={q}
              onChange={(e) => {
                typedRef.current = true;
                setQ(e.target.value);
              }}
            />
            <button type="submit">{ar ? "ابحث" : "Search"}</button>
          </form>
        }
      />

      <section className="lms-section lms-courses" aria-label={tr.catalogTitle}>
        <div className="page-shell">
          <div className="catalog-filters">
            {filterRows.map((row) => {
              const current = search[row.key] || "all";
              return (
                <div key={row.key} className="course-filters" role="group" aria-label={row.label}>
                  <span className="filter-label" aria-hidden="true">
                    {row.label}
                  </span>
                  {row.options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={current === o.value}
                      onClick={() => setFilter(row.key, o.value)}
                    >
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <p className="lms-count" role="status">
            <span>
              <b>{total}</b> {ar ? "دورة" : total === 1 ? "course" : "courses"}
            </span>
            {hasFilters && (
              <button
                type="button"
                className="lms-reset"
                onClick={() => navigate({ search: { q: "", category: "", level: "", price: "", page: 1 } })}
              >
                {ar ? "إعادة تعيين" : "Reset filters"}
              </button>
            )}
          </p>

          {courses.length === 0 ? (
            <p className="course-empty">{tr.noCourses}</p>
          ) : (
            <ul className="course-grid">
              {courses.map((c: CatalogCourse) => (
                <SkinCourseCard key={c.id} course={c} tone={toneById.get(c.category_id ?? "") ?? "ai"} />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav className="lms-pager" aria-label={ar ? "صفحات الدورات" : "Course pages"}>
              <button
                type="button"
                className="action action-secondary"
                disabled={search.page <= 1}
                onClick={() => goToPage(search.page - 1)}
              >
                {ar ? "→ السابق" : "← Previous"}
              </button>
              <span>{ar ? `صفحة ${search.page} من ${totalPages}` : `Page ${search.page} of ${totalPages}`}</span>
              <button
                type="button"
                className="action action-secondary"
                disabled={search.page >= totalPages}
                onClick={() => goToPage(search.page + 1)}
              >
                {ar ? "التالي ←" : "Next →"}
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
