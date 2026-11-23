import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nlp.radhesh.me";
  const now = new Date().toISOString();

  const routes = [
    { loc: `${siteUrl}`, lastmod: now, changefreq: "weekly", priority: "1.0" },
    { loc: `${siteUrl}/docs`, lastmod: now, changefreq: "weekly", priority: "0.9" },
    { loc: `${siteUrl}/login`, lastmod: now, changefreq: "monthly", priority: "0.8" },
    { loc: `${siteUrl}/register`, lastmod: now, changefreq: "monthly", priority: "0.8" },
    { loc: `${siteUrl}/chat`, lastmod: now, changefreq: "daily", priority: "0.9" },
    { loc: `${siteUrl}/schema`, lastmod: now, changefreq: "weekly", priority: "0.7" },
    { loc: `${siteUrl}/connections`, lastmod: now, changefreq: "weekly", priority: "0.7" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
    },
  });
}
