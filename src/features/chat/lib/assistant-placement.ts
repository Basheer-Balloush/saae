/* Where the Abu Al-Joud chat is mounted, and where its floating launcher shows.
   Every page with the site footer needs the chat mounted: the footer's "Chat
   with Abu Al-Joud" button opens it with the "assistant:open" event, and with
   no chat on the page nothing hears it (the LMS pages, before 2026-10-05). */
export type AssistantPlacement = { mounted: boolean; launcher: boolean };

export function assistantPlacement(pathname: string): AssistantPlacement {
  const isAms = pathname.startsWith("/attendance-management-system");
  const isProjectManagement = pathname.startsWith("/project-management");
  const isAdmin =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/learning-management-system/admin");
  const isStandaloneProfile = /^\/profile\//i.test(pathname) || pathname === "/feedback";
  if (isAms || isProjectManagement || isAdmin || isStandaloneProfile) {
    return { mounted: false, launcher: false };
  }
  // The homepage has its own Abu Al-Joud, and on /texpo he hosts the game
  // (which opens the chat itself); the LMS keeps its pages clear.
  const isLms = pathname.startsWith("/learning-management-system");
  return { mounted: true, launcher: pathname !== "/" && pathname !== "/texpo" && !isLms };
}
