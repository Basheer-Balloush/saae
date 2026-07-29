import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCard, type CourseCardData } from "@/components/lms/CourseCard";

type Category = { id: string; name_ar: string; name_en: string | null; slug: string };

import {
  PAGE_SIZE,
  parseCatalogSearch,
  type CatalogSearch,
} from "@/lib/lms-catalog-search";


type LoaderData = {
  courses: CourseCardData[];
  categories: Category[];
  total: number;
};

export const Route = createFileRoute("/learning-management-system/catalog")({
  validateSearch: parseCatalogSearch,
  loaderDeps: ({ search }) => ({
    q: search.q,
    category: search.category,
    level: search.level,
    price: search.price,
    page: search.page,
  }),
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
    const rows = (cs as unknown as (CourseCardData & { total_count: number })[]) ?? [];
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
      links: [{ rel: "canonical", href: url }],
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
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        {ar ? "تعذّر تحميل الدورات" : "Couldn't load courses"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {ar ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "A connection error occurred. Please try again."}
      </p>
      <Button
        size="lg"
        className="mt-6"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        <RefreshCw className="h-4 w-4 mx-2" />
        {ar ? "إعادة المحاولة" : "Retry"}
      </Button>
    </div>
  );
}

function Catalog() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const dir: "rtl" | "ltr" = ar ? "rtl" : "ltr";
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { courses, categories, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
      navigate({ search: (prev: CatalogSearch) => ({ ...prev, q, page: 1 }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [q, urlQ, navigate]);

  const setFilter = (key: "category" | "level" | "price", value: string) =>
    // Any filter change resets pagination.
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, [key]: value === "all" ? "" : value, page: 1 }) });

  const goToPage = (page: number) =>
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, page: Math.max(1, Math.min(totalPages, page)) }) });

  const hasFilters = !!(search.q || search.category || search.level || search.price);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.catalogTitle}</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tr.search}
            value={q}
            onChange={(e) => {
              typedRef.current = true;
              setQ(e.target.value);
            }}
            className="ps-9"
          />
        </div>
        <FilterSelect
          dir={dir}
          value={search.category || "all"}
          onChange={(v) => setFilter("category", v)}
          label={tr.filterCategory}
          options={[
            { value: "all", label: tr.all },
            ...categories.map((c: Category) => ({
              value: c.slug,
              label: ar ? c.name_ar : c.name_en || c.name_ar,
            })),
          ]}
        />
        <FilterSelect
          dir={dir}
          value={search.level || "all"}
          onChange={(v) => setFilter("level", v)}
          label={tr.filterLevel}
          options={[
            { value: "all", label: tr.all },
            { value: "beginner", label: tr.beginner },
            { value: "intermediate", label: tr.intermediate },
            { value: "advanced", label: tr.advanced },
          ]}
        />
        <FilterSelect
          dir={dir}
          value={search.price || "all"}
          onChange={(v) => setFilter("price", v)}
          label={tr.filterPrice}
          options={[
            { value: "all", label: tr.all },
            { value: "free", label: tr.free },
            { value: "paid", label: tr.paid },
          ]}
        />
      </div>

      {hasFilters && (
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {ar ? `${total} نتيجة` : `${total} result${total === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() =>
              navigate({ search: { q: "", category: "", level: "", price: "", page: 1 } })
            }
          >
            {ar ? "إعادة تعيين" : "Reset filters"}
          </button>
        </div>
      )}

      {courses.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{tr.noCourses}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {courses.map((c: CourseCardData) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={search.page <= 1}
            onClick={() => goToPage(search.page - 1)}
          >
            <ChevronRight className="h-4 w-4 hidden rtl:block" />
            <ChevronLeft className="h-4 w-4 rtl:hidden" />
            {ar ? "السابق" : "Previous"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {ar ? `صفحة ${search.page} من ${totalPages}` : `Page ${search.page} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={search.page >= totalPages}
            onClick={() => goToPage(search.page + 1)}
          >
            {ar ? "التالي" : "Next"}
            <ChevronLeft className="h-4 w-4 hidden rtl:block" />
            <ChevronRight className="h-4 w-4 rtl:hidden" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
  dir = "rtl",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  dir?: "rtl" | "ltr";
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-10 text-sm font-semibold [&>span]:text-start" aria-label={label} dir={dir}>
        {/* Show the actual selection, falling back to the filter label. */}
        <SelectValue placeholder={label}>
          {selected && selected.value !== "all" ? `${label}: ${selected.label}` : label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent dir={dir}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-start">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
