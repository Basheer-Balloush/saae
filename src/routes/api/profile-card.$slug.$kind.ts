import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Portrait and signature of a private card, e.g. /api/profile-card/<slug>/portrait.
 * The images live in the database next to the card, not in public/, so they
 * can only be fetched by someone who already has the card's secret slug.
 */
const PRIVATE_HEADERS = {
  "Cache-Control": "private, max-age=3600",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export const Route = createFileRoute("/api/profile-card/$slug/$kind")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const kind = params.kind;
        if ((kind !== "portrait" && kind !== "signature") || params.slug.length > 120) {
          return new Response("Not found", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        try {
          const { findProfileImage } = await import("@/features/website/lib/private-profiles.server");
          const image = await findProfileImage(params.slug, kind);
          if (!image) {
            return new Response("Not found", {
              status: 404,
              headers: { "Cache-Control": "no-store" },
            });
          }
          return new Response(image.bytes, {
            headers: { ...PRIVATE_HEADERS, "Content-Type": image.mime },
          });
        } catch (error) {
          console.error("Profile image lookup failed", error);
          return new Response("Unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
