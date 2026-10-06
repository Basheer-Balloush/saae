import { useMatches } from "@tanstack/react-router";

/** The path of the page on screen, for layouts that pick their frame by path.
    The router's location moves to the next address as soon as a link is
    clicked, but the old page stays rendered until the next one has loaded
    (a code chunk on a slow line can take seconds). Choosing the frame from
    that address put the LMS navbar on top of the admin console when
    switching from Learning to Attendance. */
export function useShownPathname() {
  return useMatches({ select: (matches) => matches[matches.length - 1]?.pathname ?? "/" });
}
