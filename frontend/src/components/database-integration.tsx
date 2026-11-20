"use client";

import * as React from "react";
import { Database, Layers, Zap } from "lucide-react";

/* Database integration card */
const DatabaseIntegrationCard = React.memo(
  ({
    kind,
    name,
    description,
  }: {
    kind: string;
    name: string;
    description: string;
  }) => {
    return (
      <div
        className="bg-card p-6 rounded-xl border border-border group:hover:border-accent transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-muted/50">
            {kind === "Relational" && <Database />}
            {kind === "Document" && <Layers />}
            {kind === "Search" && <Zap />}
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
          >
            {kind}
          </span>
        </div>

        <h3 className="mt-3 text-sm font-medium">{name}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${false ? "bg-accent" : "bg-muted"} inline-block`}
          />
          <span className="text-[10px] text-muted-foreground connected">
            {"Connected"}
          </span>
        </div>
      </div>
    );
  }
);

export const DatabaseIntegration = () => {
  return (
    <section
      className="border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2
              className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]"
            >
              One interface. Every data source.
            </h2>
            <p
              className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground"
            >
              Connect the databases you already run. Nexus introspects them and keeps
              the schema map current. No migration, no ETL — just direct access.
            </p>
          </div>

          <div className="grid gap-3 overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <DatabaseIntegrationCard
              kind="Relational"
              name="PostgreSQL"
              description="Joins, constraints and foreign keys mapped automatically"
            />
            <DatabaseIntegrationCard
              kind="Document"
              name="MongoDB"
              description="Collections and nested fields with inferred links"
            />
            <DatabaseIntegrationCard
              kind="Search"
              name="Elasticsearch"
              description="Index mappings and full-text fields queried with read-only DSL"
            />
          </div>
        </div>
      </div>
    </section>
  );
};