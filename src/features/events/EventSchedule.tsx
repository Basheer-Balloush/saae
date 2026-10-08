import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatEventDate, orderedDays, type EventDay } from "./lib/events";

export function EventSchedule({
  schedule,
  lang,
  date,
}: {
  schedule: EventDay[];
  lang: "ar" | "en";
  date?: string | null;
}) {
  const ar = lang === "ar";
  return (
    <div className="space-y-4">
      {orderedDays(schedule)
        .filter((day) => !date || day.date === date)
        .map((day) => (
          <section key={day.date} className="rounded-xl border p-4">
            <h3 className="flex items-center gap-2 font-bold">
              <CalendarDays className="h-4 w-4" />
              {formatEventDate(day.date, lang)}
            </h3>
            <p className="mt-1 flex items-center gap-2 text-sm opacity-75">
              <Clock className="h-4 w-4" />
              <span dir="ltr">
                {day.start
                  ? `${day.start} – ${day.end}`
                  : ar
                    ? "الأوقات لم تحدد بعد"
                    : "Hours to be confirmed"}
              </span>
            </p>
            {day.sessions.length > 0 && (
              <ol className="mt-4 space-y-4 border-s-2 ps-4">
                {[...day.sessions]
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((s, i) => (
                    <li key={i}>
                      <p className="text-xs font-semibold opacity-75" dir="ltr">
                        {s.start} – {s.end}
                      </p>
                      <h4 className="font-bold">{ar ? s.title_ar : s.title_en}</h4>
                      {s.speaker && <p className="text-sm">{s.speaker}</p>}
                      {s.location && (
                        <p className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {s.location}
                        </p>
                      )}
                      {(ar ? s.description_ar : s.description_en) && (
                        <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
                          {ar ? s.description_ar : s.description_en}
                        </p>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </section>
        ))}
    </div>
  );
}
