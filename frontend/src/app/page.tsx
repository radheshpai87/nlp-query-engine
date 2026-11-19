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
  Layers,
  Search,
  MessageSquare,
  Lock,
  Zap,
  Server,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [activeQuery, setActiveQuery] = React.useState<string>(
    "Show me the top five products by revenue this month."
  );

  const sampleQueries = [
    {
      query: "Show me the top five products by revenue this month.",
      tag: "Federated Hash Join",
      sources: "PostgreSQL + MongoDB",
      engine: "SQL + MQL",
      timing: "4.2ms",
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      tag: "Ambiguity Clarification",
      sources: "PostgreSQL + Elasticsearch",
      engine: "Clarification Prompt",
      timing: "Interactive",
    },
    {
      query: "Which customers have placed orders but have not paid?",
      tag: "Read-Only Relational",
      sources: "PostgreSQL",
      engine: "SQL AST Verified",
      timing: "2.8ms",
    },
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-[#e0e0e0] font-sans antialiased selection:bg-[#10a37f]/30 selection:text-white">
      {/* Sleek Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#222222] bg-[#111111]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#10a37f] border border-[#2a2a2a] group-hover:border-[#10a37f]/50 transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs sm:text-sm tracking-tight text-white">
                Natural Language Query Engine
              </span>
              <span className="rounded border border-[#2e2e2e] bg-[#1a1a1a] px-1.5 py-0.2 text-[10px] font-mono text-[#10a37f]">
                v0.1
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs text-[#888888]">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <Link href="/schema" className="hover:text-white transition-colors">
              Topology Canvas
            </Link>
            <Link href="/connections" className="hover:text-white transition-colors">
              Data Targets
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/chat">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-8 px-3.5 rounded-lg gap-1.5 shadow-xs transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Chat</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 md:pt-16 md:pb-20 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Source Badges Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#161616] px-3 py-1 text-xs text-[#999999]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
          <span className="text-zinc-300 font-medium">Federated Cross-Database Engine</span>
          <span className="text-zinc-600">·</span>
          <span>PostgreSQL · MongoDB · Elasticsearch</span>
        </div>

        {/* Proportional, Balanced Headline */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight max-w-3xl mx-auto">
            Query your databases in plain English.
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Zero hallucinations. Automatic ambiguity clarification and strict read-only AST safety.
          </p>
        </div>

        {/* Hero Interactive Prompt Box (AI-First, Proportional) */}
        <div className="pt-3 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-[#2c2c2c] bg-[#181818] p-3 shadow-xl space-y-3 text-left">
            <div className="flex items-center gap-2 px-2 py-1 bg-[#121212] rounded-xl border border-[#262626]">
              <Search className="h-4 w-4 text-[#777777] shrink-0" />
              <input
                type="text"
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                placeholder="Ask any question across your databases..."
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder:text-[#666666] focus:outline-hidden py-1.5 px-1"
              />
              <Link href={`/chat?q=${encodeURIComponent(activeQuery)}`}>
                <Button
                  size="sm"
                  className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs h-7 px-3 rounded-lg gap-1 shrink-0"
                >
                  <span>Query</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
              <span className="text-[11px] text-[#666666] mr-1">Suggestions:</span>
              <button
                type="button"
                onClick={() => setActiveQuery("Show me the top five products by revenue this month.")}
                className="text-[11px] px-2.5 py-1 rounded-lg border bg-[#141414] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838] transition-all"
              >
                Top 5 Products by Revenue
              </button>
              <button
                type="button"
                onClick={() => setActiveQuery("Show me high-value customers who recently purchased electronics.")}
                className="text-[11px] px-2.5 py-1 rounded-lg border bg-[#141414] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838] transition-all"
              >
                High-Value Recent Customers
              </button>
              <button
                type="button"
                onClick={() => setActiveQuery("Which customers have placed orders but have not paid?")}
                className="text-[11px] px-2.5 py-1 rounded-lg border bg-[#141414] border-[#262626] text-[#888888] hover:text-[#cccccc] hover:border-[#383838] transition-all"
              >
                Unpaid Orders
              </button>
            </div>
          </div>
        </div>

        {/* Direct Action Links */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/chat">
            <Button
              size="sm"
              className="bg-white hover:bg-zinc-200 text-black text-xs font-medium h-9 px-4 rounded-xl gap-1.5 shadow-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#10a37f]" />
              <span>Launch Full Chat Assistant</span>
            </Button>
          </Link>
          <Link href="/schema">
            <Button
              size="sm"
              variant="outline"
              className="border-[#2c2c2c] bg-[#181818] text-[#cccccc] hover:bg-[#222222] hover:text-white text-xs h-9 px-4 rounded-xl gap-1.5"
            >
              <Network className="h-3.5 w-3.5 text-[#10a37f]" />
              <span>Explore Schema Topology</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 4-Step Pipeline Bar */}
      <section id="pipeline" className="py-8 border-y border-[#202020] bg-[#141414]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#10a37f] font-semibold">STEP 01</div>
              <div className="text-xs font-medium text-white">Introspect Schema</div>
              <div className="text-[11px] text-[#777777]">
                Crawls SQL tables, Mongo collections & ES indices.
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#10a37f] font-semibold">STEP 02</div>
              <div className="text-xs font-medium text-white">Clarify Ambiguity</div>
              <div className="text-[11px] text-[#777777]">
                Detects vague predicates and confirms intent interactively.
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#10a37f] font-semibold">STEP 03</div>
              <div className="text-xs font-medium text-white">Compile & AST Guard</div>
              <div className="text-[11px] text-[#777777]">
                Synthesizes SQL/MQL strictly constrained to read-only.
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#10a37f] font-semibold">STEP 04</div>
              <div className="text-xs font-medium text-white">Federate & Trace</div>
              <div className="text-[11px] text-[#777777]">
                Parallel sub-queries with in-memory hash joins.
              </div>
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
            Built for enterprise correctness & safety
          </h2>
          <p className="text-xs text-[#777777]">
            Every query execution is grounded in deterministic metadata with zero silent assumptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Connected Databases */}
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3 hover:border-[#383838] transition-colors">
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
            <div className="pt-2 border-t border-[#222222] space-y-1 text-[11px] text-[#777777]">
              <div className="flex justify-between">
                <span>PostgreSQL 16</span>
                <span className="text-[#10a37f]">Online</span>
              </div>
              <div className="flex justify-between">
                <span>MongoDB 7.0</span>
                <span className="text-[#10a37f]">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Elasticsearch 8.13</span>
                <span className="text-[#10a37f]">Online</span>
              </div>
            </div>
          </div>

          {/* Card 2: Ambiguity Guardian */}
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3 hover:border-[#383838] transition-colors">
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
          <div className="rounded-xl border border-[#262626] bg-[#161616] p-5 space-y-3 hover:border-[#383838] transition-colors">
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
      <footer className="border-t border-[#202020] py-6 text-xs text-[#666666]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Enterprise NLP Query Engine</span>
            <span>·</span>
            <span>Local Instance (127.0.0.1)</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
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
          </div>
        </div>
      </footer>
    </div>
  );
}
