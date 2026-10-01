import type { PersonRow } from "./location";

/* Filters on the admin location page. "all" leaves that side open. */
export type StatsFilter = {
  governorate: string;
  /** A category id, "none" for people with no course yet, or "all". */
  category: string;
  role: "all" | "learners" | "instructors";
  /** Answered within this many days, or "all". */
  since: "all" | "7" | "30" | "90";
};

export const NO_FILTER: StatsFilter = {
  governorate: "all",
  category: "all",
  role: "all",
  since: "all",
};

export function isFiltered(f: StatsFilter): boolean {
  return f.governorate !== "all" || f.category !== "all" || f.role !== "all" || f.since !== "all";
}

/* People matching the filter. `ignore` leaves one side open, so a chart of
   that side still shows every option (with the chosen one highlighted). */
export function filterPeople(
  people: PersonRow[],
  f: StatsFilter,
  ignore: (keyof StatsFilter)[] = [],
  now = Date.now(),
): PersonRow[] {
  const on = (k: keyof StatsFilter) => !ignore.includes(k) && f[k] !== "all";
  const since = on("since") ? now - Number(f.since) * 86_400_000 : 0;
  return people.filter(
    (p) =>
      (!on("governorate") || p.governorate === f.governorate) &&
      (!on("category") ||
        (f.category === "none" ? !p.has_course : p.categories.includes(f.category))) &&
      (!on("role") || (f.role === "instructors" ? p.instructor : !p.instructor)) &&
      (!on("since") || Date.parse(p.answered_at) >= since),
  );
}

export function countBy<K extends string>(people: PersonRow[], key: (p: PersonRow) => K[]) {
  const counts = new Map<K, number>();
  for (const p of people) for (const k of key(p)) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
}

/* Cities with their people. Spellings of one city share a city_key; the
   name shown is the most common spelling. */
export function topCities(people: PersonRow[]) {
  const groups = new Map<
    string,
    { governorate: string; people: number; names: Map<string, number> }
  >();
  for (const p of people) {
    const id = `${p.governorate}|${p.city_key}`;
    const g = groups.get(id) ?? { governorate: p.governorate, people: 0, names: new Map() };
    g.people += 1;
    g.names.set(p.city, (g.names.get(p.city) ?? 0) + 1);
    groups.set(id, g);
  }
  return [...groups.values()]
    .map((g) => ({
      governorate: g.governorate,
      people: g.people,
      city: [...g.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
    }))
    .sort((a, b) => b.people - a.people || a.city.localeCompare(b.city));
}
