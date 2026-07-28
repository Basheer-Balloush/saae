import { Link } from "@tanstack/react-router";
import { BookOpen, Users, Star, MapPin, PlayCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";

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
  is_free: boolean;
  students_count: number;
  rating_avg: number;
  delivery_mode?: string | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const desc = lang === "ar" ? course.description_ar : course.description_en;

  return (
    <Link
      to="/learning-management-system/courses/$id"
      params={{ id: course.slug ?? course.id }}
      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary hover:shadow-soft"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
        {course.cover_url ? (
          <img src={course.cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        ) : (
          <BookOpen className="h-12 w-12 text-primary/40" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{tr[course.level as keyof typeof tr] as string}</span>
          {course.is_free ? (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{tr.free}</span>
          ) : (
            <span dir="ltr" className="inline-flex flex-row items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
              {lang === "ar" ? (
                <>
                  <span dir="rtl">ل.س</span>
                  <span>{course.price.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span>{course.price.toLocaleString()}</span>
                  <span>SYP</span>
                </>
              )}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {desc && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{desc}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.students_count}</span>
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(course.rating_avg).toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}
