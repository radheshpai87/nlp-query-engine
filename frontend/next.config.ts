import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sitemap.xsl",
        headers: [
          { key: "Content-Type", value: "text/xsl; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  async rewrites() {
    const backendBase =
      process.env.NODE_ENV === "production"
        ? "http://backend:8000"
        : "http://127.0.0.1:8000";
    const backendUrl =
      process.env.INTERNAL_API_URL || `${backendBase}/api/v1/:path*`;
    return [
      {
        source: "/api/openapi.json",
        destination: `${backendBase}/openapi.json`,
      },
      {
        source: "/api/v1/:path*",
        destination: backendUrl,
      },
    ];
  },
};

export default nextConfig;
