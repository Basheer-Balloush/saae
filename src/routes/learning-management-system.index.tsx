import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import type { CourseCardData } from "@/components/lms/CourseCard";
import { loadAllPublicCourses } from "@/lib/lms-public-catalog";
import { SkinCourseCard } from "@/components/lms-skin/SkinCourseCard";
import { CategoriesCarousel } from "@/components/lms-skin/CategoriesCarousel";
import { FaqAccordion } from "@/components/lms-skin/FaqAccordion";
import { Counter, Reveal } from "@/components/lms-skin/Reveal";
import { IconSearch } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS, categoryTone } from "@/components/lms-skin/skin";

type Category = { id: string; name_ar: string; name_en: string | null; slug: string };
type HomeCourse = CourseCardData & { category_id?: string | null };

export const Route = createFileRoute("/learning-management-system/")({
  loader: async () => {
    const [{ data: cats, error: categoryError }, { data: statsRows, error: statsError }, listRows] =
      await Promise.all([
        supabase.from("lms_categories").select("id, name_ar, name_en, slug").order("display_order"),
        supabase.rpc("lms_public_stats"),
        loadAllPublicCourses(),
      ]);
    if (categoryError || statsError) throw new Error("lms_home_load_failed");
    const s = (
      statsRows as { courses: number; students: number; instructors: number }[] | null
    )?.[0];
    // Visitors cannot read lms_courses directly (RLS), so count from the
    // complete public catalog list, which carries each course's category.
    const counts: Record<string, number> = {};
    ((listRows as unknown as HomeCourse[]) ?? []).forEach((r) => {
      if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
    });
    return {
      categories: (cats ?? []) as Category[],
      stats: {
        courses: Number(s?.courses ?? 0),
        students: Number(s?.students ?? 0),
        instructors: Number(s?.instructors ?? 0),
      },
      coursesByCategory: counts,
      courses: (listRows as unknown as HomeCourse[]) ?? [],
    };
  },
  head: () => ({
    meta: [
      { title: "SAAE Training and Learning Platform — Courses & Skills" },
      {
        name: "description",
        content:
          "SAAE Training and Learning Platform — Arabic-first online courses in AI, programming, design, business and more. Learn from expert instructors and earn certificates.",
      },
      { property: "og:title", content: "SAAE Training and Learning Platform — Courses & Skills" },
      {
        property: "og:description",
        content:
          "Browse AI, programming, design and business courses on the SAAE Training and Learning Platform. Arabic-first, instructor-led, certificate-ready.",
      },
      { property: "og:url", content: "https://aisyria.org/learning-management-system" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "SAAE Training and Learning Platform — Courses & Skills" },
      {
        name: "twitter:description",
        content:
          "Browse AI, programming, design and business courses on the SAAE Training and Learning Platform.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/learning-management-system" },
      ...LMS_SKIN_LINKS,
    ],
  }),
  component: LmsHome,
});

/* Searches that match real course titles in both languages. */
const POPULAR = [
  { query: "الذكاء الاصطناعي التوليدي", en: "Generative AI", ar: "الذكاء الاصطناعي التوليدي" },
  { query: "Vibe Coding", en: "Vibe Coding", ar: "Vibe Coding" },
  { query: "تسويق", en: "Marketing 360", ar: "تسويق 360" },
];

function LmsHome() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { categories, stats, coursesByCategory, courses } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const coursesRef = useRef<HTMLElement>(null);

  // Home is public to visitors and signed-in members alike.

  const catName = (c: Category) => (ar ? c.name_ar : c.name_en || c.name_ar);
  const toneById = useMemo(
    () => new Map(categories.map((c, i) => [c.id, categoryTone(i, `${c.name_en ?? ""} ${c.name_ar}`)])),
    [categories],
  );
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter !== "all" && c.category_id !== filter) return false;
      if (!q) return true;
      const cat = c.category_id ? categoryById.get(c.category_id) : undefined;
      return `${c.title_ar} ${c.title_en ?? ""} ${cat?.name_ar ?? ""} ${cat?.name_en ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [courses, filter, query, categoryById]);

  const scrollToCourses = () => coursesRef.current?.scrollIntoView({ behavior: "smooth" });

  const carousel = categories.map((c, i) => ({
    id: c.id,
    name: catName(c),
    count: coursesByCategory[c.id] ?? 0,
    tone: categoryTone(i, `${c.name_en ?? ""} ${c.name_ar}`),
  }));

  return (
    <>
      {/* HERO — headline + search. */}
      <section className="lms-hero" aria-labelledby="lms-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="page-shell lms-hero-inner">
          <div className="lms-hero-copy">
            <h1 id="lms-title" className="sr-only">
              {ar ? "تعلّم بلا حدود" : "Learn without limits"}
            </h1>
            <p className="lms-hero-title" aria-hidden="true">
              {ar ? (
                <>
                  تعلّم <em>بلا حدود</em>
                </>
              ) : (
                <>
                  Learn <em>without limits</em>
                </>
              )}
            </p>
            <p className="lms-hero-lede">
              {ar
                ? "ذكاء اصطناعي وبرمجة وتصميم وأعمال — يدرّسها خبراء بالعربية، بشهادة معتمدة من الجمعية."
                : "AI, programming, design and business — taught in Arabic by experts, certified by SAAE."}
            </p>
            <form
              className="lms-search"
              role="search"
              aria-label={ar ? "ابحث في الدورات" : "Search courses"}
              onSubmit={(e) => {
                e.preventDefault();
                scrollToCourses();
              }}
            >
              <IconSearch />
              <input
                type="search"
                name="q"
                autoComplete="off"
                aria-label={ar ? "ابحث في الدورات" : "Search courses"}
                placeholder={
                  ar
                    ? "ابحث في الدورات والمهارات والمدرّبين…"
                    : "Search courses, skills, instructors…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit">
                <span className="btn-content">
                  <span>{ar ? "ابحث" : "Search"}</span>
                </span>
              </button>
            </form>
            <p className="lms-popular">
              <span>{ar ? "الرائج:" : "Popular:"}</span>
              {POPULAR.map((p) => (
                <button key={p.query} type="button" onClick={() => setQuery(p.query)}>
                  <span>{ar ? p.ar : p.en}</span>
                </button>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* STATS — the circuit-board numbers band. */}
      <section className="lms-stats" aria-labelledby="stats-title">
        <div className="page-shell">
          <h2 id="stats-title" className="sr-only">
            {ar ? "أرقامنا تحكي قصّتنا" : "Our numbers tell the story"}
          </h2>
          <Reveal className="stats-wrap">
            <svg
              className="stats-circuit"
              viewBox="0 0 1160 260"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <g className="circuit-traces">
                <path d="M-10 210 H240 V150 H420 V80 H640 V40 H880" />
                <path d="M60 270 V190 H300 V120 H560 V170 H820 V230 H1040" />
                <path d="M1170 50 H980 V110 H800 V60 H620" />
                <path d="M1170 190 H1010 V240 H700 V200 H520 V150" />
                <path d="M180 -10 V60 H360 V130 H180 V200" />
                <path d="M480 -10 V70 H660 V140 H900 V90 H1100" />
              </g>
              <g className="circuit-nodes">
                <circle cx="240" cy="150" r="4" />
                <circle cx="640" cy="40" r="4" />
                <circle cx="300" cy="120" r="4" />
                <circle cx="820" cy="230" r="4" />
                <circle cx="980" cy="110" r="4" />
                <circle cx="620" cy="60" r="4" />
                <circle cx="360" cy="130" r="4" />
                <circle cx="900" cy="90" r="4" />
                <circle cx="520" cy="150" r="4" />
              </g>
              <g className="circuit-pulses">
                <path className="circuit-pulse p1" d="M-10 210 H240 V150 H420 V80 H640 V40 H880" />
                <path
                  className="circuit-pulse p2"
                  d="M60 270 V190 H300 V120 H560 V170 H820 V230 H1040"
                />
                <path className="circuit-pulse p3" d="M1170 50 H980 V110 H800 V60 H620" />
              </g>
            </svg>
            <dl className="stats-band">
              <div>
                <dt>{ar ? "دورة" : "Courses"}</dt>
                <dd>
                  <Counter value={stats.courses} suffix="+" />
                </dd>
              </div>
              <div>
                <dt>{ar ? "طالب" : "Students"}</dt>
                <dd>
                  <Counter value={stats.students} suffix="+" />
                </dd>
              </div>
              <div>
                <dt>{ar ? "مدرّب" : "Trainers"}</dt>
                <dd>
                  <Counter value={stats.instructors} suffix="+" />
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* CATEGORIES — 3D carousel; Browse filters the courses below. */}
      <CategoriesCarousel
        categories={carousel}
        onBrowse={(id) => {
          setFilter(id);
          scrollToCourses();
        }}
      />

      {/* COURSES — live search + category chips. */}
      <section
        className="lms-section lms-courses"
        id="lms-courses"
        aria-labelledby="courses-title"
        ref={coursesRef}
      >
        <div className="page-shell">
          <div className="lms-head">
            <h2 id="courses-title">{ar ? "جديد ورائج" : "New and popular"}</h2>
            <p>
              {ar
                ? "دورات حقيقية من كتالوج الجمعية — بشهادة معتمدة عند الإتمام."
                : "Real courses from the SAAE catalog — certified on completion."}
            </p>
          </div>
          <div
            className="course-filters"
            role="group"
            aria-label={ar ? "تصفية الدورات" : "Filter courses"}
          >
            {[
              { id: "all", label: ar ? "الكل" : "All" },
              ...categories.map((c) => ({ id: c.id, label: catName(c) })),
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          <p className="course-count" role="status">
            <b>{shown.length}</b>{" "}
            <span>{ar ? "دورة" : shown.length === 1 ? "course" : "courses"}</span>
          </p>
          <ul className="course-grid">
            {shown.map((c) => (
              <SkinCourseCard
                key={c.id}
                course={c}
                tone={toneById.get(c.category_id ?? "") ?? "ai"}
              />
            ))}
          </ul>
          <p className="course-empty" hidden={shown.length > 0}>
            {ar
              ? "لا توجد دورات مطابقة لبحثك بعد — جرّب كلمة أخرى."
              : "No courses match your search yet — try another word."}
          </p>
          <p className="courses-more">
            <Link className="action action-secondary" to="/learning-management-system/catalog">
              <span className="btn-content">
                <span>{ar ? "عرض الكتالوج الكامل" : "View the full catalog"}</span>
              </span>
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="lms-section" aria-labelledby="faq-title">
        <div className="page-shell lms-faq">
          <div className="lms-head">
            <h2 id="faq-title">{ar ? "الأسئلة الشائعة" : "Frequently asked questions"}</h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* CLOSING */}
      <section className="lms-closing" aria-labelledby="closing-title">
        <Reveal className="page-shell lms-closing-copy">
          <h2 id="closing-title">
            <span>{ar ? "مهارتك التالية" : "Your next skill"}</span>
            <br />
            <span>{ar ? "تبدأ بدورة واحدة" : "starts with one course"}</span>
          </h2>
          <p>
            {ar
              ? `انضم إلى أكثر من ${stats.students} متعلماً يدرسون بالعربية.`
              : `Join ${stats.students}+ learners already studying in Arabic.`}
          </p>
          <div className="lms-closing-actions">
            <a
              className="action action-primary"
              href="#lms-courses"
              onClick={(e) => {
                e.preventDefault();
                scrollToCourses();
              }}
            >
              <span className="btn-content">
                <span>{ar ? "تصفح الدورات" : "Browse courses"}</span>
              </span>
            </a>
            <Link className="action action-secondary" to="/learning-management-system/signup">
              <span className="btn-content">
                <span>{ar ? "أنشئ حساباً" : "Create account"}</span>
              </span>
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
