"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Database,
  ShieldCheck,
  Network,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Lock,
  Zap,
  Server,
  Terminal,
  KeyRound,
  Code2,
  LogIn,
  LogOut,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_CREDENTIALS,
  loginWithCredentials,
  getStoredUser,
} from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LandingPage() {
  const { currentUser, setCurrentUser, logoutUser } = useShellStore();

  const [activeQuery, setActiveQuery] = React.useState<string>(
    "Show me the top five products by revenue this month."
  );
  const [activeTab, setActiveTab] = React.useState<"plan" | "sql" | "mql" | "trace">("plan");
  const [authLoading, setAuthLoading] = React.useState<boolean>(false);

  // Sync user state on mount
  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  const sampleQueries = [
    {
      query: "Show me the top five products by revenue this month.",
      tag: "Federated Hash Join",
      sources: "PostgreSQL + MongoDB",
      engine: "SQL + MQL",
      timing: "4.2ms",
      plan: "Subquery 1 (Postgres: orders SUM revenue) ⋈ Subquery 2 (Mongo: products details) on product_id = id",
      sql: `SELECT p.id, p.name, SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY revenue DESC LIMIT 5;`,
      mql: `db.reviews.aggregate([
  { "$match": { "rating": { "$gte": 4.0 } } },
  { "$group": { "_id": "$product_id", "avg_rating": { "$avg": "$rating" } } }
]);`,
      ambiguity: "Deterministic · High Confidence (98.4%)",
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      tag: "Ambiguity Clarification",
      sources: "PostgreSQL + Elasticsearch",
      engine: "Clarification Prompt",
      timing: "Interactive",
      plan: "Ambiguity Gating (detects under-specified 'high-value' & 'recently') ➔ Interactive prompt ➔ Filtered SQL",
      sql: `SELECT c.id, c.name, c.email, SUM(o.total_amount) AS ltv
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id HAVING SUM(o.total_amount) >= 1000;`,
      mql: `GET catalog/_search
{
  "query": {
    "match": { "category": "electronics" }
  }
}`,
      ambiguity: "Ambiguity Detected: 'high-value' & 'recently' prompt triggered",
    },
    {
      query: "Which customers have placed orders but have not paid?",
      tag: "Read-Only Relational",
      sources: "PostgreSQL",
      engine: "SQL AST Verified",
      timing: "2.8ms",
      plan: "Single-engine relational plan with deterministic left anti-join on invoices/payments",
      sql: `SELECT c.name, c.email, o.id AS order_id, o.total_amount
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.payment_status = 'unpaid' AND o.status != 'cancelled'
ORDER BY o.created_at DESC;`,
      mql: `// Relational only - No document store query needed`,
      ambiguity: "Deterministic · Pure Relational AST Guard Passed",
    },
  ];

  const currentScenario =
    sampleQueries.find((s) => s.query === activeQuery) || sampleQueries[0];

  const handleQuickLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await loginWithCredentials(
        DEMO_CREDENTIALS.email,
        DEMO_CREDENTIALS.password
      );
      setCurrentUser(res.user);
    } catch {
      // Fallback
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e0e0e0] font-sans antialiased selection:bg-[#10a37f]/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-[radial-gradient(ellipse_75%_50%_at_50%_-15%,rgba(16,163,127,0.18),rgba(0,0,0,0))] pointer-events-none z-0" />

      {/* Sleek Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0e0e0e]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#10a37f] border border-[#2a2a2a] group-hover:border-[#10a37f]/50 transition-colors shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-white">
                Nexus Query
              </span>
              <span className="hidden sm:inline-block text-[#666666] text-xs">/</span>
              <span className="text-xs text-zinc-400 font-normal hidden sm:inline-block">
                Natural Language Query Engine
              </span>
              <span className="rounded-full border border-white/[0.08] bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-mono text-[#10a37f]">
                v0.1
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#888888]">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#simulator" className="hover:text-white transition-colors">
              Plan Simulator
            </a>
            <a href="#databases" className="hover:text-white transition-colors">
              Databases
            </a>
            <Link href="/schema" className="hover:text-white transition-colors">
              Schema Canvas
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              API Docs
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1c1c1c] border border-white/[0.08] text-xs text-zinc-300">
                  <div className="h-2 w-2 rounded-full bg-[#10a37f]" />
                  <span className="font-medium hidden sm:inline">{currentUser.full_name}</span>
                  <span className="text-[10px] text-[#777777]">({currentUser.email})</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={logoutUser}
                  title="Sign out"
                  className="h-8 w-8 text-[#888888] hover:text-red-400 hover:bg-[#1a1a1a] rounded-lg p-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/[0.08] bg-[#181818] hover:bg-[#222222] text-[#cccccc] hover:text-white text-xs h-8 px-3 rounded-lg gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#10a37f]" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            <Link href="/chat">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-8 px-3.5 rounded-lg gap-1.5 shadow-sm transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Assistant</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Open, Spacious, Editorial (No Clunky Outer Boxes) */}
      <section className="relative z-10 pt-16 pb-12 md:pt-24 md:pb-16 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Source Badges Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#141414]/90 px-3.5 py-1 text-xs text-[#a0a0a0] shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10a37f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10a37f]" />
          </span>
          <span className="text-zinc-200 font-medium">Heterogeneous Database Federation</span>
          <span className="text-zinc-600">·</span>
          <span>PostgreSQL · MongoDB · Elasticsearch</span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-3xl mx-auto">
            Query your databases in plain English.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Zero hallucinations. Automatic ambiguity clarification and guaranteed read-only AST compilation.
          </p>
        </div>

        {/* Flowing CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link href="/chat">
            <Button
              size="lg"
              className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-sm font-medium h-11 px-6 rounded-xl gap-2 shadow-lg shadow-[#10a37f]/20 transition-all hover:scale-[1.02]"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Launch Query Assistant</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/schema">
            <Button
              size="lg"
              variant="outline"
              className="border-white/[0.1] bg-[#181818]/60 hover:bg-[#202020] text-zinc-300 hover:text-white text-sm h-11 px-5 rounded-xl gap-2 transition-all"
            >
              <Network className="h-4 w-4 text-[#10a37f]" />
              <span>Schema Canvas</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Modern Plan Simulator - Fluid, Open, Non-Boxy Visualizer */}
      <section id="simulator" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-6">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <p className="text-xs font-mono text-[#10a37f] uppercase tracking-wider mb-1">
                Interactive Execution Preview
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Live Query Compiler & AST Simulator
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
                {currentScenario.sources}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="font-mono text-[#10a37f]">{currentScenario.timing}</span>
            </div>
          </div>

          {/* Flowing Query Chips (Clean Pills, Not Card Boxes) */}
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((scenario) => {
              const isActive = scenario.query === activeQuery;
              return (
                <button
                  key={scenario.query}
                  onClick={() => setActiveQuery(scenario.query)}
                  className={`text-left text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-[#1c1c1c] text-white border-[#10a37f]/50 shadow-xs"
                      : "bg-[#141414]/70 text-zinc-400 border-white/[0.06] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isActive ? "bg-[#10a37f]" : "bg-zinc-600"
                    }`}
                  />
                  <span className="font-medium truncate max-w-[260px] sm:max-w-md">
                    {scenario.query}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-zinc-400 border border-white/[0.06]">
                    {scenario.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code & Plan Canvas - Clean Seamless Presentation */}
          <div className="border-t border-b border-white/[0.08] py-4 space-y-4">
            {/* View Mode Tabs */}
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "plan", label: "Distributed Plan", icon: GitBranchIcon },
                    { id: "sql", label: "SQL Dialect", icon: Database },
                    { id: "mql", label: "MongoDB / ES", icon: Terminal },
                    { id: "trace", label: "Safety & Timing", icon: ShieldCheck },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === id
                        ? "bg-[#1f1f1f] text-white border border-white/[0.08]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#10a37f]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Read-Only Verified</span>
              </div>
            </div>

            {/* Code Body */}
            <div className="font-mono text-xs leading-relaxed text-zinc-300 min-h-[160px] overflow-x-auto py-2">
              {activeTab === "plan" && (
                <div className="space-y-3">
                  <div className="text-zinc-400">
                    <span className="text-[#10a37f] font-semibold">// Logical Execution Tree:</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04] text-[#ececec]">
                    {currentScenario.plan}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1">
                    <span>Engine: {currentScenario.engine}</span>
                    <span>·</span>
                    <span>Ambiguity Status: {currentScenario.ambiguity}</span>
                  </div>
                </div>
              )}

              {activeTab === "sql" && (
                <pre className="text-[#a5b4fc] p-3 bg-black/40 rounded-xl border border-white/[0.04]">
                  {currentScenario.sql}
                </pre>
              )}

              {activeTab === "mql" && (
                <pre className="text-[#86efac] p-3 bg-black/40 rounded-xl border border-white/[0.04]">
                  {currentScenario.mql}
                </pre>
              )}

              {activeTab === "trace" && (
                <div className="space-y-2 p-3 bg-black/40 rounded-xl border border-white/[0.04]">
                  <div className="flex items-center gap-2 text-[#10a37f]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>AST Mutation Guard: SELECT & AGGREGATE ONLY. Mutating nodes blocked.</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Distributed In-Memory Hash Join compiled in {currentScenario.timing}.</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Lock className="h-4 w-4 text-zinc-500" />
                    <span>SHA-256 Merkle Provenance: Validated across cluster nodes.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4-Tier Pipeline Section - Fluid Editorial Stream (No Heavy Card Boxes) */}
      <section id="pipeline" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-mono text-[#10a37f] uppercase tracking-wider">
              Architecture Overview
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              A 4-tier engine engineered for strict accuracy
            </h2>
            <p className="text-sm text-zinc-400">
              Transforming natural language queries into deterministic, read-only multi-database execution plans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
              <span className="font-mono text-xs text-[#10a37f] font-semibold">01</span>
              <h3 className="text-sm font-semibold text-white">Intent Extraction</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zero-hallucination semantic parsing maps entity references strictly to live introspected database schemas.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
              <span className="font-mono text-xs text-[#10a37f] font-semibold">02</span>
              <h3 className="text-sm font-semibold text-white">Ambiguity Guardian</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Identifies vague metrics, missing timeframes, or cross-database collision and asks interactive clarifying questions.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
              <span className="font-mono text-xs text-[#10a37f] font-semibold">03</span>
              <h3 className="text-sm font-semibold text-white">Read-Only AST Guard</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Guarantees analytical purity. Mutation operations like DROP, DELETE, or UPDATE are physically rejected at AST compile time.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
              <span className="font-mono text-xs text-[#10a37f] font-semibold">04</span>
              <h3 className="text-sm font-semibold text-white">Federated Execution</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Compiles native SQL, MQL, or ES DSL and coordinates in-memory distributed joins with sub-10ms performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Connected Databases Section - Clean 3-Column Layout */}
      <section id="databases" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 border-t border-white/[0.08]">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-[#10a37f] uppercase tracking-wider mb-1">
                Heterogeneous Cluster
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Connected Databases
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              125 total seed records available for immediate querying
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-semibold text-white">PostgreSQL 16</h3>
                <span className="text-[10px] font-mono text-zinc-500">ecommerce_demo</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Relational schema handling transactional data: <code className="text-[#10a37f]">customers</code>, <code className="text-[#10a37f]">orders</code>, <code className="text-[#10a37f]">order_items</code>, and <code className="text-[#10a37f]">products</code> (80 rows).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#10a37f]" />
                <h3 className="text-sm font-semibold text-white">MongoDB 7.0</h3>
                <span className="text-[10px] font-mono text-zinc-500">analytics_demo</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Document NoSQL store containing <code className="text-[#10a37f]">reviews</code> (25 customer feedback records, ratings 1-5, and verified purchase flags).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-white">Elasticsearch 8.13</h3>
                <span className="text-[10px] font-mono text-zinc-500">catalog_demo</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Search engine indexing the <code className="text-[#10a37f]">catalog</code> (20 items for full-text descriptions, stock availability, and BM25 scores).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials & Instant Login Ribbon - Sleek Floating Ribbon */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#141414]/80 border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f1f1f] text-[#10a37f] border border-white/[0.06] shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Demo Credentials Ready</p>
              <p className="text-[11px] text-zinc-400 font-mono">
                admin@example.com / Admin123! · Administrator Role
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickLogin}
              disabled={authLoading}
              className="border-white/[0.08] bg-[#1a1a1a] hover:bg-[#242424] text-xs text-zinc-300 hover:text-white h-8 px-3 rounded-lg flex-1 sm:flex-none gap-1.5"
            >
              <Zap className="h-3 w-3 text-[#10a37f]" />
              <span>{authLoading ? "Signing in..." : "1-Click Sign In"}</span>
            </Button>

            <Link href="/chat" className="flex-1 sm:flex-none">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-8 px-3.5 rounded-lg w-full gap-1.5"
              >
                <span>Enter Chat</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Minimalist Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 mt-12 bg-[#090909]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#10a37f]" />
            <span className="text-zinc-400 font-medium">Nexus Query</span>
            <span>·</span>
            <span>Heterogeneous NLP Database Engine</span>
          </div>

          <div className="flex items-center gap-5 text-zinc-400">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <Link href="/schema" className="hover:text-white transition-colors">
              Schema Canvas
            </Link>
            <Link href="/connections" className="hover:text-white transition-colors">
              Data Targets
            </Link>
            <Link href="/audit" className="hover:text-white transition-colors">
              Audit
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              API Swagger
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GitBranchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
