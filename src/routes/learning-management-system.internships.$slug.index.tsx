import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import {
  getPublicInternshipBySlug,
  getApplyState,
  type PublicInternshipDetail,
} from "@/lib/lms-internships-public.functions";
import { SubHero } from "@/components/lms-skin/SubHero";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const detailQueryKey = (slug: string) => ["public-internship", slug] as const;

export const Route = createFileRoute("/learning-management-system/internships/$slug/")({
  loader: async ({ params, context }) => {
    // TanStack Query cache via context.queryClient
    const detail = await context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: detailQueryKey(params.slug),
        queryFn: () => getPublicInternshipBySlug({ data: { slug: params.slug } }),
        staleTime: 60_000,
      }),
    );
    if (!detail) throw notFound();
    return detail;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Internship — SAAE" },
          { name: "robots", content: "noindex" },
        ],
        links: LMS_SKIN_LINKS,
      };
    }
    const d = loaderData as PublicInternshipDetail;
    const url = `https://aisyria.org/learning-management-system/internships/${params.slug}`;
    const titleAr = `${d.title_ar} — منصّة التدريب والتعلّم`;
    const titleEn = `${d.title_en || d.title_ar} — SAAE Training and Learning Platform`;
    const descAr = d.summary_ar ?? `فرصة تدريبية: ${d.title_ar}`;
    const descEn = d.summary_en ?? `Internship opportunity: ${d.title_en || d.title_ar}`;
    return {
      meta: [
        { title: titleEn },
        { name: "description", content: descEn },
        { property: "og:title", content: titleEn },
        { property: "og:description", content: descEn },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "en_US" },
        { property: "og:locale:alternate", content: "ar_SY" },
        { property: "og:title:ar", content: titleAr },
        { property: "og:description:ar", content: descAr },
        ...(d.cover_url
          ? [
              { property: "og:image", content: d.cover_url },
              { name: "twitter:image", content: d.cover_url },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : [{ name: "twitter:card", content: "summary" }]),
      ],
      links: [{ rel: "canonical", href: url }, ...LMS_SKIN_LINKS],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: d.title_en || d.title_ar,
            description: descEn,
            datePosted: d.opens_at ?? d.updated_at,
            validThrough: d.deadline_at ?? undefined,
            employmentType: "INTERN",
            hiringOrganization: {
              "@type": "Organization",
              name: "SAAE",
              sameAs: "https://aisyria.org",
            },
            jobLocation: d.location_en
              ? {
                  "@type": "Place",
                  address: { "@type": "PostalAddress", addressLocality: d.location_en },
                }
              : undefined,
          }),
        },
      ],
    };
  },
  notFoundComponent: SlugNotFound,
  errorComponent: SlugError,
  component: () => (
    <Suspense fallback={<CenteredSpinner />}>
      <InternshipDetail />
    </Suspense>
  ),
});

function CenteredSpinner() {
  return (
    <section className="lms-subhero lms-hero">
      <div className="page-shell">
        <p className="state-box">
          <Loader2 className="h-6 w-6 animate-spin" />
        </p>
      </div>
    </section>
  );
}

/* Requirements arrive as free text; each non-empty line becomes a step. */
const toLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*▪·]|\d+[.)-])\s*/, "").trim())
    .filter(Boolean);

function InternshipDetail() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const t = lmsInternshipsT[lang];
  const { user } = useLmsAuth();
  const getFn = useServerFn(getPublicInternshipBySlug);

  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: detailQueryKey(slug),
      queryFn: () => getFn({ data: { slug } }),
      staleTime: 60_000,
    }),
  );

  if (!data) return null; // notFound handled at loader
  const d = data as PublicInternshipDetail;

  const title = lang === "ar" ? d.title_ar : d.title_en || d.title_ar;
  const summary = lang === "ar" ? d.summary_ar : d.summary_en;
  const description = lang === "ar" ? d.description_ar : d.description_en;
  const requirements = lang === "ar" ? d.requirements_ar : d.requirements_en;
  const location = lang === "ar" ? d.location_ar : d.location_en;
  const duration = lang === "ar" ? d.duration_ar : d.duration_en;
  const stipend = lang === "ar" ? d.stipend_ar : d.stipend_en;

  const applyState = getApplyState(d);
  const open = applyState === "open";
  const closedNote = {
    open: "",
    not_open_yet: d.opens_at
      ? `${t.internshipOpensOn} ${new Date(d.opens_at).toLocaleString(lang, { dateStyle: "long", timeStyle: "short" })}`
      : t.internshipOpensSoon,
    deadline_passed: t.internshipDeadlinePassed,
    closed: t.internshipClosed,
    unavailable: t.internshipHidden,
  }[applyState];

  const applyHref = user
    ? `/learning-management-system/internships/${d.slug}/apply`
    : `/learning-management-system/login?redirect=${encodeURIComponent(
        `/learning-management-system/internships/${d.slug}/apply`,
      )}`;

  const facts = [
    location && { label: t.internshipLocation, value: location },
    duration && { label: t.internshipDuration, value: duration },
    stipend && { label: t.internshipStipend, value: stipend },
    d.deadline_at && {
      label: t.internshipDeadline,
      value: new Date(d.deadline_at).toLocaleString(lang, { dateStyle: "long", timeStyle: "short" }),
    },
    typeof d.capacity === "number" && d.capacity > 0 && { label: ar ? "السّعة" : "Capacity", value: String(d.capacity) },
  ].filter((f): f is { label: string; value: string } => !!f);
  const reqLines = requirements ? toLines(requirements) : [];

  return (
    <>
      <SubHero
        id="intern-detail-title"
        eyebrow={t.internshipsTitle}
        titleSpans={[title]}
        titleClassName="course-page-title"
        lede={summary ?? undefined}
        before={
          <nav className="course-crumbs" aria-label={ar ? "أنت هنا" : "You are here"}>
            <Link to="/learning-management-system/internships">{t.internshipsTitle}</Link>
            <span aria-hidden="true">/</span>
            <span dir="auto">{title}</span>
          </nav>
        }
        copyChildren={
          !open ? (
            <p className="course-tags course-hero-tags">
              <span>{closedNote}</span>
            </p>
          ) : null
        }
      >
        {d.cover_url ? (
          <div className="course-hero-cover">
            <img src={d.cover_url} alt="" />
          </div>
        ) : null}
      </SubHero>

      {facts.length > 0 && (
        <section className="lms-section" aria-label={ar ? "معلومات أساسية" : "Key facts"} style={{ paddingBlock: 0 }}>
          <div className="page-shell intern-facts">
            {facts.map((f) => (
              <p key={f.label} className="pro-card">
                <span className="side-label">{f.label}</span>
                <b dir="auto">{f.value}</b>
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="lms-section" aria-label={title}>
        <div className="page-shell course-layout">
          <div className="course-story">
            {description ? (
              <article className="pro-card">
                <h2>{t.internshipDescription}</h2>
                <p className="course-desc" dir="auto">
                  {description}
                </p>
              </article>
            ) : null}
          </div>

          <aside className="course-side">
            {reqLines.length > 0 && (
              <article className="pro-card">
                <h2>{t.internshipRequirements}</h2>
                <ol className="req-ladder">
                  {reqLines.map((line, i) => (
                    <li key={i} dir="auto">
                      {line}
                    </li>
                  ))}
                </ol>
              </article>
            )}
            <article className="pro-card">
              <p className="side-label">{ar ? "التقديم" : "Apply"}</p>
              <div className="enroll-actions">
                {open ? (
                  <a className="action action-primary" href={applyHref}>
                    {user ? t.internshipApply : t.internshipApplyLoginRequired}
                  </a>
                ) : (
                  <div className="enroll-note is-closed">{closedNote}</div>
                )}
              </div>
            </article>
          </aside>
        </div>
      </section>
    </>
  );
}

function SlugNotFound() {
  const { lang } = useLang();
  const t = lmsInternshipsT[lang];
  return (
    <SubHero
      id="intern-missing-title"
      eyebrow={t.internshipsTitle}
      titleSpans={[lang === "ar" ? "الفرصة غير متاحة" : "Opportunity unavailable"]}
      titleClassName="course-page-title"
      lede={t.internshipsEmpty}
      copyChildren={
        <p style={{ marginTop: 28 }}>
          <Link to="/learning-management-system/internships" className="action action-primary">
            {t.internshipsTitle}
          </Link>
        </p>
      }
    />
  );
}

function SlugError({ reset }: { error: Error; reset: () => void }) {
  const { lang } = useLang();
  const t = lmsInternshipsT[lang];
  return (
    <SubHero
      id="intern-error-title"
      eyebrow={t.internshipsTitle}
      titleSpans={[t.errorLoad]}
      titleClassName="course-page-title"
      copyChildren={
        <p style={{ marginTop: 28 }}>
          <button type="button" className="action action-primary" onClick={reset}>
            {t.errorRetry}
          </button>
        </p>
      }
    />
  );
}
