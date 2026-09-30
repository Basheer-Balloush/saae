/* Lessons open one at a time. A student can play every lesson already
   completed, plus the first one not yet completed; everything after it stays
   locked until that one is done. Shared by the player (to lock the outline)
   and the playback server function (to refuse a locked lesson's video). */

type Ordered = { id: string; display_order: number };

/** By display_order; the id settles ties, so every reader agrees on one order. */
export const compareOrder = (a: Ordered, b: Ordered) =>
  a.display_order - b.display_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The course's lessons in reading order: by section, then within the section. */
export function orderLessons<L extends Ordered & { section_id: string }>(
  sections: Ordered[],
  lessons: L[],
): L[] {
  const rank = new Map(
    sections
      .slice()
      .sort(compareOrder)
      .map((s, i) => [s.id, i]),
  );
  return lessons
    .filter((l) => rank.has(l.section_id))
    .sort((a, b) => rank.get(a.section_id)! - rank.get(b.section_id)! || compareOrder(a, b));
}

/** Where to go after `currentId`: the next lesson if it is open, otherwise
    the first lesson still to complete (someone who skipped ahead before
    lessons were locked goes back to it), or null when every lesson is done. */
export function upNextLesson<L extends { id: string }>(
  ordered: L[],
  currentId: string,
  done: ReadonlySet<string>,
): L | null {
  const i = ordered.findIndex((l) => l.id === currentId);
  const next = i >= 0 ? ordered[i + 1] : undefined;
  if (next && openLessonIds(ordered, done).has(next.id)) return next;
  return ordered.find((l) => l.id !== currentId && !done.has(l.id)) ?? null;
}

/** Ids of the lessons a student may open, given the ids they have completed. */
export function openLessonIds(ordered: { id: string }[], done: ReadonlySet<string>): Set<string> {
  const open = new Set<string>();
  let nextFound = false;
  for (const l of ordered) {
    if (done.has(l.id)) open.add(l.id);
    else if (!nextFound) {
      open.add(l.id);
      nextFound = true;
    }
  }
  return open;
}
