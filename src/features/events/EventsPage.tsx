import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MapPin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, Loading, PageHeader, Pill, useT } from "@/components/console/ui";
import { listEvents } from "./lib/events.functions";
import {
  eventPhase,
  eventImageUrl,
  formatEventDate,
  orderedDays,
  TOOL_NAMES,
  type EventRecord,
} from "./lib/events";
import { EventEditor } from "./EventEditor";

const PHASE_NAMES = {
  all: { ar: "الكل", en: "All" },
  ongoing: { ar: "جارية", en: "Ongoing" },
  upcoming: { ar: "قادمة", en: "Upcoming" },
  past: { ar: "سابقة", en: "Past" },
  draft: { ar: "مسودات", en: "Drafts" },
  archived: { ar: "مؤرشفة", en: "Archived" },
};
export function EventsPage() {
  const { t, lang } = useT();
  const fetch = useServerFn(listEvents);
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [phase, setPhase] = useState<keyof typeof PHASE_NAMES>("all");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    fetch().then(
      (r) => {
        if (active) setEvents(r);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [fetch, reload]);
  const visible = useMemo(
    () =>
      (events ?? [])
        .filter(
          (e) =>
            (phase === "all" || eventPhase(e) === phase) &&
            `${e.title_ar} ${e.title_en} ${e.location}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          const rank = { ongoing: 0, upcoming: 1, draft: 2, past: 3, archived: 4 };
          const order = rank[eventPhase(a)] - rank[eventPhase(b)];
          if (order) return order;
          const ad = orderedDays(a.schedule)[0].date,
            bd = orderedDays(b.schedule)[0].date;
          return eventPhase(a) === "past" ? bd.localeCompare(ad) : ad.localeCompare(bd);
        }),
    [events, phase, search],
  );
  return (
    <div>
      <PageHeader
        title={t("الفعاليات", "Events")}
        description={t(
          "خطط لكل فعالية، وانشر صفحتها، وتابع بياناتها يوماً بيوم.",
          "Plan each event, publish its page and follow its data day by day.",
        )}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            {t("إضافة فعالية", "Add event")}
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label={t("تصفية الفعاليات", "Filter events")}>
          {Object.entries(PHASE_NAMES).map(([key, name]) => (
            <Button
              key={key}
              variant={phase === key ? "default" : "ghost"}
              aria-pressed={phase === key}
              onClick={() => setPhase(key as keyof typeof PHASE_NAMES)}
            >
              {name[lang]}
            </Button>
          ))}
        </nav>
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("بحث عن فعالية…", "Search events…")}
            aria-label={t("بحث عن فعالية", "Search events")}
          />
        </div>
      </div>
      {error ? (
        <ErrorNote onRetry={() => setReload((n) => n + 1)} />
      ) : !events ? (
        <Loading />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("لا توجد فعاليات هنا", "No events here")}
          text={t("أضف فعالية أو غيّر التصفية.", "Add an event or change the filter.")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => {
            const days = orderedDays(event.schedule),
              state = eventPhase(event);
            return (
              <Link
                key={event.id}
                to="/admin/events/$id"
                params={{ id: event.id }}
                className="cx-card group block overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
              >
                {event.image && (
                  <img
                    src={eventImageUrl(event.image)}
                    alt=""
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                )}
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Pill
                      tone={state === "ongoing" ? "green" : state === "upcoming" ? "teal" : "gray"}
                    >
                      {PHASE_NAMES[state][lang]}
                    </Pill>
                    {event.badge && (
                      <img
                        src={eventImageUrl(event.badge.image)}
                        alt={lang === "ar" ? event.badge.name_ar : event.badge.name_en}
                        className="h-10 w-10 object-contain"
                      />
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-[var(--cx-ink)] group-hover:text-[var(--cx-teal)]">
                    {lang === "ar" ? event.title_ar : event.title_en}
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-[var(--cx-ink-2)]">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {formatEventDate(days[0].date, lang)}
                      {days.length > 1 && ` — ${formatEventDate(days[days.length - 1].date, lang)}`}
                    </span>
                  </p>
                  {event.location && (
                    <p className="flex items-center gap-2 text-sm text-[var(--cx-muted)]">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {event.location}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {event.tools.map((tool) => (
                      <Pill key={tool}>{TOOL_NAMES[tool][lang]}</Pill>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {adding && (
        <EventEditor
          onClose={() => setAdding(false)}
          onSaved={(event) => {
            setAdding(false);
            navigate({ to: "/admin/events/$id", params: { id: event.id } });
          }}
        />
      )}
    </div>
  );
}
