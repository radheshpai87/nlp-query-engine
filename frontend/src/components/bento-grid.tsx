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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Natural Language Queries */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <Search className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Natural Language Queries
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Ask in plain English. Nexus translates natural language into validated queries across PostgreSQL, MongoDB and Elasticsearch.
        </p>
      </div>

      {/* 2. Ambiguity Resolution */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-500/10 text-teal-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Ambiguity Resolution
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Vague thresholds, loose date ranges and competing columns are surfaced as a short question before any assumption is made.
        </p>
      </div>

      {/* 3. Unified Schema Explorer */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
          <Network className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Unified Schema Explorer
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Pan and search an interactive map of tables, collections and relationships across all connected data sources.
        </p>
      </div>

      {/* 4. Evidence-backed Answers */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <Layers className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Evidence-backed Answers
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Each result shows the sources, fields, filters and plan behind it — so every number can be defended.
        </p>
      </div>

      {/* 5. Multi-database Intelligence */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
          <Database className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Multi-database Intelligence
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Connect relational, document and search databases into one query interface and ask cross-source questions seamlessly.
        </p>
      </div>

      {/* 6. Read-only Security */}
      <div className="group rounded-xl border border-white/10 bg-[#0C1017] p-5 transition-all hover:border-emerald-500/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-100">
          Read-only Security
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Generated queries are parsed and validated against a read-only policy. All writes, updates and DDL statements are denied.
        </p>
      </div>
    </div>
  );
});
