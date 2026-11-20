"use client";

import * as React from "react";
import {
  Database,
  Layers,
  Zap,
  LockKeyhole,
} from "lucide-react";

const SOURCES = [
  { name: "PostgreSQL", kind: "Relational", color: "emerald" },
  { name: "MongoDB", kind: "Document", color: "amber" },
  { name: "Elasticsearch", kind: "Search", color: "sky" },
];

export const Preview = () => {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl">
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]"
      >
        {/* Window chrome */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-sidebar/60 px-6">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
          </div>
          <span className="text-[11px] text-muted-foreground">
            Nexus Query · New conversation
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            <LockKeyhole className="h-2.5 w-2.5" />
            Read-only
          </span>
        </div>

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[190px_1fr]">
          {/* App rail */}
          <div className="hidden flex-col gap-5 border-r border-border bg-sidebar p-3 md:flex">
            <div className="flex items-center gap-2 px-1.5 py-1">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background"
              >
                N
              </span>
              <span className="text-xs font-medium">Nexus</span>
            </div>
            <div className="space-y-0.5">
              {/* Navigation pills */}
              {[ "Ask", "Schema", "Sources" ].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] ${
                    index === 0
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
              ))}

              <div className="mt-auto space-y-1.5">
                <p
                  className="px-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Sources
                </p>
                {[ "Production PG", "Events", "Search" ].map((source) => (
                  <div
                    key={source}
                    className="flex items-center justify-between px-2 text-[10px] text-muted-foreground"
                  >
                    <span className="truncate">{source}</span>
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400/80"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation / query interface */}
          <div className="space-y-5 p-6 sm:p-8">
            {/* User question */}
            <div className="flex justify-end">
              <p
                className="max-w-md rounded-2xl rounded-tr-sm bg-secondary px-4 py-3 text-[13px] leading-relaxed text-foreground"
              >
                Which customers generated the highest revenue last month?
              </p>
            </div>

            {/* Ambiguity clarification */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background text-[9px] font-semibold"
                >
                  N
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Nexus
                </span>
              </div>

              <p
                className="max-w-lg text-[13px] leading-relaxed text-foreground/90"
              >
                Before I run this, two values need a definition. High-value and recently
                are not specified in your schema.
              </p>

              <div
                className="max-w-lg rounded-lg border border-border bg-background/50"
              >
                <div
                  className="flex items-center justify-between border-b border-border px-4 py-2"
                >
                  <span className="text-[11px] font-medium">Define high-value</span>
                  <span className="text-[10px] text-muted-foreground">1 of 2</span>
                </div>

                <div className="space-y-1.5 p-4">
                  {[ "Lifetime spend above $1,000", "Single order above $1,000", "Top 10% of spend" ].map(
                    (option, index) => (
                      <div
                        key={option}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] ${
                          index === 0
                            ? "border-brand/40 bg-brand-muted text-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full border ${
                            index === 0 ? "border-brand bg-brand" : "border-border"
                          }`}
                        />
                        {option}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Result preview */}
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <div
                  className="flex items-center justify-between px-4 py-2 text-[10px] text-muted-foreground"
                >
                  <span>Result preview · customers</span>
                  <span>Read-only</span>
                </div>

                <table className="w-full text-left text-[11px]">
                  <thead className="border-y border-border bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Customer</th>
                      <th className="px-3 py-1.5 font-medium">Spend</th>
                      <th
                        className="hidden px-3 py-1.5 font-medium sm:table-cell"
                      >
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {[
                      [ "A. Sharma", "$4,250", "PostgreSQL" ],
                      [ "M. Okafor", "$3,100", "PostgreSQL" ],
                      [ "L. Chen", "$2,890", "PostgreSQL" ],
                    ].map(([name, spend, source]) => (
                      <tr key={name}>

                        <td className="px-3 py-1.5 text-foreground/90">
                          {name}
                        </td>
                        <td
                          className="px-3 py-1.5 tabular-nums text-foreground/90"
                        >
                          {spend}
                        </td>
                        <td
                          className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell"
                        >
                          {source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="mt-3 text-center text-[10px] text-muted-foreground"
        >
          Illustrative interface. Figures are example data, not results from your
          databases.
        </p>
      </div>
    </div>
  );
};