import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLang } from "@/lib/i18n";
import { WaitlistDialog } from "@/components/initiative/WaitlistDialog";
import { DirectPaymentDialog } from "@/components/initiative/DirectPaymentDialog";
import { CorporateDonationDialog } from "@/components/initiative/CorporateDonationDialog";
import {
  getInitiativeStats,
  getInitiativeSettings,
  getTopDonors,
} from "@/lib/initiative.functions";
import { Sparkles, Target, HeartHandshake, ArrowRight, ArrowLeft } from "lucide-react";
import { PageV2, type RibbonSection } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";

export const Route = createFileRoute("/one-million-initiative-home")({
  head: () => ({
    meta: [
      { title: "مبادرة مليون مستخدم ذكاء اصطناعي سوري — الصفحة التفاعلية" },
      {
        name: "description",
        content:
          "ادعم أو سجّل في مبادرة مليون مستخدم ذكاء اصطناعي سوري. تابع الإحصائيات الحية وقائمة الرعاة.",
      },
      { property: "og:title", content: "مبادرة مليون مستخدم — تفاعلي" },
      { property: "og:description", content: "تبرع، ادفع وابدأ، أو انضم لقائمة الانتظار." },
    ],
  }),
  component: InitiativeHome,
});

type DonorRow = {
  donor_name: string;
  donor_display_name: string | null;
  logo_url: string | null;
  total_chairs: number;
  total_amount: number;
};

function InitiativeHome() {
  const { lang, dir, t: dict } = useLang();
  const isAr = lang === "ar";
  const t = dict.v2.initiative;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const nf = useMemo(() => new Intl.NumberFormat(isAr ? "ar-EG" : "en-US"), [isAr]);

  const statsFn = useServerFn(getInitiativeStats);
  const settingsFn = useServerFn(getInitiativeSettings);
  const donorsFn = useServerFn(getTopDonors);

  const [stats, setStats] = useState<{
    target: number;
    done: number;
    waiting: number;
    coveredUnassigned: number;
    totalFunded: number;
  } | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [companies, setCompanies] = useState<DonorRow[]>([]);
  const [individuals, setIndividuals] = useState<DonorRow[]>([]);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [panel, setPanel] = useState<"about" | "mission" | "values">("about");

  useEffect(() => {
    const load = () => {
      statsFn()
        .then(setStats)
        .catch(() => {});
      donorsFn({ data: { limit: 10, donorType: "company" } })
        .then(setCompanies)
        .catch(() => {});
      donorsFn({ data: { limit: 10, donorType: "individual" } })
        .then(setIndividuals)
        .catch(() => {});
    };
    load();
    settingsFn()
      .then(setSettings)
      .catch(() => {});
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [statsFn, settingsFn, donorsFn]);

  const target = stats?.target ?? 1000000;
  const done = stats?.done ?? 0;
  const waiting = stats?.waiting ?? 0;
  const covered = stats?.coveredUnassigned ?? 0;
  const remaining = Math.max(target - done - waiting - covered, 0);

  // Animated count-up for the centre number
  const [displayDone, setDisplayDone] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = displayDone;
    const to = done;
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayDone(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const ready = stats !== null;
  const fmt = (n: number) => (ready ? nf.format(n) : "—");

  // Dial: segments sized against the moving part of the goal so the ring stays
  // readable even while the absolute numbers are tiny next to one million.
  const moving = done + waiting + covered;
  const segments = [
    { key: "done", label: t.trained, value: done, color: "var(--v2-turquoise-lift)" },
    { key: "waiting", label: t.waitlist, value: waiting, color: "var(--v2-olive-lift)" },
    { key: "covered", label: t.sponsoredSeats, value: covered, color: "var(--v2-teal)" },
  ];
  const R = 78;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const share = moving > 0 ? seg.value / moving : 0;
    const arc = { ...seg, share, dash: share * CIRC, start: offset };
    offset += share * CIRC;
    return arc;
  });
  const goalShare = target > 0 ? (moving / target) * 100 : 0;

  const metrics = [
    { key: "done", label: t.trained, value: done, share: moving ? (done / moving) * 100 : 0 },
    { key: "waiting", label: t.waitlist, value: waiting, share: moving ? (waiting / moving) * 100 : 0 },
    {
      key: "covered",
      label: t.sponsoredSeats,
      value: covered,
      share: moving ? (covered / moving) * 100 : 0,
    },
    {
      key: "remaining",
      label: t.goalRemaining,
      value: remaining,
      share: target ? (remaining / target) * 100 : 0,
      ofGoal: true,
    },
  ];

  const panels = {
    about: {
      title: t.about,
      short: t.aboutShort,
      Icon: Sparkles,
      body: (isAr ? settings?.about_ar : settings?.about_en) || t.loading,
    },
    mission: {
      title: t.mission,
      short: t.missionShort,
      Icon: Target,
      body: (isAr ? settings?.mission_ar : settings?.mission_en) || t.loading,
    },
    values: {
      title: t.values,
      short: t.valuesShort,
      Icon: HeartHandshake,
      body: (isAr ? settings?.values_ar : settings?.values_en) || t.loading,
    },
  } as const;

  const ribbon: RibbonSection[] = [
    { id: "progress", label: t.progressEyebrow },
    { id: "blueprint", label: t.blueprintEyebrow },
    { id: "sponsors", label: t.sponsorsEyebrow },
    { id: "participate", label: t.participateEyebrow },
  ];

  const paths = [
    {
      key: "pay",
      chip: "$1",
      title: t.payStart,
      copy: t.payStartCopy,
      cta: t.startNow,
      onClick: () => setPayOpen(true),
      variant: "is-start",
    },
    {
      key: "wait",
      chip: null,
      title: t.joinWaitlist,
      copy: t.joinWaitlistCopy,
      cta: t.reservePlace,
      onClick: () => setWaitlistOpen(true),
      variant: "is-wait",
    },
    {
      key: "sponsor",
      chip: null,
      title: t.sponsorSeats,
      copy: t.sponsorSeatsCopy,
      cta: t.openSeats,
      onClick: () => setDonateOpen(true),
      variant: "is-sponsor",
    },
  ];

  return (
    <PageV2 ribbonSections={ribbon}>
      {/* HERO */}
      <section className="v2-init-hero">
        <p className="v2-ghost-million" aria-hidden="true">
          MILLION
        </p>
        <div className="v2-shell v2-init-hero-inner">
          <p className="v2-eyebrow">{t.heroEyebrow}</p>
          <h1 className="v2-init-title">
            {t.oneMillion} <span className="v2-init-title-rest">{t.heroTitleRest}</span>
          </h1>
          <p className="v2-init-lede">{t.heroLede}</p>
          <div className="v2-contact-actions">
            <button type="button" className="v2-solid-button" onClick={() => setPayOpen(true)} aria-haspopup="dialog">
              <span>{t.payOneStart}</span>
            </button>
            <button
              type="button"
              className="v2-ghost-link"
              onClick={() => setWaitlistOpen(true)}
              aria-haspopup="dialog"
            >
              <span>{t.joinWaitlist}</span>
            </button>
          </div>
        </div>
      </section>

      {/* PROGRESS */}
      <section className="v2-chapter is-dark" id="progress">
        <div className="v2-shell">
          <p className="v2-eyebrow">{t.progressEyebrow}</p>
          <Reveal>
            <h2 className="v2-display">{t.progressTitle}</h2>
          </Reveal>
          <p className="v2-section-sub">{t.progressCopy}</p>

          <div className="v2-dial-grid">
            <div className="v2-dial" role="img" aria-label={`${fmt(moving)} ${t.seatsMotion}`}>
              <svg viewBox="0 0 200 200" className="v2-dial-svg" aria-hidden="true">
                <circle cx="100" cy="100" r={R} className="v2-dial-track" />
                {arcs.map((a) => (
                  <circle
                    key={a.key}
                    cx="100"
                    cy="100"
                    r={R}
                    className="v2-dial-arc"
                    stroke={a.color}
                    strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
                    strokeDashoffset={-a.start}
                  />
                ))}
              </svg>
              <div className="v2-dial-center">
                <strong>{ready ? nf.format(displayDone) : "—"}</strong>
                <span>{t.seatsMotion}</span>
                <small>
                  {t.goalLabel}: {fmt(target)}
                </small>
              </div>
            </div>

            <div className="v2-metric-strip">
              {metrics.map((m, i) => (
                <Reveal key={m.key} delay={i * 0.05}>
                  <article className="v2-metric">
                    <span>{m.label}</span>
                    <strong>{fmt(m.value)}</strong>
                    <em>
                      <b>{ready ? `${m.share.toFixed(1)}%` : "—"}</b>{" "}
                      {m.ofGoal ? t.shareOfGoal : t.shareOfDial}
                    </em>
                  </article>
                </Reveal>
              ))}
              <p className="v2-goal-line">
                <span
                  className="v2-goal-fill"
                  style={{ width: `${Math.min(Math.max(goalShare, 0.6), 100)}%` }}
                />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLUEPRINT */}
      <section className="v2-chapter" id="blueprint">
        <div className="v2-shell">
          <p className="v2-eyebrow">{t.blueprintEyebrow}</p>
          <Reveal>
            <h2 className="v2-display">{t.blueprintTitle}</h2>
          </Reveal>
          <p className="v2-section-sub">{t.blueprintIntro}</p>

          <div className="v2-blueprint">
            <div className="v2-blueprint-tabs" role="tablist" aria-label={t.blueprintEyebrow}>
              {(Object.keys(panels) as Array<keyof typeof panels>).map((key) => {
                const p = panels[key];
                const active = panel === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    id={`v2-tab-${key}`}
                    aria-selected={active}
                    aria-controls={`v2-panel-${key}`}
                    tabIndex={active ? 0 : -1}
                    className={active ? "is-active" : undefined}
                    onClick={() => setPanel(key)}
                  >
                    <p.Icon aria-hidden="true" />
                    <strong>{p.title}</strong>
                    <small>{p.short}</small>
                  </button>
                );
              })}
            </div>
            <div
              className="v2-blueprint-panel"
              role="tabpanel"
              id={`v2-panel-${panel}`}
              aria-labelledby={`v2-tab-${panel}`}
            >
              <h3>{panels[panel].title}</h3>
              <p>{panels[panel].body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      <section className="v2-chapter is-dark" id="sponsors">
        <div className="v2-shell">
          <p className="v2-eyebrow">{t.sponsorsEyebrow}</p>
          <Reveal>
            <h2 className="v2-display">{t.sponsorsTitle}</h2>
          </Reveal>

          <div className="v2-sponsor-summary">
            <strong>{fmt(stats?.totalFunded ?? 0)}</strong>
            <span>{t.seatsCovered}</span>
          </div>

          <div className="v2-boards">
            <DonorBoard
              title={t.companies}
              rows={companies}
              empty={t.emptyCompanies}
              labels={{ rank: t.rank, sponsor: t.sponsor, seats: t.seatsOpened, amount: t.amount }}
              nf={nf}
            />
            <DonorBoard
              title={t.individuals}
              rows={individuals}
              empty={t.emptyIndividuals}
              labels={{ rank: t.rank, sponsor: t.sponsor, seats: t.seatsOpened, amount: t.amount }}
              nf={nf}
            />
          </div>

          <Link to="/one-million-initiative-donors" className="v2-ghost-link v2-boards-link">
            <span>{t.viewAllSponsors}</span>
            <Arrow className="v2-btn-icon" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* PARTICIPATE */}
      <section className="v2-chapter" id="participate">
        <div className="v2-shell">
          <p className="v2-eyebrow">{t.participateEyebrow}</p>
          <Reveal>
            <h2 className="v2-display">{t.participateTitle}</h2>
          </Reveal>

          <div className="v2-paths">
            {paths.map((p, i) => (
              <Reveal key={p.key} delay={i * 0.06}>
                <button
                  type="button"
                  className={`v2-path-card ${p.variant}`}
                  onClick={p.onClick}
                  aria-haspopup="dialog"
                >
                  <span className="v2-path-visual" aria-hidden="true">
                    <span className="v2-path-halo" />
                    {p.chip ? <span className="v2-path-chip">{p.chip}</span> : null}
                  </span>
                  <span className="v2-path-title">{p.title}</span>
                  <span className="v2-path-copy">{p.copy}</span>
                  <span className="v2-path-cta">
                    {p.cta}
                    <Arrow className="v2-btn-icon" aria-hidden="true" />
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="v2-chapter v2-init-closing">
        <div className="v2-shell">
          <p className="v2-eyebrow">{t.closingEyebrow}</p>
          <h2 className="v2-display">
            {t.oneMillion}
            <br />
            {t.beginsOne}
          </h2>
          <p className="v2-section-sub">{t.closingCopy}</p>
          <button
            type="button"
            className="v2-solid-button"
            onClick={() => setPayOpen(true)}
            aria-haspopup="dialog"
          >
            <span>{t.joinInitiative}</span>
          </button>
        </div>
      </section>

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} lang={lang} />
      <DirectPaymentDialog open={payOpen} onOpenChange={setPayOpen} lang={lang} />
      <CorporateDonationDialog open={donateOpen} onOpenChange={setDonateOpen} lang={lang} />
    </PageV2>
  );
}

function DonorBoard({
  title,
  rows,
  empty,
  labels,
  nf,
}: {
  title: string;
  rows: DonorRow[];
  empty: string;
  labels: { rank: string; sponsor: string; seats: string; amount: string };
  nf: Intl.NumberFormat;
}) {
  const top = rows.reduce((m, r) => Math.max(m, Number(r.total_chairs) || 0), 0);
  return (
    <div className="v2-board">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="v2-board-empty">{empty}</p>
      ) : (
        <>
          <div className="v2-board-head">
            <span>{labels.rank}</span>
            <span>{labels.sponsor}</span>
            <span>{labels.seats}</span>
            <span>{labels.amount}</span>
          </div>
          <ol className="v2-board-list">
            {rows.map((d, i) => (
              <li key={d.donor_name} style={{ ["--impact" as string]: `${top ? (Number(d.total_chairs) / top) * 100 : 0}%` }}>
                <span className="v2-board-rank">{nf.format(i + 1)}</span>
                <span className="v2-board-name">
                  {d.logo_url ? <img src={d.logo_url} alt="" loading="lazy" /> : <i aria-hidden="true" />}
                  <strong>{d.donor_display_name || d.donor_name}</strong>
                </span>
                <span className="v2-board-impact">
                  <b aria-hidden="true" />
                  <strong>{nf.format(Number(d.total_chairs))}</strong>
                </span>
                <span className="v2-board-amount" dir="ltr">
                  ${nf.format(Number(d.total_amount))}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
