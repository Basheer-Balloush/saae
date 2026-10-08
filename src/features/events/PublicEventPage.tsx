import { useLang } from "@/lib/i18n/i18n";
import { CalendarDays, MapPin } from "lucide-react";
import { eventImageUrl, formatEventDate, orderedDays, type EventInput } from "./lib/events";
import { EventSchedule } from "./EventSchedule";

type PublicEvent = Omit<EventInput, "tools" | "badge"> & {
  badge: Omit<NonNullable<EventInput["badge"]>, "rule"> | null;
};
export function PublicEventPage({ event }: { event: PublicEvent }) {
  const { lang, setLang } = useLang();
  const ar = lang === "ar",
    days = orderedDays(event.schedule);
  return (
    <main className="min-h-screen bg-background text-foreground" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between">
          <a
            href="/"
            aria-label={
              ar
                ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
                : "Syrian Association for AI & Entrepreneurship"
            }
          >
            <img src="/favicon.png" alt="SAAE" className="h-12 w-12" />
          </a>
          <button
            className="min-h-11 rounded-lg border px-4 text-sm font-bold focus-visible:outline-2"
            onClick={() => setLang(ar ? "en" : "ar")}
          >
            {ar ? "English" : "العربية"}
          </button>
        </header>
        {event.image && (
          <img
            src={eventImageUrl(event.image)}
            alt=""
            className="mb-8 max-h-96 w-full rounded-2xl object-cover"
          />
        )}
        <p className="mb-2 text-sm font-bold text-teal-600">
          {ar ? "فعالية الجمعية" : "SAAE event"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          {ar ? event.title_ar : event.title_en}
        </h1>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatEventDate(days[0].date, lang)}
            {days.length > 1 && ` — ${formatEventDate(days[days.length - 1].date, lang)}`}
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </p>
          )}
        </div>
        <p className="mt-6 whitespace-pre-wrap leading-8">
          {ar ? event.description_ar : event.description_en}
        </p>
        <section className="mt-10">
          <h2 className="mb-2 text-2xl font-bold">{ar ? "البرنامج" : "Schedule"}</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {ar ? "جميع الأوقات بتوقيت دمشق" : "All times in Damascus time"}
          </p>
          <EventSchedule schedule={event.schedule} lang={lang} />
        </section>
        {event.badge && (
          <section className="mt-8 flex items-center gap-4 rounded-xl border p-5">
            <img
              src={eventImageUrl(event.badge.image)}
              alt=""
              className="h-20 w-20 object-contain"
            />
            <div>
              <h2 className="font-bold">{ar ? event.badge.name_ar : event.badge.name_en}</h2>
              <p className="text-sm text-muted-foreground">
                {ar ? event.badge.description_ar : event.badge.description_en}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
