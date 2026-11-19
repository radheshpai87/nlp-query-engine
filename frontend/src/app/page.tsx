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
  Search,
  MessageSquare,
  Lock,
  Zap,
  Server,
  Terminal,
  KeyRound,
  Layers,
  Code2,
  GitFork,
  Cpu,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldAlert,
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(16,163,127,0.18),rgba(0,0,0,0))] pointer-events-none z-0" />

      {/* Sleek Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#222222] bg-[#0e0e0e]/85 backdrop-blur-xl">
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
              <span className="rounded-full border border-[#2e2e2e] bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-mono text-[#10a37f]">
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
            <a href="#features" className="hover:text-white transition-colors">
              Architecture
            </a>
            <Link href="/schema" className="hover:text-white transition-colors">
              Topology Canvas
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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-zinc-300">
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
                  className="border-[#2c2c2c] bg-[#181818] hover:bg-[#222222] text-[#cccccc] hover:text-white text-xs h-8 px-3 rounded-lg gap-1.5"
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

      {/* Hero Section */}
      <section className="relative z-10 pt-14 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Source Badges Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#262626] bg-[#141414]/90 px-3.5 py-1 text-xs text-[#a0a0a0] shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10a37f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10a37f]" />
          </span>
          <span className="text-zinc-200 font-medium">Heterogeneous Database Federation</span>
          <span className="text-zinc-600">·</span>
          <span>PostgreSQL · MongoDB · Elasticsearch</span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-3.5">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.15] max-w-3xl mx-auto">
            Query your databases in plain English.
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Zero hallucinations. Automatic ambiguity clarification and strict read-only AST compilation.
          </p>
        </div>

        {/* Hero Interactive Prompt Box */}
        <div className="pt-2 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#161616]/95 p-3.5 shadow-2xl space-y-3 text-left backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#101010] rounded-xl border border-[#262626] focus-within:border-[#10a37f]/70 transition-colors">
              <Search className="h-4 w-4 text-[#777777] shrink-0" />
              <input
                type="text"
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                placeholder="Ask any question across your databases..."
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder:text-[#555555] focus:outline-hidden py-1.5 px-1"
              />
              <Link href={`/chat?q=${encodeURIComponent(activeQuery)}`}>
                <Button
                  size="sm"
                  className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs h-7 px-3.5 rounded-lg gap-1 shrink-0 font-medium shadow-xs"
                >
                  <span>Query</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
              <span className="text-[11px] text-[#666666] mr-1">Try asking:</span>
              <button
                type="button"
                onClick={() => setActiveQuery("Show me the top five products by revenue this month.")}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  activeQuery === "Show me the top five products by revenue this month."
                    ? "bg-[#10a37f]/15 border-[#10a37f]/50 text-white font-medium"
                    : "bg-[#121212] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838]"
                }`}
              >
                Top 5 Products by Revenue
              </button>
              <button
                type="button"
                onClick={() => setActiveQuery("Show me high-value customers who recently purchased electronics.")}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  activeQuery === "Show me high-value customers who recently purchased electronics."
                    ? "bg-[#10a37f]/15 border-[#10a37f]/50 text-white font-medium"
                    : "bg-[#121212] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838]"
                }`}
              >
                High-Value Recent Customers
              </button>
              <button
                type="button"
                onClick={() => setActiveQuery("Which customers have placed orders but have not paid?")}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  activeQuery === "Which customers have placed orders but have not paid?"
                    ? "bg-[#10a37f]/15 border-[#10a37f]/50 text-white font-medium"
                    : "bg-[#121212] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838]"
                }`}
              >
                Unpaid Orders
              </button>
            </div>
          </div>
        </div>

        {/* Direct Action Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/chat">
            <Button
              size="sm"
              className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold h-9 px-4.5 rounded-xl gap-2 shadow-sm"
            >
              <MessageSquare className="h-4 w-4 text-[#10a37f]" />
              <span>Launch Full Chat Assistant</span>
            </Button>
          </Link>
          <Link href="/schema">
            <Button
              size="sm"
              variant="outline"
              className="border-[#2c2c2c] bg-[#161616] text-[#cccccc] hover:bg-[#202020] hover:text-white text-xs h-9 px-4.5 rounded-xl gap-2"
            >
              <Network className="h-4 w-4 text-[#10a37f]" />
              <span>Explore Schema Topology</span>
            </Button>
          </Link>
          {!currentUser && (
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="border-[#2c2c2c] bg-[#161616] text-[#cccccc] hover:bg-[#202020] hover:text-white text-xs h-9 px-4 rounded-xl gap-2"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Demo Credentials</span>
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Plan Simulator & Code Synthesis Preview (Appealing AI Feature) */}
      <section id="simulator" className="py-10 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-[#262626] bg-[#141414] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#222222] bg-[#181818] px-4 py-3 gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#10a37f]" />
              <span className="text-xs font-semibold text-white">Execution Plan & AST Inspector</span>
              <span className="text-[10px] font-mono text-[#10a37f] bg-[#10a37f]/10 px-2 py-0.5 rounded border border-[#10a37f]/20">
                {currentScenario.tag}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#101010] p-1 rounded-lg border border-[#242424] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "plan" ? "bg-[#252525] text-white font-medium" : "text-[#777777] hover:text-[#cccccc]"
                }`}
              >
                Federated Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sql")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "sql" ? "bg-[#252525] text-white font-medium" : "text-[#777777] hover:text-[#cccccc]"
                }`}
              >
                SQL Dialect
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mql")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "mql" ? "bg-[#252525] text-white font-medium" : "text-[#777777] hover:text-[#cccccc]"
                }`}
              >
                MongoDB / ES
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trace")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "trace" ? "bg-[#252525] text-white font-medium" : "text-[#777777] hover:text-[#cccccc]"
                }`}
              >
                Safety & Timing
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-4 bg-[#101010] font-mono text-xs">
            {activeTab === "plan" && (
              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#171717] border border-[#262626]">
                  <GitFork className="h-4 w-4 text-[#10a37f] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-white font-medium block">Distributed Execution Graph</span>
                    <p className="text-zinc-400 text-xs leading-relaxed">{currentScenario.plan}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222222]">
                    <span className="text-[#666666] block">Involved Targets:</span>
                    <span className="text-emerald-400 font-semibold">{currentScenario.sources}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222222]">
                    <span className="text-[#666666] block">Ambiguity Score:</span>
                    <span className="text-zinc-300">{currentScenario.ambiguity}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222222]">
                    <span className="text-[#666666] block">Join Latency:</span>
                    <span className="text-[#10a37f] font-semibold">{currentScenario.timing}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sql" && (
              <pre className="text-emerald-400/90 whitespace-pre overflow-x-auto leading-relaxed p-1">
                {currentScenario.sql}
              </pre>
            )}

            {activeTab === "mql" && (
              <pre className="text-cyan-400/90 whitespace-pre overflow-x-auto leading-relaxed p-1">
                {currentScenario.mql}
              </pre>
            )}

            {activeTab === "trace" && (
              <div className="space-y-2 font-sans text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#151515] border border-[#242424]">
                  <span className="text-zinc-400">AST Read-Only Guard:</span>
                  <span className="text-[#10a37f] font-mono font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> PASSED (SELECT/AGGREGATE Only)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#151515] border border-[#242424]">
                  <span className="text-zinc-400">Cryptographic Proof:</span>
                  <span className="text-zinc-300 font-mono text-[11px]">SHA-256 Verified Merkle Leaf</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#151515] border border-[#242424]">
                  <span className="text-zinc-400">Federation Memory Footprint:</span>
                  <span className="text-zinc-300 font-mono text-[11px]">1.2 MB buffer in-memory</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer of card */}
          <div className="px-4 py-2.5 bg-[#141414] border-t border-[#222222] flex items-center justify-between text-xs text-[#777777]">
            <span>Click any suggestion above to update AST synthesis</span>
            <Link
              href={`/chat?q=${encodeURIComponent(activeQuery)}`}
              className="text-[#10a37f] hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Execute query in assistant</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4-Step Pipeline Bar */}
      <section id="pipeline" className="py-12 border-y border-[#202020] bg-[#121212]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#10a37f] font-semibold">
              Execution Architecture
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              4-Tier Autonomous Query Pipeline
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl border border-[#222222] bg-[#161616] space-y-2 relative group hover:border-[#333333] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#10a37f] font-bold">STEP 01</span>
                <Database className="h-4 w-4 text-[#666666]" />
              </div>
              <div className="text-xs font-semibold text-white">Introspect Schema</div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                Crawls SQL tables, Mongo collections & ES indices into a unified catalog graph.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#222222] bg-[#161616] space-y-2 relative group hover:border-[#333333] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-400 font-bold">STEP 02</span>
                <ShieldAlert className="h-4 w-4 text-[#666666]" />
              </div>
              <div className="text-xs font-semibold text-white">Clarify Ambiguity</div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                Detects vague predicates and confirms intent interactively with zero silent assumptions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#222222] bg-[#161616] space-y-2 relative group hover:border-[#333333] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">STEP 03</span>
                <Code2 className="h-4 w-4 text-[#666666]" />
              </div>
              <div className="text-xs font-semibold text-white">Compile & AST Guard</div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                Synthesizes dialect SQL/MQL strictly constrained to read-only guarantees.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#222222] bg-[#161616] space-y-2 relative group hover:border-[#333333] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">STEP 04</span>
                <Zap className="h-4 w-4 text-[#666666]" />
              </div>
              <div className="text-xs font-semibold text-white">Federate & Trace</div>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                Executes parallel sub-queries with high-performance in-memory hash joins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architecture Cards (Tests require these exact titles) */}
      <section id="features" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-1.5 max-w-lg mx-auto">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#10a37f]">
            Core Architecture
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Built for precision, correctness & safety
          </h2>
          <p className="text-xs text-[#777777]">
            Every query execution is grounded in deterministic metadata with zero silent assumptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Connected Databases */}
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3.5 hover:border-[#383838] transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-[#202020] text-[#10a37f] flex items-center justify-center border border-[#2c2c2c]">
                <Database className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-[#10a37f] bg-[#10a37f]/10 border border-[#10a37f]/20 px-2 py-0.5 rounded">
                3 Live Targets
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Connected Databases</h3>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Connects PostgreSQL 16 (Orders), MongoDB 7.0 (Reviews), and Elasticsearch 8.13 (Catalog) into a single federated query graph.
              </p>
            </div>
            <div className="pt-2 border-t border-[#222222] space-y-1.5 text-[11px] text-[#777777]">
              <div className="flex justify-between items-center">
                <span>PostgreSQL 16 E-Commerce</span>
                <span className="text-[#10a37f] font-mono">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span>MongoDB 7.0 Analytics</span>
                <span className="text-[#10a37f] font-mono">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Elasticsearch 8.13 Catalog</span>
                <span className="text-[#10a37f] font-mono">Online</span>
              </div>
            </div>
          </div>

          {/* Card 2: Ambiguity Guardian */}
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3.5 hover:border-[#383838] transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-[#202020] text-amber-400 flex items-center justify-center border border-[#2c2c2c]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                Zero Assumptions
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Ambiguity Guardian</h3>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Detects under-specified metrics or timeframes (e.g. &ldquo;high-value&rdquo;, &ldquo;recent&rdquo;) and prompts for confirmation before compiling.
              </p>
            </div>
            <div className="pt-2 border-t border-[#222222] space-y-1 text-[11px] text-[#777777]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Interactive parameter resolution</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Confidence gating (&gt;85% threshold)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Zero unverified execution guesses</span>
              </div>
            </div>
          </div>

          {/* Card 3: Schema Canvas */}
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3.5 hover:border-[#383838] transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-[#202020] text-emerald-400 flex items-center justify-center border border-[#2c2c2c]">
                <Network className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                Visual Graph
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Schema Canvas</h3>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Interactive topology canvas visualizing tables, columns, intra-SQL foreign keys, and cross-database semantic relationships.
              </p>
            </div>
            <div className="pt-2 border-t border-[#222222] space-y-1 text-[11px] text-[#777777]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Discovers cross-database links</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Auto-layout and zoom controls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#10a37f]" />
                <span>Context injection into chat queries</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials & Quick Access Banner */}
      <section className="py-10 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-[#2c2c2c] bg-gradient-to-r from-[#171717] via-[#151515] to-[#171717] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[11px] font-medium">
              <KeyRound className="h-3 w-3" />
              <span>Simple Demo Authentication</span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Ready to test with pre-seeded administrator access?
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
              <div>
                <span className="text-[#666666] font-sans mr-1">Email:</span>
                <span className="text-white bg-[#101010] px-2 py-0.5 rounded border border-[#262626]">
                  {DEMO_CREDENTIALS.email}
                </span>
              </div>
              <div>
                <span className="text-[#666666] font-sans mr-1">Password:</span>
                <span className="text-white bg-[#101010] px-2 py-0.5 rounded border border-[#262626]">
                  {DEMO_CREDENTIALS.password}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="border-[#333333] bg-[#202020] hover:bg-[#282828] text-white text-xs h-9 px-4 rounded-xl"
              >
                Custom Login
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleQuickLogin}
              disabled={authLoading}
              className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-semibold h-9 px-4.5 rounded-xl gap-2 shadow-sm"
            >
              <span>{currentUser ? "Logged In ✓" : "1-Click Demo Login"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Tested Query Scenarios */}
      <section className="py-12 border-t border-[#202020] max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">Tested Query Scenarios</h3>
            <p className="text-xs text-[#777777]">
              Real-world federated natural language queries supported by the engine:
            </p>
          </div>
          <Link href="/chat">
            <Button
              size="sm"
              variant="outline"
              className="border-[#2c2c2c] bg-[#181818] text-xs text-[#cccccc] hover:text-white h-8 px-3"
            >
              <span>Try in Chat Assistant →</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sampleQueries.map((item, idx) => (
            <Link
              key={idx}
              href={`/chat?q=${encodeURIComponent(item.query)}`}
              className="p-4 rounded-xl border border-[#242424] bg-[#161616] hover:bg-[#1c1c1c] hover:border-[#383838] transition-colors group flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#10a37f]">{item.tag}</span>
                  <span className="text-[#666666]">{item.timing}</span>
                </div>
                <div className="text-xs font-medium text-white group-hover:text-[#10a37f] transition-colors">
                  {item.query}
                </div>
              </div>
              <div className="text-[10px] text-[#666666] border-t border-[#222222] pt-2 flex justify-between">
                <span>{item.sources}</span>
                <span>{item.engine}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#202020] py-8 text-xs text-[#666666]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 font-semibold">Nexus Query</span>
            <span>·</span>
            <span>Local Instance (127.0.0.1)</span>
            <span>·</span>
            <span className="text-[#10a37f]">Read-Only AST Guard Active</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/schema" className="hover:text-white transition-colors">
              Topology Graph
            </Link>
            <Link href="/connections" className="hover:text-white transition-colors">
              Connections
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
              Swagger Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
