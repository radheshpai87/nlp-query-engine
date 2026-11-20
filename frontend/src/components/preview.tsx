"use client";

import * as React from "react";
import {
  Database,
  Layers,
  Zap,
  LockKeyhole,
  CheckCircle2,
  ShieldCheck,
  Code2,
  TableProperties,
  Network,
  FileCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type ScenarioId = "revenue" | "ambiguity" | "federated";
type ViewTab = "table" | "query" | "graph" | "audit";

interface Scenario {
  id: ScenarioId;
  label: string;
  tag: string;
  dialect: string;
  latency: string;
  question: string;
  sqlQuery: string;
  mongoQuery?: string;
  esQuery?: string;
  joinPath: string[];
  auditHash: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "revenue",
    label: "Revenue Analysis",
    tag: "PostgreSQL 16 · In-Memory Join",
    dialect: "PostgreSQL SQL",
    latency: "4.2ms",
    question: "Show me the top five products by revenue this month.",
    sqlQuery: `SELECT 
  p.name AS product_name,
  p.category,
  SUM(oi.quantity * oi.unit_price) AS total_revenue,
  COUNT(DISTINCT o.id) AS order_count
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
WHERE o.order_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.id, p.name, p.category
ORDER BY total_revenue DESC
LIMIT 5;`,
    joinPath: ["products", "order_items", "orders"],
    auditHash: "8f4b23c9a1e0...c4e92b31f782",
  },
  {
    id: "ambiguity",
    label: "Ambiguity Clarification",
    tag: "Ambiguity Engine · 4-Table Path",
    dialect: "PostgreSQL + Inferred Filter",
    latency: "Interactive",
    question: "Show me high-value customers who recently purchased electronics.",
    sqlQuery: `SELECT 
  c.name AS customer,
  c.email,
  SUM(oi.quantity * oi.unit_price) AS total_spend,
  MAX(o.order_date) AS latest_purchase
FROM customers c
JOIN orders o ON o.id = oi.order_id
JOIN order_items oi ON oi.product_id = p.id
JOIN products p ON p.id = oi.product_id
WHERE p.category = 'Electronics'
  AND o.order_date >= CURRENT_DATE - INTERVAL '30 days' -- Clarified: "recently"
GROUP BY c.id, c.name, c.email
HAVING SUM(oi.quantity * oi.unit_price) >= 1000        -- Clarified: "high-value"
ORDER BY total_spend DESC;`,
    joinPath: ["customers", "orders", "order_items", "products"],
    auditHash: "5e2a90fd418c...0b89cd123aa4",
  },
  {
    id: "federated",
    label: "Cross-Database Federated Search",
    tag: "PG + MongoDB + Elasticsearch",
    dialect: "Federated Query Plan",
    latency: "6.8ms",
    question: "Search catalog for noise-cancelling headphones with 4+ star reviews.",
    sqlQuery: `-- Step 1: Elasticsearch Full-Text Match
GET /catalog/_search
{ "query": { "match": { "description": "noise-cancelling headphones" } } }

-- Step 2: PostgreSQL Catalog Price & Inventory
SELECT id, name, price, stock FROM products WHERE id IN (:es_ids);

-- Step 3: MongoDB Customer Sentiment Aggregation
db.reviews.aggregate([
  { $match: { product_id: { $in: :es_ids }, rating: { $gte: 4.0 } } },
  { $group: { _id: "$product_id", avg_rating: { $avg: "$rating" }, count: { $sum: 1 } } }
]);`,
    joinPath: ["elasticsearch.catalog", "postgres.products", "mongodb.reviews"],
    auditHash: "7b13a89e4c02...e54d310a89fc",
  },
];

export const Preview = () => {
  const [activeScenarioId, setActiveScenarioId] = React.useState<ScenarioId>("revenue");
  const [activeTab, setActiveTab] = React.useState<ViewTab>("table");
  const [selectedClarification, setSelectedClarification] = React.useState<number>(0);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) ?? SCENARIOS[0];

  return (
    <div className="relative mx-auto mt-14 max-w-6xl">
      {/* Scenario switcher pills */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {SCENARIOS.map((s) => {
          const isActive = s.id === activeScenarioId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveScenarioId(s.id);
                if (s.id === "ambiguity") {
                  setActiveTab("table");
                }
              }}
              className={`group flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:bg-slate-900/90 hover:text-slate-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  isActive ? "bg-emerald-400" : "bg-slate-600 group-hover:bg-slate-400"
                }`}
              />
              <span>{s.label}</span>
              <span className="hidden sm:inline text-[10px] text-slate-500">
                · {s.latency}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Console Container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F17] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9),0_0_50px_-15px_rgba(16,185,129,0.15)]">
        {/* Top window chrome */}
        <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#090C13] px-4 sm:px-6">
          {/* Mac Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#EF4444]/80 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-[#F59E0B]/80 shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-[#10B981]/80 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="ml-3 hidden text-[11px] font-mono text-slate-400 sm:inline">
              nexus-engine :: Execution Verified
            </span>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/60 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "table"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TableProperties className="h-3 w-3" />
              <span>Results</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("query")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "query"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>Compiled Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "graph"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="h-3 w-3" />
              <span>Schema BFS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "audit"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCheck className="h-3 w-3" />
              <span>Audit Ledger</span>
            </button>
          </div>
        </div>

        {/* Console Body: Left Rail + Right Active Canvas */}
        <div className="grid min-h-[440px] grid-cols-1 md:grid-cols-[220px_1fr]">
          {/* Left Rail: Connected Clusters & Engine Policy */}
          <div className="hidden flex-col justify-between border-r border-white/10 bg-[#080C14] p-4 md:flex">
            <div className="space-y-4">
              {/* Brand Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-[10px] font-bold text-zinc-950">
                  N
                </span>
                <span className="text-xs font-semibold tracking-tight text-slate-100">
                  Nexus Query
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
                  <LockKeyhole className="h-2 w-2" />
                  Read-only
                </span>
              </div>

              {/* Active Clusters */}
              <div className="space-y-1.5 pt-2">
                <p className="px-1 text-[9px] font-mono uppercase tracking-[0.12em] text-slate-500">
                  Active Clusters
                </p>
                <div className="flex items-center justify-between rounded-md border border-white/5 bg-slate-900/40 px-2.5 py-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-indigo-400" />
                    PostgreSQL 16
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    online
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/5 bg-slate-900/40 px-2.5 py-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-emerald-400" />
                    MongoDB 7.0
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    online
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/5 bg-slate-900/40 px-2.5 py-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Elasticsearch 8
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    online
                  </span>
                </div>
              </div>

              {/* Engine State */}
              <div className="space-y-1.5 pt-2">
                <p className="px-1 text-[9px] font-mono uppercase tracking-[0.12em] text-slate-500">
                  Engine State
                </p>
                <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2.5 space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Execution:</span>
                    <span className="text-emerald-400">Read-Only</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Audit Chaining:</span>
                    <span className="text-cyan-400">SHA-256</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ambiguity Pass:</span>
                    <span className="text-emerald-400">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialect tag */}
            <div className="pt-4 border-t border-white/5 text-[10px] text-slate-500 font-mono">
              <span>Introspected: 7 tables</span>
            </div>
          </div>

          {/* Right Main Display Pane */}
          <div className="flex flex-col justify-between p-5 sm:p-6 bg-[#0B0F17]">
            {/* Top Prompt Display */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                    &gt;
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-200 font-sans">
                    {scenario.question}
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Validated Plan
                </span>
              </div>

              {/* Tab 1: Results Table View */}
              {activeTab === "table" && (
                <div className="space-y-4">
                  {/* If Ambiguity Scenario is active, show the interactive clarification card */}
                  {scenario.id === "ambiguity" && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Ambiguity Detected: Two terms require definition</span>
                      </div>
                      <p className="text-[12px] text-slate-300">
                        Before execution, select the semantic rule for &quot;high-value&quot; spend:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          "Lifetime spend above $1,000",
                          "Single order above $1,000",
                          "Top 10% of customers",
                        ].map((opt, idx) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedClarification(idx)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium text-left transition-all ${
                              selectedClarification === idx
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full border ${
                                selectedClarification === idx
                                  ? "border-emerald-400 bg-emerald-400"
                                  : "border-slate-600 bg-transparent"
                              }`}
                            />
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results Data Table */}
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
                    <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/40 px-4 py-2 text-[10px] font-mono text-slate-400">
                      <span>Result preview · {scenario.id === "revenue" ? "products" : scenario.id === "ambiguity" ? "customers" : "catalog & reviews"}</span>
                      <span className="text-emerald-400">Read-only execution · 5 rows returned</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead className="border-b border-white/5 bg-slate-900/20 font-mono text-[11px] text-slate-400">
                          {scenario.id === "revenue" && (
                            <tr>
                              <th className="px-4 py-2 font-medium">Product / Item</th>
                              <th className="px-4 py-2 font-medium">Category</th>
                              <th className="px-4 py-2 font-medium">Revenue (This Month)</th>
                              <th className="px-4 py-2 font-medium">Orders</th>
                              <th className="px-4 py-2 font-medium">Provenance</th>
                            </tr>
                          )}
                          {scenario.id === "ambiguity" && (
                            <tr>
                              <th className="px-4 py-2 font-medium">Customer</th>
                              <th className="px-4 py-2 font-medium">Email</th>
                              <th className="px-4 py-2 font-medium">Lifetime Spend</th>
                              <th className="px-4 py-2 font-medium">Status</th>
                              <th className="px-4 py-2 font-medium">Source</th>
                            </tr>
                          )}
                          {scenario.id === "federated" && (
                            <tr>
                              <th className="px-4 py-2 font-medium">Product</th>
                              <th className="px-4 py-2 font-medium">Catalog Price</th>
                              <th className="px-4 py-2 font-medium">User Rating</th>
                              <th className="px-4 py-2 font-medium">Search Score</th>
                              <th className="px-4 py-2 font-medium">Federated Sources</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                          {scenario.id === "revenue" && (
                            <>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Pro Noise-Cancelling Buds</td>
                                <td className="px-4 py-2.5 text-slate-400">Audio</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$14,250.00</td>
                                <td className="px-4 py-2.5 font-mono text-slate-300">128</td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PG.products + orders</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Ultra-Wide 34&quot; Curved Monitor</td>
                                <td className="px-4 py-2.5 text-slate-400">Display</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$11,890.00</td>
                                <td className="px-4 py-2.5 font-mono text-slate-300">89</td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PG.products + orders</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Mechanical Wireless Deck</td>
                                <td className="px-4 py-2.5 text-slate-400">Peripherals</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$8,420.00</td>
                                <td className="px-4 py-2.5 font-mono text-slate-300">204</td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PG.products + orders</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Ergonomic Desk Riser</td>
                                <td className="px-4 py-2.5 text-slate-400">Office</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$6,150.00</td>
                                <td className="px-4 py-2.5 font-mono text-slate-300">62</td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PG.products + orders</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Thunderbolt 4 Hub Pro</td>
                                <td className="px-4 py-2.5 text-slate-400">Accessories</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$5,890.00</td>
                                <td className="px-4 py-2.5 font-mono text-slate-300">95</td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PG.products + orders</td>
                              </tr>
                            </>
                          )}
                          {scenario.id === "ambiguity" && (
                            <>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">A. Sharma</td>
                                <td className="px-4 py-2.5 text-slate-400">a.sharma@example.com</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$4,250.00</td>
                                <td className="px-4 py-2.5"><span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px]">High-Value</span></td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PostgreSQL</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">M. Okafor</td>
                                <td className="px-4 py-2.5 text-slate-400">m.okafor@example.com</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$3,100.00</td>
                                <td className="px-4 py-2.5"><span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px]">High-Value</span></td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PostgreSQL</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">L. Chen</td>
                                <td className="px-4 py-2.5 text-slate-400">l.chen@example.com</td>
                                <td className="px-4 py-2.5 font-mono text-emerald-400 font-medium">$2,890.00</td>
                                <td className="px-4 py-2.5"><span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px]">High-Value</span></td>
                                <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">PostgreSQL</td>
                              </tr>
                            </>
                          )}
                          {scenario.id === "federated" && (
                            <>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Sony WH-1000XM5 ANC</td>
                                <td className="px-4 py-2.5 font-mono text-slate-200">$398.00</td>
                                <td className="px-4 py-2.5 font-mono text-amber-300">4.8 ★ (1,420 rev)</td>
                                <td className="px-4 py-2.5 font-mono text-cyan-400">0.962 BM25</td>
                                <td className="px-4 py-2.5 text-[10px] font-mono text-emerald-300">ES + PG + Mongo</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Bose QuietComfort Ultra</td>
                                <td className="px-4 py-2.5 font-mono text-slate-200">$429.00</td>
                                <td className="px-4 py-2.5 font-mono text-amber-300">4.7 ★ (890 rev)</td>
                                <td className="px-4 py-2.5 font-mono text-cyan-400">0.941 BM25</td>
                                <td className="px-4 py-2.5 text-[10px] font-mono text-emerald-300">ES + PG + Mongo</td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 font-medium text-slate-100">Sennheiser Momentum 4</td>
                                <td className="px-4 py-2.5 font-mono text-slate-200">$349.95</td>
                                <td className="px-4 py-2.5 font-mono text-amber-300">4.6 ★ (610 rev)</td>
                                <td className="px-4 py-2.5 font-mono text-cyan-400">0.887 BM25</td>
                                <td className="px-4 py-2.5 text-[10px] font-mono text-emerald-300">ES + PG + Mongo</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Compiled Dialects View */}
              {activeTab === "query" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Code2 className="h-3.5 w-3.5" />
                      {scenario.dialect}
                    </span>
                    <span className="text-[10px]">Read-only parser passed · 0 write statements</span>
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 selection:bg-emerald-500/30">
                    <code>{scenario.sqlQuery}</code>
                  </pre>
                </div>
              )}

              {/* Tab 3: Schema BFS Graph Path */}
              {activeTab === "graph" && (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-400">
                    <span>BFS Multi-hop Schema Graph Discovery:</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-wrap items-center justify-center gap-3">
                    {scenario.joinPath.map((node, index) => (
                      <React.Fragment key={node}>
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 text-xs font-mono text-emerald-300">
                          <Database className="h-3 w-3 text-emerald-400" />
                          <span>{node}</span>
                        </div>
                        {index < scenario.joinPath.length - 1 && (
                          <div className="flex items-center text-slate-500">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 text-center">
                    Graph traversal evaluated in &lt;1.2ms via adjacency index. Zero full-table cartesian scans.
                  </p>
                </div>
              )}

              {/* Tab 4: Cryptographic Ledger Proof */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-cyan-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      SHA-256 Hash Chained Audit Entry
                    </span>
                    <span className="text-emerald-400 text-[10px]">Verified Immutable</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-[11px] space-y-2 text-slate-300">
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-500">Action:</span>
                      <span className="text-emerald-400">QUERY_EXECUTION_COMPLETED</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-500">Block Signature:</span>
                      <span className="text-slate-200">{scenario.auditHash}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-500">Read-Only Guard:</span>
                      <span className="text-emerald-400">PASSED (AST Checked)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Query Latency:</span>
                      <span className="text-cyan-300">{scenario.latency}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Ribbon */}
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                AST Safety Verified · Single Logical IR Plan
              </span>
              <span className="text-slate-500">
                Illustrative interface. Figures are example data, not results from your databases.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
