import { useLang } from "@/lib/i18n";
import {
  IconCategoryAI,
  IconCategoryBusiness,
  IconCategoryDesign,
  IconCategoryEducation,
  IconCategoryEngineering,
  IconCategoryGrowth,
  IconCategoryHealth,
  IconCategoryProgramming,
} from "./icons";

export type HomeCategory = { id: string; name: string; count: number; tone: string };

export function ToneIcon({ tone }: { tone: string }) {
  if (tone === "programming") return <IconCategoryProgramming />;
  if (tone === "business") return <IconCategoryBusiness />;
  if (tone === "health") return <IconCategoryHealth />;
  if (tone === "education") return <IconCategoryEducation />;
  if (tone === "engineering") return <IconCategoryEngineering />;
  if (tone === "design") return <IconCategoryDesign />;
  if (tone === "research") return <IconCategoryGrowth />;
  return <IconCategoryAI />;
}

const courseWord = (n: number, ar: boolean) =>
  ar ? (n === 1 ? "دورة" : "دورات") : n === 1 ? "course" : "courses";

/**
 * Every category with courses, as one tidy grid of tiles (3 columns on
 * desktop, 2 on tablets and phones). It replaced the rotating 3D carousel,
 * which showed one category at a time and clipped the rest on small screens.
 * A tile hands its category to `onBrowse`, which filters the course list.
 */
export function CategoriesGrid({
  categories,
  onBrowse,
}: {
  categories: HomeCategory[];
  onBrowse: (id: string) => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  if (categories.length === 0) return null;

  return (
    <section className="lms-section cats-showcase" aria-labelledby="cats-title">
      <div className="cats-bg" aria-hidden="true">
        <span className="cats-bg-glow" />
      </div>
      <div className="page-shell cats-shell">
        <div className="lms-head cats-head">
          <h2 id="cats-title">{ar ? "استكشف الفئات" : "Explore categories"}</h2>
          <p>{ar ? "اختر مجالاً لتعرض دوراته فقط." : "Pick a field to see just its courses."}</p>
        </div>
        <ul className="cat-tiles">
          {categories.map((c) => {
            const count = `${c.count} ${courseWord(c.count, ar)}`;
            return (
              <li key={c.id} className="cat-card cat-tile">
                <button
                  type="button"
                  aria-label={`${c.name} — ${count}`}
                  onClick={() => onBrowse(c.id)}
                >
                  <span className={`cat-visual cat-${c.tone}`} aria-hidden="true">
                    <ToneIcon tone={c.tone} />
                  </span>
                  <span className="cat-tile-body">
                    <b>{c.name}</b>
                    <span className="cat-tile-meta">
                      {count}
                      <span className="cat-go" aria-hidden="true">
                        {ar ? "←" : "→"}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
