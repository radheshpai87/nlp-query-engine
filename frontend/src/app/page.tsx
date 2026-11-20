"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Database,
  ShieldCheck,
  Network,
  ArrowRight,
  Terminal,
  LogIn,
  Zap,
  Code2,
  CheckCircle2,
  Lock,
  Layers,
  HelpCircle,
  FileText,
  Activity,
  BarChart3,
  Users,
  Briefcase,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();

  const [activeQueryIndex, setActiveQueryIndex] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<"results" | "sql" | "mql">("results");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  const demos = [
    {
      query: "Show me the top five products by revenue this month.",
      badge: "PostgreSQL + MongoDB",
      latency: "4.2ms",
      status: "Deterministic Plan",
      rows: [
        { product: "Pro Noise-Cancelling Buds", category: "Audio", revenue: "$14,250.00", rating: "4.9 ★" },
        { product: 'Ultra-Wide 34" Monitor', category: "Display", revenue: "$11,890.00", rating: "4.7 ★" },
        { product: "Mechanical Wireless Deck", category: "Peripherals", revenue: "$8,420.00", rating: "4.8 ★" },
      ],
      sql: `SELECT p.name, p.category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY p.name, p.category
ORDER BY revenue DESC LIMIT 5;`,
      mql: `db.reviews.aggregate([
  { "$match": { "rating": { "$gte": 4.5 } } },
  { "$group": { "_id": "$product_id", "avg_rating": { "$avg": "$rating" } } }
]);`,
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      badge: "Ambiguity Clarification",
      latency: "Interactive",
      status: "Clarification Prompt",
      rows: [
        { product: "Alice Smith (US)", category: "Orders: 8", revenue: "$4,250.00 LTV", rating: "Resolved > $1,000" },
        { product: "Bob Jones (CA)", category: "Orders: 5", revenue: "$3,100.00 LTV", rating: "Resolved > $1,000" },
        { product: "Diana Prince (US)", category: "Orders: 6", revenue: "$2,890.00 LTV", rating: "Resolved > $1,000" },
      ],
      sql: `SELECT c.name, c.country, SUM(o.total_amount) AS ltv
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name, c.country HAVING SUM(o.total_amount) >= 1000;`,
      mql: `GET catalog/_search
{
  "query": { "match": { "category": "electronics" } }
}`,
    },
    {
      query: "Which buyers purchased goods cheaper than 30?",
      badge: "BFS Multi-Hop Join",
      latency: "8.5ms",
      status: "Automated 3-Hop Path",
      rows: [
        { product: "Alice Smith", category: "TECH-AUD-003", revenue: "$29.99", rating: "order_items.unit_price < 30" },
        { product: "Evan Wright", category: "HOME-MUG-001", revenue: "$14.50", rating: "order_items.unit_price < 30" },
        { product: "Fiona Gallagher", category: "ACC-CAB-002", revenue: "$19.99", rating: "order_items.unit_price < 30" },
      ],
      sql: `SELECT c.name, oi.product_id, oi.unit_price
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE oi.unit_price < 30.00;`,
      mql: `// Auto-pathfound across customers -> orders -> order_items -> products`,
    },
  ];

  const currentDemo = demos[activeQueryIndex];

  const faqs = [
    {
      question: "How does the ambiguity detection engine work?",
      answer:
        "Unlike generic LLM wrappers that guess missing parameters silently, our engine analyzes your query against connected schema snapshots. If an entity is underspecified ('a certain customer'), a column name is ambiguous across databases, or a business metric is undefined ('revenue'), the engine pauses execution and presents an interactive clarification card with one-click choices before any database is touched.",
    },
    {
      question: "Are database write operations (INSERT, UPDATE, DELETE, DROP) possible?",
      answer:
        "No. The engine is strictly read-only. All generated queries pass through multi-layer AST and dialect validators that block all DDL and DML operations. Furthermore, database connections should be configured with read-only database user privileges as an independent security boundary.",
    },
    {
      question: "Can it join tables across different databases?",
      answer:
        "Yes. The engine builds an in-memory SchemaGraph that connects relational tables (PostgreSQL), collections (MongoDB), and indices (Elasticsearch). It executes parallel subqueries against each database and performs in-memory joining within a bounded memory budget.",
    },
    {
      question: "How is query execution auditable and tamper-evident?",
      answer:
        "Every single query, ambiguity resolution, generated SQL/MQL/DSL dialect, and execution outcome is appended to a cryptographic SHA-256 hash-chained audit ledger. Any retroactive alteration or deletion of audit logs breaks the cryptographic chain and is immediately detectable.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-[#ececec] flex flex-col antialiased selection:bg-[#10a37f]/30">
      {/* 1. Professional Navigation Bar */}
      <nav className="border-b border-zinc-800/80 bg-[#111111]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Nexus Query</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Enterprise
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">Natural Language Query Engine</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#integrations" className="hover:text-emerald-400 transition-colors">
              Databases
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <a href="#use-cases" className="hover:text-emerald-400 transition-colors">
              Use Cases
            </a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">
              Security & Audit
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link href="/chat">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-lg shadow-emerald-900/20">
                  Enter Console
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-xs text-zinc-300 hover:text-white h-9">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center gap-1.5">
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ambiguity-Aware • Strictly Read-Only • Heterogeneous Federation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Your Data. Every Database. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              One Conversation.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed">
            Connect your databases, ask questions in plain English, and get transparent, explainable answers without writing a single query.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register">
              <Button className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2">
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl"
              >
                <span>Explore the Platform</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Demonstration / Preview */}
      <section className="py-16 md:py-20 bg-[#141414] border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Interactive Engine Demonstration
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Select sample natural language inquiries to inspect plan synthesis, native dialects, and explainability.
            </p>
          </div>

          {/* Sample Query Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
            {demos.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveQueryIndex(idx);
                  setActiveTab("results");
                }}
                className={`text-left p-3 rounded-xl border text-xs transition-all ${
                  activeQueryIndex === idx
                    ? "bg-emerald-500/10 border-emerald-500/60 text-white shadow-sm"
                    : "bg-[#181818] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                    {d.badge}
                  </span>
                  <span className="text-[10px] text-zinc-500">{d.latency}</span>
                </div>
                <p className="font-medium line-clamp-2">{d.query}</p>
              </button>
            ))}
          </div>

          {/* Main Demo Preview Window */}
          <div className="rounded-2xl border border-zinc-800 bg-[#181818] overflow-hidden shadow-2xl">
            {/* Terminal bar */}
            <div className="h-10 bg-[#1f1f1f] border-b border-zinc-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-zinc-400 ml-2">
                  query-engine :: {currentDemo.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {(["results", "sql", "mql"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      activeTab === tab
                        ? "bg-zinc-800 text-white font-semibold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Content view */}
            <div className="p-5 font-mono text-xs">
              <div className="mb-4 pb-3 border-b border-zinc-800/80 flex items-center gap-2 text-zinc-300">
                <Terminal className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-white font-medium">&gt; {currentDemo.query}</span>
              </div>

              {activeTab === "results" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-sans">
                        <th className="pb-2 font-medium">Record / Entity</th>
                        <th className="pb-2 font-medium">Category / ID</th>
                        <th className="pb-2 font-medium">Value / Metric</th>
                        <th className="pb-2 font-medium">Provenance Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {currentDemo.rows.map((r, i) => (
                        <tr key={i} className="text-zinc-300">
                          <td className="py-2.5 text-white font-medium">{r.product}</td>
                          <td className="py-2.5 text-zinc-400">{r.category}</td>
                          <td className="py-2.5 text-emerald-400 font-semibold">{r.revenue}</td>
                          <td className="py-2.5 text-[11px] text-zinc-400">{r.rating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "sql" && (
                <pre className="p-3 rounded-xl bg-black/50 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                  {currentDemo.sql}
                </pre>
              )}

              {activeTab === "mql" && (
                <pre className="p-3 rounded-xl bg-black/50 text-cyan-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                  {currentDemo.mql}
                </pre>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Connected Databases Integrations */}
      <section id="integrations" className="py-16 md:py-20 border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-2">
              Polyglot Heterogeneous Topology
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Connected Databases
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl mx-auto">
              Simultaneously query relational tables, JSON document stores, and inverted search indices with automatic schema introspection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-white">PostgreSQL 16</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Relational transactional core for customers, orders, order items, and products with multi-hop foreign-key joins.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-blue-300">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">customers</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">orders</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">order_items</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">products</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-white">MongoDB 7.0</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Semi-structured document collections for product reviews, user telemetry events, and audit metadata storage.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-emerald-300">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">reviews</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">events</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">conversations</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-white">Elasticsearch 8.13</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Full-text search catalog with fuzzy matching and server access logs for performance response time analysis.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-amber-300">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">catalog</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">access_logs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Feature Highlights */}
      <section id="features" className="py-16 md:py-20 bg-[#141414] border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engine Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Designed specifically to overcome the silent guessing flaws of general-purpose LLMs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Ambiguity Guardian</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detects underspecified entities, conflicting cross-database column names, and vague timeframes with interactive clarification cards.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                <Network className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Schema Canvas</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Interactive ReactFlow graph displaying native foreign keys, user-defined cross-database links, and automated BFS multi-hop joins.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Code2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Polyglot Dialect Generation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Synthesizes parameterized PostgreSQL SQL, MongoDB aggregation pipelines, and Elasticsearch Query DSL safely from an IR Logical Plan.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Strict Read-Only Guardrails</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Multi-layer AST validation prevents any modification to connected production data. Write operations are architecturally prohibited.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">SHA-256 Audit Ledger</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tamper-evident cryptographically chained ledger logging every question, translation, and execution outcome with verifiable integrity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Provenance & Visualization</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Automated Chart.js suggestions, downloadable CSV/JSON exports, and clear provenance showing which tables and columns produced every number.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-20 border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Four deterministic steps from raw natural language to verified execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Connect & Introspect",
                desc: "Link PostgreSQL, MongoDB, or Elasticsearch. The engine automatically indexes tables, fields, and relationships.",
              },
              {
                step: "02",
                title: "Ask in Plain English",
                desc: "Type questions naturally. The Semantic Lexicon resolves business synonyms ('buyers' -> 'customers', 'goods' -> 'products').",
              },
              {
                step: "03",
                title: "Resolve Ambiguities",
                desc: "If any parameters are underspecified, the engine pauses and presents clarification options with zero guessing.",
              },
              {
                step: "04",
                title: "Explainable Output",
                desc: "Query executes safely across databases. Results appear as conversational summaries, data tables, and dynamic charts.",
              },
            ].map((s) => (
              <div key={s.step} className="p-5 rounded-2xl bg-[#181818] border border-zinc-800 space-y-2">
                <span className="text-2xl font-extrabold text-emerald-500 font-mono">{s.step}</span>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Persona Use Cases */}
      <section id="use-cases" className="py-16 md:py-20 bg-[#141414] border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tailored for Enterprise Teams
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Empowering technical and non-technical stakeholders across the organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Business Executives & Leaders</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Get instant conversational summaries of sales KPIs, product demand, and regional performance without waiting on data team tickets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Data & BI Analysts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Verify auto-generated SQL and MongoDB pipelines, inspect relationship paths on the Schema Canvas, and export CSV/JSON datasets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Product Managers</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cross-reference product catalog ratings in Elasticsearch with user telemetry events in MongoDB to understand feature adoption.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#181818] border border-zinc-800 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Operations & Support</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Query customer order status, shipment tracking, and access log latency without needing database administrator credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Frequently Asked Questions (FAQ) */}
      <section id="faq" className="py-16 md:py-20 border-b border-zinc-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Learn how our ambiguity-first architecture compares to standard query tools.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-[#181818] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-white hover:text-emerald-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform ${
                      openFaq === idx ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-16 bg-[#161616] text-center border-b border-zinc-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to explore your databases in plain English?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
            Zero SQL required. 100% read-only assurance. Connect your first database in minutes.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href="/register">
              <Button className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xl shadow-emerald-900/30 flex items-center gap-2">
                <span>Create Free Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="py-10 bg-[#0d0d0d] text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300 font-semibold">Nexus Query Engine</span>
            <span>&copy; 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/chat" className="hover:text-zinc-300 transition-colors">
              Chat Console
            </Link>
            <Link href="/connections" className="hover:text-zinc-300 transition-colors">
              Connections
            </Link>
            <Link href="/schema" className="hover:text-zinc-300 transition-colors">
              Schema Canvas
            </Link>
            <Link href="/audit" className="hover:text-zinc-300 transition-colors">
              Audit Ledger
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
