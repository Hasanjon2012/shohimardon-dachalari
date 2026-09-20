import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://shohimardon.site";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isSafeSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9-]+$/.test(slug);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/hotels", changefreq: "weekly", priority: "0.9" },
          { path: "/dachas", changefreq: "weekly", priority: "0.8" },
          { path: "/login", changefreq: "yearly", priority: "0.3" },
          { path: "/register", changefreq: "yearly", priority: "0.3" },
          { path: "/forgot-password", changefreq: "yearly", priority: "0.2" },
          { path: "/reset-password", changefreq: "yearly", priority: "0.2" },
        ];

        try {
          const { data: hotels, error } = await supabaseAdmin
            .from("hotels")
            .select("slug, updated_at")
            .eq("published", true)
            .order("created_at", { ascending: false });

          if (!error && hotels) {
            for (const hotel of hotels) {
              if (!isSafeSlug(hotel.slug)) continue;
              entries.push({
                path: `/hotels/${hotel.slug}`,
                changefreq: "weekly",
                priority: "0.7",
                lastmod: hotel.updated_at ? new Date(hotel.updated_at).toISOString().split("T")[0] : undefined,
              });
            }
          }
        } catch {
          // If fetching hotels fails, return sitemap with static routes only
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${escapeXml(`${BASE_URL}${e.path}`)}</loc>`,
            e.lastmod ? `    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : null,
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
