"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  Network,
  ShieldCheck,
  Layers,
  Database,
} from "lucide-react";

export const BentoGridContent = React.memo(() => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. Natural Language Queries */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <Search className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Natural Language Queries
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Ask in plain English. Nexus translates natural language into validated queries across PostgreSQL, MongoDB and Elasticsearch.
        </p>
      </div>

      {/* 2. Ambiguity Resolution */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Ambiguity Resolution
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Vague thresholds, loose date ranges and competing columns are surfaced as a short question before any assumption is made.
        </p>
      </div>

      {/* 3. Unified Schema Explorer */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <Network className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Unified Schema Explorer
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Pan and search an interactive map of tables, collections and relationships across all connected data sources.
        </p>
      </div>

      {/* 4. Evidence-backed Answers */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <Layers className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Evidence-backed Answers
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Each result shows the sources, fields, filters and plan behind it — so every number can be defended.
        </p>
      </div>

      {/* 5. Multi-database Intelligence */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <Database className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Multi-database Intelligence
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Connect relational, document and search databases into one query interface and ask cross-source questions seamlessly.
        </p>
      </div>

      {/* 6. Read-only Security */}
      <div className="group rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <ShieldCheck className="h-4.5 w-4.5" />
        </span>
        <h3 className="mt-5 text-base font-semibold text-slate-100">
          Read-only Security
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400">
          Generated queries are parsed and validated against a read-only policy. All writes, updates and DDL statements are denied.
        </p>
      </div>
    </div>
  );
});
