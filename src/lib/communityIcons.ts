// The homepage community card's line icons (public/cinematic/js/home-inline.js), so the community pages carry the same marks.
import type { CommunityKey } from "@/lib/communityCategories";

export const COMMUNITY_ICON_SVG: Record<CommunityKey, string> = {
  data: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/>',
  architecture:
    '<path d="M3 21h18M5 21V9h5v12M10 21V4h5v17M15 21v-9h4v9M7 12h1M7 16h1M12 8h1M12 12h1M12 16h1M17 15h1"/>',
  medical:
    '<path d="M12 21s-7-4.4-7-10.5C5 7.5 7 5.5 9.5 5.5c1.4 0 2.1.6 2.5 1.4.4-.8 1.1-1.4 2.5-1.4C17 5.5 19 7.5 19 10.5 19 16.6 12 21 12 21Z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
  research: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5M8 10h5M10.5 7.5v5"/>',
  software: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  economy: '<path d="M4 19V9M10 19V5M16 19v-7M22 19V3M2 19h21"/><path d="m4 7 6-3 6 5 6-7"/>',
  trainers:
    '<circle cx="12" cy="6" r="3"/><path d="M5 21v-2.5C5 15.5 8.1 14 12 14s7 1.5 7 4.5V21M12 14v7M8 18h8"/>',
  media: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9"/>',
  quality:
    '<path d="m12 3 2 4 4.5.7-3.2 3.2.8 4.6-4.1-2.1-4.1 2.1.8-4.6L5.5 7.7 10 7l2-4Z"/><path d="M7 16v5l5-2 5 2v-5"/>',
};
