import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import type { CourseCardData } from "@/components/lms/CourseCard";
import { SkinCourseCard } from "@/components/lms-skin/SkinCourseCard";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import { loadPublicInstructorCourses } from "@/lib/lms-public-catalog";

export const Route = createFileRoute("/learning-management-system/instructors/$id")({
  head: () => ({ meta: [{ title: "LMS · Instructor" }], links: LMS_SKIN_LINKS }),
  component: InstructorProfile,
});

type Instructor = {
  slug: string;
  full_name: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  bio: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  specialty: string | null;
  specialty_ar: string | null;
  specialty_en: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
};
type Course = CourseCardData & { sale_price: number | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function InstructorProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const [ins, setIns] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrored(false);
      const { data, error } = await supabase.rpc("get_public_instructor", { _key: id });
      if (cancelled) return;
      if (error) {
        console.error("get_public_instructor failed", error.message);
        setIns(null);
        setLoading(false);
        setErrored(true);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : null) as Instructor | null;
      if (!row) {
        setIns(null);
        setCourses([]);
        setLoading(false);
        return;
      }
      // Redirect uuid URLs to canonical slug URL
      if (UUID_RE.test(id) && row.slug && row.slug !== id) {
        navigate({
          to: "/learning-management-system/instructors/$id",
          params: { id: row.slug },
          replace: true,
        });
        return;
      }
      setIns(row);
      const filtered = await loadPublicInstructorCourses(row.slug, () => cancelled);
      if (cancelled) return;
      setCourses(filtered);
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setCourses([]);
      setErrored(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading || errored || !ins) {
    return (
      <section className="profile-cover">
        <div className="page-shell">
          <p className="state-box">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : errored ? (
              ar ? (
                "تعذّر تحميل الملف. حاول مجدداً."
              ) : (
                "Could not load profile. Please try again."
              )
            ) : (
              "404"
            )}
          </p>
        </div>
      </section>
    );
  }

  const totalStudents = courses.reduce((s, c) => s + Number(c.students_count ?? 0), 0);
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + Number(c.rating_avg), 0) / courses.length).toFixed(1)
    : "0.0";

  const name = (lang === "ar" ? ins.full_name_ar : ins.full_name_en) || ins.full_name;
  const sp = (lang === "ar" ? ins.specialty_ar : ins.specialty_en) || ins.specialty;
  const bio = (lang === "ar" ? ins.bio_ar : ins.bio_en) || ins.bio;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("");

  return (
    <>
      <section className="profile-cover" aria-labelledby="instructor-name">
        <p className="ghost-initials" aria-hidden="true">
          {initials}
        </p>
        <div className="page-shell profile-head">
          <div className="profile-id">
            <span className="profile-avatar" aria-hidden="true">
              {ins.avatar_url ? <img src={ins.avatar_url} alt="" /> : initials}
            </span>
            <span className="profile-who">
              <span className="profile-name-row">
                <strong id="instructor-name">{name}</strong>
              </span>
              {sp && <span className="profile-role">{sp}</span>}
            </span>
            {(ins.linkedin_url || ins.github_url) && (
              <span className="profile-actions">
                {ins.linkedin_url && (
                  <a
                    className="action action-secondary"
                    href={ins.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn <span aria-hidden="true">↗</span>
                  </a>
                )}
                {ins.github_url && (
                  <a
                    className="action action-secondary"
                    href={ins.github_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub <span aria-hidden="true">↗</span>
                  </a>
                )}
              </span>
            )}
          </div>
          <dl className="profile-stats profile-stats-3">
            <div>
              <dt>{tr.navCatalog}</dt>
              <dd>
                <b>{courses.length}</b>
              </dd>
            </div>
            <div>
              <dt>{tr.students}</dt>
              <dd>
                <b>{totalStudents}</b>
              </dd>
            </div>
            <div>
              <dt>{tr.reviews}</dt>
              <dd>
                <b>★ {avgRating}</b>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="lms-section" aria-label={name}>
        <div className="page-shell">
          {bio && (
            <article className="pro-card instructor-bio">
              <h2>{ar ? "نبذة" : "About"}</h2>
              <p className="course-desc">{bio}</p>
            </article>
          )}
          <h2 className="dash-subtitle">{tr.featuredCourses}</h2>
          {courses.length === 0 ? (
            <p className="course-empty">{tr.noCourses}</p>
          ) : (
            <ul className="course-grid">
              {courses.map((c) => (
                <SkinCourseCard key={c.id} course={c} tone="ai" />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
