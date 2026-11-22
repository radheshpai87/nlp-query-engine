import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexusquery.io";

export const viewport: Viewport = {
  themeColor: "#080A0E",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nexus Query | Ambiguity-Aware Natural Language Query Engine",
    template: "%s | Nexus Query",
  },
  description:
    "Ask questions across your databases in plain English. Nexus Query eliminates SQL complexity with ambiguity-aware semantic routing, explainable logical query plans, and read-only verified execution.",
  applicationName: "Nexus Query",
  keywords: [
    "natural language query",
    "text to sql",
    "database AI",
    "cross-database query",
    "schema rag",
    "read-only query engine",
    "PostgreSQL natural language",
    "healthcare database AI",
  ],
  authors: [{ name: "Nexus Query Team" }],
  creator: "Nexus Query",
  publisher: "Nexus Query",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Nexus Query",
    title: "Nexus Query | Ambiguity-Aware Natural Language Query Engine",
    description:
      "Query heterogeneous databases using natural language with active ambiguity resolution and deterministic, read-only SQL plan compilation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nexus Query - Natural Language Database Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Query | Ambiguity-Aware Natural Language Query Engine",
    description:
      "Ask questions in plain English across PostgreSQL, MongoDB, and Elasticsearch. Instant, explainable answers with zero SQL required.",
    images: ["/og-image.png"],
    creator: "@nexusquery",
  },
    robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Nexus Query",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Nexus Query",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Ambiguity-Aware Natural Language Query Engine for heterogeneous databases with schema RAG and verified read-only execution.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Natural language to SQL generation",
    "Cross-database ambiguity detection & resolution",
    "100% read-only verified query execution",
    "Schema RAG vector search & graph visualization",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
