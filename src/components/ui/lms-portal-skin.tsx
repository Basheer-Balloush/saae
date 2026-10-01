import type { ReactNode } from "react";

/* Radix portals dialogs and sheets to <body>, outside the LMS page wrapper,
   so on LMS pages they need the .lms-skin class to pick up its colours, fonts
   and dialog button styles. That class must never sit on the positioned panel
   itself: lms-db.css gives .lms-skin `position: relative; min-height: 100vh`,
   which turns a fixed, centred panel into a full-height block at the bottom
   of the page, leaving only the black backdrop on screen with scrolling
   locked. An invisible display:contents wrapper passes the skin down to the
   overlay and panel without giving either of them those page rules. */

export function isLmsPage(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/learning-management-system")
  );
}

export function LmsPortalSkin({ children }: { children: ReactNode }) {
  if (!isLmsPage()) return <>{children}</>;
  return (
    <div className="lms-dashboard-wrap lms-skin dark" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
