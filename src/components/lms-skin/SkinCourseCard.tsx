import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { isCourseEnded } from "@/lib/lms-course-ended";
import type { CourseCardData } from "@/components/lms/CourseCard";
import { IconCategoryAI, IconCategoryBusiness, IconCategoryProgramming } from "./icons";
import { resizedImage, resizedSrcSet } from "@/lib/image-url";

const TONE_ICONS: Record<string, ComponentType> = {
  programming: IconCategoryProgramming,
  business: IconCategoryBusiness,
};

/** A database course in Moaz's card design; `tone` picks the cat-* gradient. */
export function SkinCourseCard({ course, tone }: { course: CourseCardData; tone: string }) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const ended = isCourseEnded(course);
  const Icon = TONE_ICONS[tone] ?? IconCategoryAI;
  const rating = Number(course.rating_avg ?? 0);
  const students = Number(course.students_count ?? 0);

  return (
    <li className="course-card">
      <Link to="/learning-management-system/courses/$id" params={{ id: course.slug ?? course.id }}>
        <div className={`course-thumb cat-${tone}`} aria-hidden="true">
          {course.cover_url ? <img src={resizedImage(course.cover_url, 720)} srcSet={resizedSrcSet(course.cover_url, [480, 720, 1080])} sizes="(max-width: 700px) 92vw, 380px" alt="" loading="lazy" decoding="async" /> : <Icon />}
          {ended ? <span className="course-ended">{tr.courseEndedShort}</span> : null}
        </div>
        <div className="course-body">
          <span className="course-tags">
            <span>{tr[course.level as keyof typeof tr] as string}</span>
            {course.delivery_mode === "online" ? (
              <span>{tr.deliveryOnline}</span>
            ) : course.delivery_mode === "onsite" ? (
              <span>{tr.deliveryOnsite}</span>
            ) : null}
            <span className={course.is_free ? "tag-free" : undefined}>
              <CoursePrice
                price={course.price}
                salePrice={course.sale_price}
                isFree={course.is_free}
                lang={lang}
                freeLabel={tr.free}
                size="sm"
              />
            </span>
          </span>
          <h3>{title}</h3>
          {ended ? <span className="sr-only">{tr.courseEndedSr}</span> : null}
          {/* Zero counts read as "nobody wants this": show only real numbers. */}
          {students > 0 || rating > 0 ? (
            <span className="course-meta">
              {students > 0 ? (
                <span>
                  <b>{students}</b> {tr.students}
                </span>
              ) : null}
              {rating > 0 ? (
                <span>
                  ★ <b>{rating.toFixed(1)}</b>
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
