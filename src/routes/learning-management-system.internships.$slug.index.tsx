import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Clock3,
  Loader2,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import {
  getPublicInternshipBySlug,
  isApplyOpen,
  type PublicInternshipDetail,
} from "@/lib/lms-internships-public.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const detailQueryKey = (slug: string) => ["public-internship", slug] as const;

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
      links: [{ rel: "canonical", href: url }],
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
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function InternshipDetail() {
  const { slug } = Route.useParams();
  const { lang, dir } = useLang();
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
  const description = lang === "ar" ? d.description_ar : d.description_en;
  const requirements = lang === "ar" ? d.requirements_ar : d.requirements_en;
  const location = lang === "ar" ? d.location_ar : d.location_en;
  const duration = lang === "ar" ? d.duration_ar : d.duration_en;
  const stipend = lang === "ar" ? d.stipend_ar : d.stipend_en;

  const open = isApplyOpen(d);
  const isClosed = d.status === "closed";
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const applyHref = user
    ? `/learning-management-system/internships/${d.slug}/apply`
    : `/learning-management-system/login?redirect=${encodeURIComponent(
        `/learning-management-system/internships/${d.slug}/apply`,
      )}`;

  return (
    <article className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12" dir={dir}>
      <Link
        to="/learning-management-system/internships"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <Arrow className="h-4 w-4" />
        {t.internshipsTitle}
      </Link>

      {d.cover_url && (
        <div className="mb-6 aspect-[21/9] w-full overflow-hidden rounded-2xl bg-muted">
          <img src={d.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {isClosed && (
            <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300">
              {t.internshipClosed}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight" dir="auto">
          {title}
        </h1>
        {(lang === "ar" ? d.summary_ar : d.summary_en) && (
          <p className="mt-2 text-muted-foreground" dir="auto">
            {lang === "ar" ? d.summary_ar : d.summary_en}
          </p>
        )}
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
        {location && <Meta icon={MapPin} label={t.internshipLocation} value={location} />}
        {duration && <Meta icon={Clock3} label={t.internshipDuration} value={duration} />}
        {stipend && <Meta icon={Wallet} label={t.internshipStipend} value={stipend} />}
        {d.deadline_at && (
          <Meta
            icon={CalendarClock}
            label={t.internshipDeadline}
            value={new Date(d.deadline_at).toLocaleString(lang, { dateStyle: "long", timeStyle: "short" })}
            valueDir="ltr"
          />
        )}
        {typeof d.capacity === "number" && d.capacity > 0 && (
          <Meta
            icon={Users}
            label={lang === "ar" ? "السّعة" : "Capacity"}
            value={String(d.capacity)}
            valueDir="ltr"
          />
        )}
      </dl>

      {description && (
        <Section title={t.internshipDescription} value={description} />
      )}
      {requirements && (
        <Section title={t.internshipRequirements} value={requirements} />
      )}

      <div className="mt-10 sticky bottom-4 flex justify-center">
        {open ? (
          <a href={applyHref}>
            <Button size="lg" className="shadow-lg">
              {user ? t.internshipApply : t.internshipApplyLoginRequired}
            </Button>
          </a>
        ) : (
          <Button size="lg" disabled variant="outline">
            {isClosed ? t.internshipClosed : t.internshipHidden}
          </Button>
        )}
      </div>
    </article>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  valueDir,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  valueDir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-primary" />
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground" dir={valueDir ?? "auto"}>{value}</dd>
      </div>
    </div>
  );
}

function Section({ title, value }: { title: string; value: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed" dir="auto">
        {value}
      </div>
    </section>
  );
}

function SlugNotFound() {
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center" dir={dir}>
      <h1 className="text-2xl font-bold text-foreground">
        {lang === "ar" ? "الفرصة غير متاحة" : "Opportunity unavailable"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t.internshipsEmpty}
      </p>
      <Link to="/learning-management-system/internships" className="mt-6 inline-block text-primary hover:underline">
        {t.internshipsTitle}
      </Link>
    </div>
  );
}

function SlugError({ reset }: { error: Error; reset: () => void }) {
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center" dir={dir}>
      <p className="text-destructive mb-4">{t.errorLoad}</p>
      <Button variant="outline" onClick={reset}>{t.errorRetry}</Button>
    </div>
  );
}
