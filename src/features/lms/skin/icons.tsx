/**
 * Inline SVG icon set — the exact paths used across the original LMS pages.
 * Kept as data so any component renders identical artwork 1:1.
 * All icons are stroke-based; navigation.css / lms.css handle sizing and fill.
 */

export const IconHome = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    <path d="M9 21v-7h6v7" />
  </svg>
);

export const IconCourses = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    <path d="M9 7.5h7M9 11h5" />
  </svg>
);

export const IconInternships = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V6a3 3 0 0 1 6 0v1M3 12.5h18" />
  </svg>
);

export const IconVerify = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="9" r="5.5" />
    <path d="m10 9 1.6 1.6L14.5 7.5" />
    <path d="M8.5 13.5 7 21l5-2.4L17 21l-1.5-7.5" />
  </svg>
);

export const IconStudent = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 4 3 8.5 12 13l9-4.5-9-4.5Z" />
    <path d="M6.5 10.8V15c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.2" />
  </svg>
);

export const IconProfile = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c.8-3.6 3.4-5.4 7-5.4s6.2 1.8 7 5.4" />
  </svg>
);

export const IconLogin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

export const IconSignup = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 20c.7-3.4 2.9-5 5.5-5s4.8 1.6 5.5 5" />
    <path d="M18.5 8v6M15.5 11h6" />
  </svg>
);

export const IconGlobe = () => (
  <svg className="language-switch-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
  </svg>
);

export const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconPencil = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 20h4l11-11-4-4L4 16v4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconCertificate = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m10 9 1.6 1.6L14.5 7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 13.5 7 21l5-2.4L17 21l-1.5-7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconDocument = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 3h8l4 4v14H6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14 3v4h4M9 12h6M9 15.5h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/* Category glyphs (data/catalog.js icon strings, as JSX). */

export const IconCategoryAI = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const IconCategoryProgramming = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="m8 7-5 5 5 5M16 7l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconCategoryHealth = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.3a4.1 4.1 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M7.5 12.5h2.4l1.4-2.6 2 4.6 1.3-2h1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCategoryEducation = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 9.5 12 4.5l10 5-10 5-10-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M6 11.5v4.8c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2v-4.8M22 9.5v5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconCategoryEngineering = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 9 12 4l8.5 5h-17Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M6 9v9M10 9v9M14 9v9M18 9v9M3 21h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconCategoryDesign = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 19 7-7 3 3-7 7-3-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5ZM2 2l7.6 7.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const IconCategoryGrowth = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 17 6-6 4 4 8-8M14 7h7v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCategoryBusiness = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 7V6a3 3 0 0 1 6 0v1M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
