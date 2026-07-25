import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCard, type CourseCardData } from "@/components/lms/CourseCard";

type Category = { id: string; name_ar: string; name_en: string | null; slug: string };

export const Route = createFileRoute("/learning-management-system/catalog")({
  loader: async (): Promise<{ courses: CourseCardData[]; categories: Category[] }> => {
    const [{ data: cs }, { data: cats }] = await Promise.all([
      supabase
        .from("lms_courses")
        .select("id,slug,title_ar,title_en,description_ar,description_en,cover_url,level,price,is_free,students_count,rating_avg,category_id")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase.from("lms_categories").select("id,name_ar,name_en,slug").order("display_order"),
    ]);
    return {
      courses: ((cs as unknown) as CourseCardData[]) ?? [],
      categories: ((cats as unknown) as Category[]) ?? [],
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
});




function Catalog() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
  const data = Route.useLoaderData();
  const courses = data.courses as CourseCardData[];
  const categories = data.categories as Category[];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [price, setPrice] = useState<string>("all");


  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (q && !(`${c.title_ar} ${c.title_en ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (cat !== "all" && (c as unknown as { category_id: string }).category_id !== cat) return false;
      if (level !== "all" && c.level !== level) return false;
      if (price === "free" && !c.is_free) return false;
      if (price === "paid" && c.is_free) return false;
      return true;
    });
  }, [courses, q, cat, level, price]);




  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.catalogTitle}</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={tr.search} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
        </div>
        <FilterSelect
          dir={dir}
          value={cat}
          onChange={setCat}
          label={tr.filterCategory}
          options={[
            { value: "all", label: tr.all },
            ...categories.map((c) => ({
              value: c.id,
              label: lang === "ar" ? c.name_ar : c.name_en || c.name_ar,
            })),


          ]}
        />
        <FilterSelect
          dir={dir}
          value={level}
          onChange={setLevel}
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
          value={price}
          onChange={setPrice}
          label={tr.filterPrice}
          options={[
            { value: "all", label: tr.all },
            { value: "free", label: tr.free },
            { value: "paid", label: tr.paid },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{tr.noCourses}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
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
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-10 text-sm font-semibold [&>span]:text-start" aria-label={label} dir={dir}>
        <SelectValue placeholder={label}>{label}</SelectValue>
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
