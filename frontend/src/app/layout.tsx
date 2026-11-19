import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Nexus Query - Ambiguity-Aware Natural Language Query Engine",
  description: "Query heterogeneous databases (PostgreSQL, MongoDB, Elasticsearch) using natural language with ambiguity resolution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased scroll-smooth">
      <body className="min-h-full bg-background text-foreground font-sans relative">
        <div className="grain-overlay" aria-hidden="true" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
