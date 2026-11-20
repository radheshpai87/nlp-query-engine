"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  Network,
  ShieldCheck,
  Layers,
  Database,
  LockKeyhole,
  Check,
  X,
  Code2,
} from "lucide-react";

export const BentoGridContent = React.memo(() => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Natural Language Queries */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Search className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-slate-400">
              Deterministic NLP
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Natural Language Queries
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Write the way you speak. Nexus translates natural language into validated queries across PostgreSQL, MongoDB and Elasticsearch.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-[10px] border-b border-white/5 pb-1.5">
            <span>INPUT: Plain English</span>
            <span className="text-emerald-400">Compiled Multi-Dialect</span>
          </div>
          <div className="text-slate-300 font-sans text-xs">
            &ldquo;Which buyers spent over $500 last month?&rdquo;
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[9px] text-indigo-300 font-mono">
              SQL: SELECT ... JOIN
            </span>
            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] text-emerald-300 font-mono">
              MQL: $match + $group
            </span>
            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] text-amber-300 font-mono">
              ES: bool / range
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ambiguity Resolution */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-mono text-teal-400">
              Interactive Gate
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Ambiguity Resolution
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Vague thresholds, loose date ranges and competing columns are surfaced as a short, answerable question before any assumption is made.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-teal-500/20 bg-teal-950/15 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-teal-300 font-mono">
            <span>&ldquo;high-value&rdquo; requires rule</span>
            <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-teal-300">1 of 1</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-200 font-medium">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span>Lifetime spend &gt; $1,000</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full border border-slate-600" />
              <span>Top 10% of customers</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Unified Schema Explorer */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Network className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-slate-400">
              Infinite Canvas
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Unified Schema Explorer
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Pan, zoom and search an infinite canvas of databases, tables and relationships. Foreign keys are distinguished from inferred or user-defined links.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-white/5 pb-1.5">
            <span>Schema Topology</span>
            <span className="text-cyan-400">BFS Graph Traverser</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="rounded-md border border-white/10 bg-slate-900/60 p-2">
              <span className="text-indigo-400 font-semibold">customers</span>
              <p className="text-slate-500 mt-0.5">id, email, name</p>
            </div>
            <div className="rounded-md border border-cyan-500/30 bg-cyan-950/20 p-2">
              <span className="text-cyan-300 font-semibold">orders</span>
              <p className="text-slate-400 mt-0.5">FK: customer_id</p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 text-center pt-1">
            4 tables · 2 collections · 1 index mapped
          </div>
        </div>
      </div>

      {/* 4. Evidence-backed Answers */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Layers className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
              Zero Guesswork
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Evidence-backed Answers
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Each result shows the sources, fields, filters and plan behind it — so the number can be defended.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2 font-mono text-[11px]">
          <div className="flex justify-between border-b border-white/5 pb-1.5 text-[10px]">
            <span className="text-slate-500">Metric Value</span>
            <span className="text-emerald-400 font-semibold">$14,250.00</span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Source: PostgreSQL &apos;order_items&apos;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Filter: status = &apos;completed&apos;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>Rows aggregated: 128 items</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Multi-database Intelligence */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
              <Database className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-slate-400">
              Cross-Source In-Memory
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Multi-database Intelligence
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Multiple database connections feeding into one unified query interface. Get answers spanning relational, document and search data in a single conversation.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2 font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-1">
            <span>Federated Join Pipeline</span>
            <span className="text-emerald-400">In-Memory Engine</span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1">
              <span>1. Postgres: Orders &amp; Prices</span>
              <span className="text-emerald-400">4.2ms</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1">
              <span>2. Mongo: Customer Reviews</span>
              <span className="text-emerald-400">2.8ms</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1">
              <span>3. Elastic: Full-Text Catalog</span>
              <span className="text-emerald-400">3.5ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Read-only Security */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-mono text-red-400">
              AST Policy Guard
            </span>
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-100">
            Read-only Security
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Generated queries are parsed and validated against a read-only policy before a connection is ever touched. Writes and DDL are denied.
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-1.5 font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-1">
            <span>Policy Sandbox</span>
            <span className="text-emerald-400">Enforced</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>SELECT / Read Queries</span>
            <span className="flex items-center gap-1 font-semibold"><Check className="h-3 w-3" /> PERMITTED</span>
          </div>
          <div className="flex items-center justify-between text-red-400">
            <span>DROP / ALTER TABLE</span>
            <span className="flex items-center gap-1 font-semibold"><X className="h-3 w-3" /> BLOCKED</span>
          </div>
          <div className="flex items-center justify-between text-red-400">
            <span>UPDATE / DELETE</span>
            <span className="flex items-center gap-1 font-semibold"><X className="h-3 w-3" /> BLOCKED</span>
          </div>
        </div>
      </div>
    </div>
  );
});
