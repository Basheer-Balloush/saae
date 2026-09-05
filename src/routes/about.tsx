import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { aboutContent } from "@/lib/about-content";
import { PageV2, type RibbonSection } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";
import { COMMUNITY_KEYS } from "@/lib/communityCategories";

type Member = {
  id: string;
  category: "board" | "executive";
  full_name_ar: string;
  full_name_en: string | null;
  position_ar: string;
  position_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  photo_url: string | null;
  display_order: number;
};

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن الجمعية — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      {
        name: "description",
        content:
          "الجمعية السورية للذكاء الصنعي وريادة الأعمال — منظمة شبابية تنشر ثقافة الذكاء الصنعي وريادة الأعمال وتمكّن الشباب السوري من صناعة المستقبل. Syrian Association for AI & Entrepreneurship (SAAE) — a youth-led organization empowering Syrian youth through AI and entrepreneurship.",
      },
      {
        property: "og:title",
        content: "About SAAE — Syrian Association for AI & Entrepreneurship",
      },
      {
        property: "og:description",
        content:
          "We build a knowledge ecosystem that pairs modern technology with the spirit of initiative — training, workshops, and applied projects for Syrian youth.",
      },
      { property: "og:url", content: "https://aisyria.org/about" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "ar", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "en", href: "https://aisyria.org/about" },
      { rel: "alternate", hreflang: "x-default", href: "https://aisyria.org/about" },
    ],
  }),
  component: AboutPage,
});

function ChapterLabel({ n, children }: { n: string; children: string }) {
  return (
    <p className="v2-chapter-label">
      <b>{n}</b>
      <span>{children}</span>
    </p>
  );
}

function AboutPage() {
  const { t } = useLang();
  const a = t.v2.about;

  const ribbon: RibbonSection[] = [
    { id: "story", label: a.chapters.story },
    { id: "direction", label: a.chapters.direction },
    { id: "goals", label: a.chapters.goals },
    { id: "fields", label: a.chapters.fields },
    { id: "values", label: a.chapters.values },
    { id: "communities", label: a.chapters.communities },
    { id: "team", label: a.chapters.team },
    { id: "future", label: a.chapters.future },
  ];

  return (
    <PageV2 ribbonSections={ribbon}>
      <Hero />
      <Story />
      <Direction />
      <Goals />
      <Fields />
      <Values />
      <Communities />
      <section id="team" className="v2-chapter">
        <MembersSection category="board" />
        <MembersSection category="executive" />
      </section>
      <Future />
    </PageV2>
  );
}

/* ---------- 00 HERO ---------- */
function Hero() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;
  const markRef = useRef<HTMLDivElement | null>(null);

  // Cursor-reactive lean, mounted client-side only. Pointer-coarse devices and
  // reduced-motion users keep the static mark.
  useEffect(() => {
    const node = markRef.current;
    if (!node) return;
    if (window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        node.style.setProperty("--lean-x", `${Math.max(-1, Math.min(1, dx)) * 10}px`);
        node.style.setProperty("--lean-y", `${Math.max(-1, Math.min(1, dy)) * 8}px`);
        node.style.setProperty("--lean-r", `${Math.max(-1, Math.min(1, dx)) * 2.4}deg`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="v2-about-opening" id="top">
      <div className="v2-shell v2-opening-grid">
        <div className="v2-opening-copy">
          <p className="v2-eyebrow">{a.eyebrow}</p>
          <h1 className="v2-about-title">{c.hero.title}</h1>
          <p className="v2-about-lede">{a.lede}</p>
          <div className="v2-opening-actions">
            <a className="v2-scroll-cue" href="#story">
              <span>{a.scrollCue}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16M5 13l7 7 7-7" />
              </svg>
            </a>
            <Link to="/" className="v2-ghost-link">
              {c.hero.backHome}
            </Link>
          </div>
        </div>

        <figure className="v2-opening-mark" ref={markRef}>
          <img
            src="/saae/saae-tree.svg"
            alt=""
            aria-hidden="true"
            width={302}
            height={339}
            decoding="async"
          />
          <figcaption className="v2-mark-hint">{a.markHint}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------- 01 STORY ---------- */
function Story() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;

  return (
    <section className="v2-chapter" id="story">
      <div className="v2-shell">
        <ChapterLabel n="01">{a.chapters.story}</ChapterLabel>
        <div className="v2-story-split">
          <Reveal>
            <h2 className="v2-display">{a.storyTitle}</h2>
          </Reveal>
          <div className="v2-prose">
            <Reveal>
              <p className="v2-prose-lead">{c.hero.p1}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <p>{c.hero.p2}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 02 DIRECTION (vision + mission) ---------- */
function Direction() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;
  const branches = [c.vision, c.mission];

  return (
    <section className="v2-chapter is-dark" id="direction">
      <div className="v2-shell">
        <ChapterLabel n="02">{a.chapters.direction}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display">{a.directionTitle}</h2>
        </Reveal>
        <div className="v2-fork">
          {branches.map((branch, i) => (
            <Reveal key={branch.eyebrow} delay={i * 0.08}>
              <article className="v2-branch">
                <p className="v2-branch-eyebrow">{branch.eyebrow}</p>
                <p className="v2-branch-body">{branch.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 03 GOALS ---------- */
function Goals() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;
  const items = c.goals.items;
  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const index = Math.min(active, items.length - 1);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const step = forward ? 1 : -1;
    const next = (index + step + items.length) % items.length;
    setActive(next);
    tabsRef.current[next]?.focus();
  };

  return (
    <section className="v2-chapter" id="goals">
      <div className="v2-shell">
        <ChapterLabel n="03">{a.chapters.goals}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display">{a.goalsTitle}</h2>
        </Reveal>
        <Reveal>
          <p className="v2-section-sub">{c.goals.intro}</p>
        </Reveal>

        <div className="v2-seeds">
          <div
            className="v2-seed-row"
            role="tablist"
            aria-label={c.goals.heading}
            onKeyDown={onKeyDown}
          >
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                id={`v2-seed-${i}`}
                ref={(el) => {
                  tabsRef.current[i] = el;
                }}
                aria-controls="v2-seed-panel"
                aria-selected={i === index}
                tabIndex={i === index ? 0 : -1}
                className={i === index ? "is-active" : undefined}
                onClick={() => setActive(i)}
              >
                <span className="v2-seed-dot" aria-hidden="true" />
                <span>{String(i + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>

          <div
            className="v2-seed-panel"
            role="tabpanel"
            id="v2-seed-panel"
            aria-labelledby={`v2-seed-${index}`}
            tabIndex={0}
          >
            <p className="v2-seed-index" aria-hidden="true">
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>/ {String(items.length).padStart(2, "0")}</span>
            </p>
            <p className="v2-seed-action">{items[index]}</p>
            <p className="v2-seed-hint">{a.goalsHint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 04 FIELDS ---------- */
function Fields() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;

  return (
    <section className="v2-chapter is-tint" id="fields">
      <div className="v2-shell">
        <ChapterLabel n="04">{a.chapters.fields}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display">{a.fieldsTitle}</h2>
        </Reveal>
        <Reveal>
          <p className="v2-section-sub">{c.fields.intro}</p>
        </Reveal>
        <ol className="v2-fields">
          {c.fields.items.map((item, i) => (
            <Reveal key={item} delay={i * 0.05}>
              <li className="v2-field">
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{item}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 05 VALUES ---------- */
function Values() {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const a = t.v2.about;

  return (
    <section className="v2-chapter" id="values">
      <div className="v2-shell">
        <ChapterLabel n="05">{a.chapters.values}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display">{a.valuesTitle}</h2>
        </Reveal>
        <Reveal>
          <p className="v2-section-sub">{c.values.intro}</p>
        </Reveal>
        <Reveal>
          <ul className="v2-canopy">
            {c.values.items.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal>
          <p className="v2-canopy-note">{a.valuesNote}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 06 COMMUNITIES ---------- */
function Communities() {
  const { t } = useLang();
  const a = t.v2.about;

  return (
    <section className="v2-chapter is-dark" id="communities">
      <div className="v2-shell">
        <ChapterLabel n="06">{a.chapters.communities}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display">{a.communitiesTitle}</h2>
        </Reveal>
        <Reveal>
          <p className="v2-section-sub">{a.communitiesIntro}</p>
        </Reveal>
        <ul className="v2-community-grid">
          {COMMUNITY_KEYS.map((key, i) => {
            const card = t.communities.cards[key];
            return (
              <Reveal key={key} delay={(i % 3) * 0.05}>
                <li className="v2-community">
                  <Link to="/communities/$key" params={{ key }} className="v2-community-link">
                    <span className="v2-community-n">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{card.title}</h3>
                    <p className="v2-community-line">{card.desc}</p>
                    <span className="v2-community-cta">{t.communities.discover}</span>
                  </Link>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 07 MEMBERS ---------- */
function MembersSection({ category }: { category: "board" | "executive" }) {
  const { lang, t } = useLang();
  const c = aboutContent[lang];
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .eq("category", category)
      .order("display_order", { ascending: true })
      .then(({ data }) => setMembers((data ?? []) as Member[]));
  }, [category]);

  const title = category === "board" ? c.members.boardTitle : c.members.executiveTitle;
  const subtitle = category === "board" ? c.members.boardSubtitle : c.members.executiveSubtitle;

  if (members.length === 0) return null;

  const pick = (arVal: string | null, enVal: string | null) =>
    lang === "ar" ? (arVal ?? enVal ?? "") : (enVal ?? arVal ?? "");

  return (
    <div className="v2-shell v2-team">
      <ChapterLabel n={category === "board" ? "07" : "08"}>{t.v2.about.teamEyebrow}</ChapterLabel>
      <Reveal>
        <h2 className="v2-display">{title}</h2>
      </Reveal>
      <Reveal>
        <p className="v2-section-sub">{subtitle}</p>
      </Reveal>

      <div className="v2-member-grid">
        {members.map((m, i) => {
          const name = pick(m.full_name_ar, m.full_name_en);
          const bio = pick(m.bio_ar, m.bio_en);
          return (
            <Reveal key={m.id} delay={(i % 4) * 0.05}>
              <article className="v2-member">
                <div className="v2-member-photo">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={name} loading="lazy" decoding="async" />
                  ) : (
                    <span aria-hidden="true">{name.trim().charAt(0) || "•"}</span>
                  )}
                </div>
                <h3>{name}</h3>
                <p className="v2-member-role">{pick(m.position_ar, m.position_en)}</p>
                {bio ? <p className="v2-member-bio">{bio}</p> : null}
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 09 FUTURE ---------- */
function Future() {
  const { t } = useLang();
  const a = t.v2.about;

  return (
    <section className="v2-chapter is-dark is-close" id="future">
      <div className="v2-shell">
        <ChapterLabel n="09">{a.chapters.future}</ChapterLabel>
        <Reveal>
          <h2 className="v2-display v2-display-xl">{a.futureTitle}</h2>
        </Reveal>
        <Reveal>
          <Link to="/contact" className="v2-solid-button">
            <span>{a.futureCta}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 19 19 5M9 5h10v10" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
