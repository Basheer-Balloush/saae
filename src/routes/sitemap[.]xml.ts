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
          { path: "/learning-management-system", changefreq: "weekly", priority: "0.8" },
          { path: "/learning-management-system/catalog", changefreq: "daily", priority: "0.8" },
          { path: "/learning-management-system/login", changefreq: "monthly", priority: "0.4" },
          { path: "/learning-management-system/signup", changefreq: "monthly", priority: "0.4" },
          { path: "/learning-management-system/forgot-password", changefreq: "yearly", priority: "0.2" },
          { path: "/learning-management-system/reset-password", changefreq: "yearly", priority: "0.2" },
          { path: "/learning-management-system/verify", changefreq: "yearly", priority: "0.2" },
          { path: "/attendance-management-system", changefreq: "monthly", priority: "0.4" },
          { path: "/attendance-management-system/login", changefreq: "yearly", priority: "0.2" },
        ];

        for (const key of COMMUNITY_KEYS) {
          entries.push({ path: `/communities/${key}`, changefreq: "weekly", priority: "0.8" });
        }

        try {
          const { data } = await supabaseAdmin
            .from("lms_courses")
            .select("id,slug,updated_at")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(1000);
          for (const row of data ?? []) {
            const r = row as { id: string; slug?: string | null; updated_at?: string };
            entries.push({
              path: `/learning-management-system/courses/${r.slug ?? r.id}`,
              lastmod: r.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.warn("sitemap: failed to load lms_courses rows", e);
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
