import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { COMMUNITY_KEYS } from "@/lib/communityCategories";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://aisyria.org";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/news", changefreq: "daily", priority: "0.9" },
        ];

        for (const key of COMMUNITY_KEYS) {
          entries.push({ path: `/communities/${key}`, changefreq: "weekly", priority: "0.8" });
        }

        try {
          const { data } = await supabaseAdmin
            .from("news")
            .select("id,published_at")
            .order("published_at", { ascending: false })
            .limit(1000);
          for (const row of data ?? []) {
            entries.push({
              path: `/news/${row.id}`,
              lastmod: row.published_at ?? undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.warn("sitemap: failed to load news rows", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
