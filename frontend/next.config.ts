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
  async rewrites() {
    const backendUrl =
      process.env.INTERNAL_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "http://backend:8000/api/v1/:path*"
        : "http://127.0.0.1:8000/api/v1/:path*");
    return [
      {
        source: "/api/v1/:path*",
        destination: backendUrl,
      },
    ];
  },
};

export default nextConfig;
