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
  KeyRound,
  LogIn,
  LogOut,
  Zap,
  Code2,
  CheckCircle2,
  Lock,
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

  const [activeQueryIndex, setActiveQueryIndex] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<"results" | "sql" | "mql">("results");
  const [authLoading, setAuthLoading] = React.useState<boolean>(false);

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
        { product: "Ultra-Wide 34\" Monitor", category: "Display", revenue: "$11,890.00", rating: "4.7 ★" },
        { product: "Mechanical Wireless Deck", category: "Peripherals", revenue: "$8,420.00", rating: "4.8 ★" },
      ],
      sql: `SELECT p.name, c.category, SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY p.name, c.category
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
GROUP BY c.id HAVING SUM(o.total_amount) >= 1000;`,
      mql: `GET catalog/_search
{
  "query": { "match": { "category": "electronics" } }
}`,
    },
  ];

  const currentDemo = demos[activeQueryIndex];

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
    <div className="min-h-screen bg-[#0d0f11] text-[#ececec] font-sans antialiased selection:bg-[#10a37f]/30 selection:text-white">
      {/* Top Ambient Light (Linear style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[360px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(16,163,127,0.15),transparent_70%)] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0d0f11]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#10a37f] text-black">
              <Sparkles className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              Nexus Query
            </span>
            <span className="text-zinc-600 text-xs hidden sm:inline">/</span>
            <span className="text-xs text-zinc-400 font-normal hidden sm:inline">
              Natural Language Query Engine
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#demo" className="hover:text-white transition-colors">
              Product Demo
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

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                  {currentUser.email}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={logoutUser}
                  className="h-7 w-7 text-zinc-400 hover:text-red-400 p-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-zinc-300 hover:text-white h-8 px-2.5"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1 text-[#10a37f]" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            <Link href="/chat">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-8 px-3 rounded-lg gap-1.5"
              >
                <span>Launch Assistant</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: Linear Minimalist Style (Low Text, High Visual Clarity) */}
      <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16 max-w-4xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
          <span>Heterogeneous Federation: PostgreSQL · MongoDB · Elasticsearch</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08] max-w-3xl mx-auto">
          Query your databases in plain English.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Zero hallucinations. Automated ambiguity clarification and compile-time read-only AST safety.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/chat">
            <Button
              size="lg"
              className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-sm font-medium h-10 px-5 rounded-lg gap-2 shadow-sm"
            >
              <span>Open Query Assistant</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/schema">
            <Button
              size="lg"
              variant="outline"
              className="border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 text-sm h-10 px-4 rounded-lg gap-1.5"
            >
              <Network className="h-4 w-4 text-[#10a37f]" />
              <span>Schema Canvas</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Interactive Product Window (Visual-First, Replaces Wall of Text) */}
      <section id="demo" className="max-w-4xl mx-auto px-4 pb-20">
        <div className="rounded-xl border border-white/[0.1] bg-[#121518]/90 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Mock Console Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0f1114]">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-zinc-400 font-mono ml-2">nexus-federated-console</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
              <span className="text-[#10a37f]">{currentDemo.badge}</span>
              <span>·</span>
              <span>{currentDemo.latency}</span>
            </div>
          </div>

          {/* Interactive Query Input Bar with Clickable Scenario Pills */}
          <div className="p-4 border-b border-white/[0.06] bg-[#14181c]/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-[#10a37f]">$</span>
              <span className="text-zinc-200">execute --federated-query</span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-[#10a37f]">{currentDemo.status}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {demos.map((d, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveQueryIndex(idx)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors font-sans ${
                    activeQueryIndex === idx
                      ? "bg-[#10a37f]/20 text-[#10a37f] border border-[#10a37f]/40"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  {d.query}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Switcher & Data Preview */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2">
              <button
                onClick={() => setActiveTab("results")}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                  activeTab === "results" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white"
                }`}
              >
                Execution Results
              </button>
              <button
                onClick={() => setActiveTab("sql")}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                  activeTab === "sql" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white"
                }`}
              >
                SQL Dialect
              </button>
              <button
                onClick={() => setActiveTab("mql")}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                  activeTab === "mql" ? "text-white bg-white/[0.08]" : "text-zinc-400 hover:text-white"
                }`}
              >
                Document MQL
              </button>
            </div>

            {activeTab === "results" && (
              <div className="space-y-1.5 font-mono text-xs">
                <div className="grid grid-cols-4 text-zinc-500 py-1 border-b border-white/[0.04] uppercase text-[10px] tracking-wider">
                  <span>Product / Customer</span>
                  <span>Category</span>
                  <span>Metrics</span>
                  <span>Signal</span>
                </div>
                {currentDemo.rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 py-1.5 text-zinc-300 hover:bg-white/[0.02] rounded">
                    <span className="text-white font-medium truncate pr-2">{row.product}</span>
                    <span className="text-zinc-400">{row.category}</span>
                    <span className="text-[#10a37f]">{row.revenue}</span>
                    <span className="text-zinc-400">{row.rating}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "sql" && (
              <pre className="font-mono text-xs text-[#a5b4fc] p-3 rounded bg-black/40 overflow-x-auto leading-relaxed">
                {currentDemo.sql}
              </pre>
            )}

            {activeTab === "mql" && (
              <pre className="font-mono text-xs text-[#86efac] p-3 rounded bg-black/40 overflow-x-auto leading-relaxed">
                {currentDemo.mql}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* 3 Core Architecture Pillars: Minimal, Clean, Not Boxy */}
      <section id="databases" className="max-w-4xl mx-auto px-4 py-16 border-t border-white/[0.06]">
        <div className="text-left space-y-12">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Connected Databases
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Heterogeneous federated cluster introspecting 125 active seed records
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-semibold text-white">PostgreSQL 16</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Relational transactions (<code className="text-[#10a37f]">customers</code>, <code className="text-[#10a37f]">orders</code>, <code className="text-[#10a37f]">products</code>). 80 rows with foreign key integrity.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#10a37f]" />
                <h3 className="text-sm font-semibold text-white">MongoDB 7.0</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Document NoSQL (<code className="text-[#10a37f]">reviews</code>). 25 customer feedback records, ratings from 1 to 5, and verified purchase flags.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-white">Elasticsearch 8.13</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Full-text search (<code className="text-[#10a37f]">catalog</code>). 20 documents indexed with BM25 keyword matching and inventory attributes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/[0.04]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10a37f]" />
                <h3 className="text-sm font-semibold text-white">Ambiguity Guardian</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Under-specified metrics or time windows trigger targeted clarification prompts before generating any plan.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#10a37f]" />
                <h3 className="text-sm font-semibold text-white">Read-Only AST Armor</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All parsed queries compile strictly into read-only ASTs. Mutations (DROP, DELETE, UPDATE) are physically rejected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Strip (Linear Style Minimal Ribbon) */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-[#10a37f] shrink-0" />
            <span className="text-xs text-zinc-300">
              Demo Access: <strong className="text-white font-mono">admin@example.com</strong> / <strong className="text-white font-mono">Admin123!</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleQuickLogin}
              disabled={authLoading}
              className="text-xs h-7 text-zinc-400 hover:text-white"
            >
              <Zap className="h-3 w-3 text-[#10a37f] mr-1" />
              <span>{authLoading ? "Logging in..." : "1-Click Sign In"}</span>
            </Button>
            <Link href="/chat">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs h-7 px-3 rounded-md"
              >
                <span>Enter Chat</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
            <span>Nexus Query · Heterogeneous Federation Engine</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat Assistant
            </Link>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
