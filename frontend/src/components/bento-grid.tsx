"use client";

import * as React from "react";
import { Database, Layers, Zap } from "lucide-react";

/* Bento grid items with varying visual compositions */
const BENTO_ITEMS = [
  {
    id: "nlq",
    title: "Natural Language Queries",
    description:
      "Write the way you speak. Nexus translates natural language into validated queries across PostgreSQL, MongoDB and Elasticsearch.",
    accent: "accent",
    preview: (
      <div className="relative h-24 rounded-xl border border-border bg-background overflow-hidden group">
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 flex items-center justify-center text-center"
        >
          <span className="text-[10px] text-white">Ask in plain language</span>
        </div>
        <div
          className="relative p-6 transform group-hover:translate-y-2 group-hover:transition-transform duration-300"
        >
          <div className="text-center">
            <p className="mt-2 text-[12px] text-white/60">No SQL, no JSON</p>
            <p className="mt-1 text-[14px] font-medium text-white">Transform questions</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "amb",
    title: "Ambiguity Resolution",
    description:
      "Vague thresholds, loose date ranges and competing columns are surfaced as a short, answerable question before any assumption is made.",
    accent: "secondary",
    preview: (
      <div className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border">
        <div>
          <h4 className="text-sm font-medium tracking-[-0.01em] mb-3">Ambiguity Resolution</h4>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Vague thresholds, loose date ranges and competing columns are surfaced
            as a short, answerable question before any assumption is made.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            className="h-6 w-6 text-muted-foreground/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="20" y2="14"></line>
            <line x1="9" y1="21" x2="14" y2="16"></line>
            <polyline points="13 3 13 9 20 12 20 20"></polyline>
          </svg>
          <div
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
          >
            2 pending
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "schema",
    title: "Unified Schema Explorer",
    description:
      "Pan, zoom and search an infinite canvas of databases, tables and relationships. Foreign keys are distinguished from inferred or user-defined links.",
    accent: "accent",
    preview: (
      <div className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border">
        <div>
          <h4 className="text-sm font-medium tracking-[-0.01em] mb-3">Unified Schema Explorer</h4>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Pan, zoom and search an infinite canvas of databases, tables and
            relationships. Foreign keys are distinguished from inferred or
            user-defined links.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            className="h-6 w-6 text-muted-foreground/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="12" y2="3"></line>
            <line x1="21" y1="9" x2="21" y2="3"></line>
            <line x1="3" y1="15" x2="12" y2="15"></line>
            <line x1="21" y1="15" x2="21" y2="15"></line>
            <line x1="9" y1="21" x2="9" y2="15"></line>
          </svg>
          <div
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
          >
            4 tables
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "evidence",
    title: "Evidence-backed Answers",
    description:
      "Each result shows the sources, fields, filters and plan behind it — so the number can be defended.",
    accent: "secondary",
    preview: (
      <div className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border">
        <div>
          <h4 className="text-sm font-medium tracking-[-0.01em] mb-3">Evidence-backed Answers</h4>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Each result shows the sources, fields, filters and plan behind it — so
            the number can be defended.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            className="h-6 w-6 text-muted-foreground/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
            ></path>
          </svg>
          <div
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
          >
            51 rows
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "multi",
    title: "Multi-database Intelligence",
    description:
      "Multiple database connections feeding into one unified query interface. Get answers spanning relational, document and search data in a single conversation.",
    accent: "accent",
    preview: (
      <div
        className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border relative"
      >
        <div>
          <h4 className="text-sm font-medium tracking-[-0.01em] mb-3">Multi-database Intelligence</h4>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Multiple database connections feeding into one unified query interface.
            Get answers spanning relational, document and search data in a single
            conversation.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            className="h-6 w-6 rotate-[15] text-muted-foreground/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.68l1.17-1.17a5.5 5.5 0 0 0-7.77-7.78 5.5 5.5 0 0 0-7.78 7.78l1.17 1.17L12 4.12a5.5 5.5 0 0 0 0 7.78 5.5 5.5 0 0 0 7.78 7.78l1.17-1.17L12 21.12a5.5 5.5 0 0 0 7.78-7.78 5.5 5.5 0 0 0-7.78-7.78l-1.17-1.17z"
            ></path>
          </svg>
          <div
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
          >
            3 sources
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "security",
    title: "Read-only Security",
    description:
      "Generated queries are parsed and validated against a read-only policy before a connection is ever touched. Writes and DDL are denied.",
    accent: "secondary",
    preview: (
      <div className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border">
        <div>
          <h4 className="text-sm font-medium tracking-[-0.01em] mb-3">Read-only Security</h4>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Generated queries are parsed and validated against a read-only policy
            before a connection is ever touched. Writes and DDL are denied.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            className="h-6 w-6 text-muted-foreground/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            ></path>
            <line x1="9" y1="13" x2="9.01" y2="13"></line>
            <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l1-3h-3z"></path>
          </svg>
          <div
            className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
          >
            Policy-enforced
          </div>
        </div>
      </div>
    ),
  },
];

/* Article card variant */
const ArticleCard = ({
  title,
  description,
  preview,
}: {
  title: string;
  description: string;
  preview: React.ReactNode;
}) => {
  return (
    <article
      className="bg-card p-6 rounded-2xl border border-border group:hover:border-accent/20 transition-colors max-w-sm"
    >
      <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">{title}</h3>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {preview}
    </article>
  );
};

/* Ambiguity card variant */
const AmbiguityCard = React.memo(() => {
  return (
    <article
      className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border"
    >
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">Ambiguity Resolution</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Vague thresholds, loose date ranges and competing columns are surfaced
          as a short, answerable question before any assumption is made.
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 text-muted-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="20" y2="14"></line>
          <line x1="9" y1="21" x2="14" y2="16"></line>
          <polyline points="13 3 13 9 20 12 20 20"></polyline>
        </svg>

        <div
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
        >
          2 pending
        </div>
      </div>
    </article>
  );
});

/* Schema explorer card variant */
const SchemaExplorerCard = React.memo(() => {
  return (
    <article
      className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border"
    >
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">Unified Schema Explorer</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Pan, zoom and search an infinite canvas of databases, tables and
          relationships. Foreign keys are distinguished from inferred or
          user-defined links.
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 text-muted-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="12" y2="3"></line>
          <line x1="21" y1="9" x2="21" y2="3"></line>
          <line x1="3" y1="15" x2="12" y2="15"></line>
          <line x1="21" y1="15" x2="21" y2="15"></line>
          <line x1="9" y1="21" x2="9" y2="15"></line>
        </svg>

        <div
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
        >
          4 tables
        </div>
      </div>
    </article>
  );
});

/* Evidence card variant */
const EvidenceCard = React.memo(() => {
  return (
    <article
      className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border"
    >
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">Evidence-backed Answers</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Each result shows the sources, fields, filters and plan behind it — so
          the number can be defended.
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 text-muted-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
          ></path>
        </svg>

        <div
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
        >
          51 rows
        </div>
      </div>
    </article>
  );
});

/* Multi-database card variant */
const MultiDatabaseCard = React.memo(() => {
  return (
    <article
      className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border relative"
    >
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">Multi-database Intelligence</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Multiple database connections feeding into one unified query interface.
          Get answers spanning relational, document and search data in a single
          conversation.
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 rotate-[15] text-muted-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.68l1.17-1.17a5.5 5.5 0 0 0-7.77-7.78 5.5 5.5 0 0 0-7.78 7.78l1.17 1.17L12 4.12a5.5 5.5 0 0 0 0 7.78 5.5 5.5 0 0 0 7.78 7.78l1.17-1.17L12 21.12a5.5 5.5 0 0 0 7.78-7.78 5.5 5.5 0 0 0-7.78-7.78l-1.17-1.17z"
          ></path>
        </svg>

        <div
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
        >
          3 sources
        </div>
      </div>
    </article>
  );
});

/* Read-only security card variant */
const ReadOnlySecurityCard = React.memo(() => {
  return (
    <article
      className="grid grid-cols-2 gap-6 py-8 border-t border-border bg-card rounded-xl border-border"
    >
      <div>
        <h3 className="text-sm font-medium tracking-[-0.01em] mb-3">Read-only Security</h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Generated queries are parsed and validated against a read-only policy
          before a connection is ever touched. Writes and DDL are denied.
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          className="h-6 w-6 text-muted-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          ></path>
          <line x1="9" y1="13" x2="9.01" y2="13"></line>
          <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l1-3h-3z"></path>
        </svg>

        <div
          className="absolute -top-2 -right-2 bg-card border border-border rounded-full px-2 py-1 text-[9px] text-muted-foreground"
        >
          Policy-enforced
        </div>
      </div>
    </article>
  );
});

/* Bento grid content component */
export const BentoGridContent = React.memo(() => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {BENTO_ITEMS.map((item) => {
        const CardComponent =
          item.id === "amb"
            ? AmbiguityCard
            : item.id === "schema"
              ? SchemaExplorerCard
              : item.id === "evidence"
                ? EvidenceCard
                : item.id === "multi"
                  ? MultiDatabaseCard
                  : item.id === "security"
                    ? ReadOnlySecurityCard
                    : ArticleCard;

        return (
          <CardComponent
            key={item.id}
            title={item.title}
            description={item.description}
            preview={item.preview}
          />
        );
      })}
    </div>
  );
});