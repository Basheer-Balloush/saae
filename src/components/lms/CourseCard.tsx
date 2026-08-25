import { Link } from "@tanstack/react-router";
import { BookOpen, Users, Star, MapPin, PlayCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { isCourseEnded } from "@/lib/lms-course-ended";
import { cn } from "@/lib/utils";

export type CourseCardData = {
  id: string;
  slug?: string | null;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  level: string;
  price: number;
  sale_price?: number | null;
  is_free: boolean;
  students_count: number;
  rating_avg: number;
  delivery_mode?: string | null;
  end_date?: string | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const desc = lang === "ar" ? course.description_ar : course.description_en;
  const ended = isCourseEnded(course);

  return (
    <Link
      to="/learning-management-system/courses/$id"
      params={{ id: course.slug ?? course.id }}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary hover:shadow-soft",
        ended && "course-card-ended",
      )}
    >
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
        {ended && <CourseEndedStamp />}
        {course.cover_url ? (
          <img
            src={course.cover_url}
            alt={title}
            className={cn(
              "w-full h-full object-cover group-hover:scale-105 transition-transform",
              ended && "course-card-ended-media",
            )}
            loading="lazy"
          />
        ) : (
          <BookOpen className="h-12 w-12 text-primary/40" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {tr[course.level as keyof typeof tr] as string}
          </span>
          {course.delivery_mode === "online" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5">
              <PlayCircle className="h-3 w-3" />
              {tr.deliveryOnline}
            </span>
          ) : course.delivery_mode === "onsite" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
              <MapPin className="h-3 w-3" />
              {tr.deliveryOnsite}
            </span>
          ) : null}
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
            <CoursePrice
              price={course.price}
              salePrice={course.sale_price}
              isFree={course.is_free}
              lang={lang}
              freeLabel={tr.free}
              size="sm"
            />
          </span>
        </div>
        <h3 className="mt-2 font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {desc && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{desc}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {Number(course.students_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {Number(course.rating_avg).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
