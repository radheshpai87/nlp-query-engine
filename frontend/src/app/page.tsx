"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Database,
  ShieldCheck,
  Network,
  ArrowRight,
  Code2,
  CheckCircle2,
  Layers,
  Search,
  MessageSquare,
  Lock,
  Zap,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const sampleQueries = [
    {
      query: "Show me the top five products by revenue this month.",
      type: "Multi-Source Federated",
      badge: "Direct Execution",
      badgeColor: "text-[#10a37f] border-[#10a37f]/30 bg-[#10a37f]/10",
      description: "Joins PostgreSQL orders with MongoDB product reviews in memory.",
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      type: "Ambiguity-Aware",
      badge: "Ambiguity Clarification",
      badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      description: "Detects vague threshold & timeframe, prompting for interactive confirmation.",
    },
    {
      query: "Which customers have placed orders but have not paid?",
      type: "PostgreSQL Relational",
      badge: "Direct SQL Execution",
      badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      description: "Filters unpaid orders with strict read-only AST compilation.",
    },
    {
      query: "Compare monthly sales across all connected databases.",
      type: "Federated Hash Join",
      badge: "Full Federation Plan",
      badgeColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      description: "Aggregates PostgreSQL revenue against Elasticsearch catalog categories.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#171717] text-[#ececec] selection:bg-[#10a37f]/30 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#171717]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#212121] text-[#10a37f] border border-[#303030] shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
                Natural Language Query Engine
              </span>
              <span className="rounded-md border border-[#383838] bg-[#212121] px-1.5 py-0.5 text-[10px] font-mono text-[#10a37f]">
                v0.1.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#a3a3a3]">
            <a href="#problem" className="hover:text-white transition-colors">
              The Problem
            </a>
            <a href="#solution" className="hover:text-white transition-colors">
              The Solution
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <Link href="/schema" className="hover:text-white transition-colors">
              Visual Topology
            </Link>
            <Link href="/connections" className="hover:text-white transition-colors">
              Data Targets
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/chat">
              <Button
                size="sm"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white text-xs font-medium h-9 px-4 rounded-xl gap-2 shadow-sm transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Launch Chat</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-[#262626]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#10a37f]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#303030] bg-[#212121] px-3.5 py-1 text-xs text-[#b4b4b4]">
            <span className="flex h-2 w-2 rounded-full bg-[#10a37f] animate-pulse" />
            <span className="font-medium text-white">Heterogeneous Database Federation</span>
            <span className="text-[#666]">·</span>
            <span className="text-[#a3a3a3]">PostgreSQL + MongoDB + Elasticsearch</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Query your databases in <span className="text-[#10a37f]">plain English</span>.
            <br className="hidden sm:inline" />
            Zero hallucinations. Zero blind assumptions.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#8e8e8e] max-w-2xl mx-auto leading-relaxed">
            Connect heterogeneous databases into a single unified semantic graph. Ask business questions with automatic ambiguity clarification, guaranteed read-only AST compilation, and distributed in-memory joins.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link href="/chat">
              <Button
                size="lg"
                className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white font-medium text-sm h-11 px-6 rounded-xl gap-2 shadow-md hover:shadow-emerald-950/40 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Open Chat Assistant</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/schema">
              <Button
                size="lg"
                variant="outline"
                className="border-[#383838] bg-[#212121] text-[#ececec] hover:bg-[#2a2a2a] hover:text-white hover:border-[#4f4f4f] font-medium text-sm h-11 px-6 rounded-xl gap-2 transition-all"
              >
                <Network className="h-4 w-4 text-[#10a37f]" />
                <span>Explore Schema Graph</span>
              </Button>
            </Link>

            <Link href="/connections">
              <Button
                size="lg"
                variant="ghost"
                className="text-[#a3a3a3] hover:text-white hover:bg-[#212121] text-sm h-11 px-4 rounded-xl gap-2 transition-all"
              >
                <Database className="h-4 w-4" />
                <span>Data Targets</span>
              </Button>
            </Link>
          </div>

          {/* ChatGPT Interface Mockup Card */}
          <div className="pt-10 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-[#303030] bg-[#1e1e1e] shadow-2xl p-4 sm:p-6 text-left space-y-4">
              {/* Fake Window Header */}
              <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-3 text-xs text-[#8e8e8e]">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#3a3a3a]" />
                  <div className="h-3 w-3 rounded-full bg-[#3a3a3a]" />
                  <div className="h-3 w-3 rounded-full bg-[#3a3a3a]" />
                  <span className="ml-2 font-mono text-[11px] text-[#737373]">chat.nlp-query-engine.internal</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#10a37f]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>3 Engines Connected</span>
                </div>
              </div>

              {/* Chat Thread Preview */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-end">
                  <div className="bg-[#2f2f2f] text-[#ececec] text-xs sm:text-sm px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                    Show me total Q3 revenue by category across all stores.
                  </div>
                </div>

                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-full bg-[#10a37f] text-white flex items-center justify-center shrink-0 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-[#242424] border border-[#333333] rounded-2xl rounded-tl-sm p-3.5 space-y-2.5 max-w-[90%] text-xs text-[#d1d5db]">
                    <div className="flex items-center gap-2 text-[11px] text-[#10a37f]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>AST Read-Only Verified · Federated Plan (PostgreSQL + MongoDB) · Execution: 4.8ms</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2d2d2d] font-mono text-[11px]">
                      <div>
                        <span className="text-[#737373] block text-[9px]">PRODUCT</span>
                        <span className="text-white font-medium">Alpha Watch Pro</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[9px]">UNITS SOLD</span>
                        <span className="text-white font-medium">1,420</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[9px]">TOTAL REVENUE</span>
                        <span className="text-[#10a37f] font-semibold">$355,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section id="problem" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 border-b border-[#262626]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#10a37f]">
            The Problem Statement
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Why Traditional AI & Text-to-SQL Tools Fail in Enterprise
          </h2>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            Off-the-shelf LLMs and naive query generators break down when exposed to real enterprise data architectures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#2b2b2b] bg-[#1e1e1e] p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-red-950/40 border border-red-800/30 text-red-400 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Heterogeneous Data Silos</h3>
            <p className="text-xs text-[#8e8e8e] leading-relaxed">
              Real data is rarely in one SQL engine. Relational orders sit in PostgreSQL, reviews in MongoDB, and product catalogs in Elasticsearch. Legacy tools cannot bridge cross-engine joins without manual ETL.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2b2b2b] bg-[#1e1e1e] p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-950/40 border border-amber-800/30 text-amber-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Silent Assumptions & Hallucinations</h3>
            <p className="text-xs text-[#8e8e8e] leading-relaxed">
              When given vague prompts like &ldquo;recent high-value customers&rdquo;, ordinary LLMs invent columns and assume arbitrary thresholds silently without asking, yielding incorrect and dangerous business decisions.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2b2b2b] bg-[#1e1e1e] p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-950/40 border border-purple-800/30 text-purple-400 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Destructive Execution Risk</h3>
            <p className="text-xs text-[#8e8e8e] leading-relaxed">
              Unchecked text-to-SQL agents execute arbitrary commands directly against production databases, risking unauthorized DDL/DML mutations like DROP TABLE, UPDATE, or permission escalation.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution & Architecture Section */}
      <section id="solution" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 border-b border-[#262626]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#10a37f]">
            The Solution
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            End-to-End Ambiguity-Aware Query Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            A four-tier architecture engineered for deterministic precision, federated joins, and guaranteed read-only safety.
          </p>
        </div>

        {/* 3 Core Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Connected Databases */}
          <div className="rounded-2xl border border-[#303030] bg-[#1e1e1e] p-6 space-y-4 hover:border-[#424242] transition-colors">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#212121] border border-[#303030] text-[#10a37f] flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono text-[#10a37f] bg-[#10a37f]/10 border border-[#10a37f]/30 px-2 py-0.5 rounded-md">
                3 Active Targets
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Connected Databases</h3>
              <p className="text-xs text-[#8e8e8e] mt-1 leading-relaxed">
                Autonomous schema crawling across PostgreSQL, MongoDB, and Elasticsearch. Builds a unified semantic graph with foreign keys and heterogeneous cross-database links.
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#2d2d2d] text-xs">
              <div className="flex items-center justify-between text-[#b4b4b4]">
                <span>PostgreSQL 16 (E-Commerce)</span>
                <span className="text-[#10a37f] font-mono text-[10px]">Online</span>
              </div>
              <div className="flex items-center justify-between text-[#b4b4b4]">
                <span>MongoDB 7.0 (Reviews & Events)</span>
                <span className="text-[#10a37f] font-mono text-[10px]">Online</span>
              </div>
              <div className="flex items-center justify-between text-[#b4b4b4]">
                <span>Elasticsearch 8.13 (Product Catalog)</span>
                <span className="text-[#10a37f] font-mono text-[10px]">Online</span>
              </div>
            </div>
          </div>

          {/* Ambiguity Guardian */}
          <div className="rounded-2xl border border-[#303030] bg-[#1e1e1e] p-6 space-y-4 hover:border-[#424242] transition-colors">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#212121] border border-[#303030] text-amber-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                Zero Assumptions
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ambiguity Guardian</h3>
              <p className="text-xs text-[#8e8e8e] mt-1 leading-relaxed">
                Intelligently detects missing time windows, vague metric predicates, and ambiguous entities. Prompts the user with interactive chips before generating a single query line.
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#2d2d2d] text-xs text-[#b4b4b4]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>Interactive parameter clarification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>Confidence score gating (&gt;85% threshold)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>Zero unverified execution guesses</span>
              </div>
            </div>
          </div>

          {/* Schema Canvas */}
          <div className="rounded-2xl border border-[#303030] bg-[#1e1e1e] p-6 space-y-4 hover:border-[#424242] transition-colors">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#212121] border border-[#303030] text-emerald-400 flex items-center justify-center">
                <Network className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                Interactive Graph
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Schema Canvas</h3>
              <p className="text-xs text-[#8e8e8e] mt-1 leading-relaxed">
                Interactive infinite canvas visualizing database topologies, table nodes, column schemas, and cross-database joins with auto-layout, zoom, and pan.
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[#2d2d2d] text-xs text-[#b4b4b4]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>SQL Foreign Key solid links</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>Cross-database dashed semantic relations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10a37f]" />
                <span>Interactive node context injection</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step Pipeline Flow */}
        <div id="architecture" className="rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2d2d2d] pb-4">
            <div>
              <h4 className="text-base font-semibold text-white">
                Federated Execution Lifecycle
              </h4>
              <p className="text-xs text-[#8e8e8e]">
                Every user query passes through this deterministic, verifiable pipeline:
              </p>
            </div>
            <span className="text-xs font-mono text-[#10a37f] bg-[#10a37f]/10 border border-[#10a37f]/30 px-2.5 py-1 rounded-lg w-fit">
              Zero-Hallucination AST Grounding
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[#2d2d2d] bg-[#212121] space-y-2">
              <span className="text-xs font-mono font-bold text-[#10a37f]">01</span>
              <h5 className="text-sm font-semibold text-white">Introspect Schema</h5>
              <p className="text-xs text-[#8e8e8e] leading-relaxed">
                Crawls tables, collections, and search indices into a unified in-memory catalog.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#2d2d2d] bg-[#212121] space-y-2">
              <span className="text-xs font-mono font-bold text-[#10a37f]">02</span>
              <h5 className="text-sm font-semibold text-white">Clarify Ambiguity</h5>
              <p className="text-xs text-[#8e8e8e] leading-relaxed">
                Detects under-specified parameters and clarifies them interactively before execution.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#2d2d2d] bg-[#212121] space-y-2">
              <span className="text-xs font-mono font-bold text-[#10a37f]">03</span>
              <h5 className="text-sm font-semibold text-white">Compile & AST Guard</h5>
              <p className="text-xs text-[#8e8e8e] leading-relaxed">
                Generates native SQL, MQL, or ES DSL with strict read-only AST constraint validation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#2d2d2d] bg-[#212121] space-y-2">
              <span className="text-xs font-mono font-bold text-[#10a37f]">04</span>
              <h5 className="text-sm font-semibold text-white">Federate & Trace</h5>
              <p className="text-xs text-[#8e8e8e] leading-relaxed">
                Runs parallel sub-queries, executes in-memory hash joins, and records full audit provenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Capabilities & Queries Section */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 border-b border-[#262626]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#10a37f]">
            Interactive Queries
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Tested & Proven Query Scenarios
          </h2>
          <p className="text-xs sm:text-sm text-[#8e8e8e]">
            Click any sample query to launch the chat assistant and execute it in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleQueries.map((item, index) => (
            <Link
              key={index}
              href={`/chat?q=${encodeURIComponent(item.query)}`}
              className="p-5 rounded-2xl border border-[#2b2b2b] bg-[#1e1e1e] hover:bg-[#242424] hover:border-[#424242] transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8e8e8e]">{item.type}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white group-hover:text-[#10a37f] transition-colors leading-snug">
                  {item.query}
                </h4>
                <p className="text-xs text-[#8e8e8e]">{item.description}</p>
              </div>

              <div className="flex items-center gap-1 text-xs text-[#10a37f] font-medium pt-2 border-t border-[#2b2b2b]">
                <span>Run in Chat Assistant</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
          Engineered With Modern Enterprise Technologies
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono text-[#a3a3a3]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2b2b2b] bg-[#1e1e1e]">
            <Server className="h-4 w-4 text-[#10a37f]" />
            <span>FastAPI (Python 3.11)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2b2b2b] bg-[#1e1e1e]">
            <Code2 className="h-4 w-4 text-[#10a37f]" />
            <span>Next.js 16 (App Router)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2b2b2b] bg-[#1e1e1e]">
            <Database className="h-4 w-4 text-blue-400" />
            <span>PostgreSQL 16</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2b2b2b] bg-[#1e1e1e]">
            <Database className="h-4 w-4 text-emerald-400" />
            <span>MongoDB 7.0</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2b2b2b] bg-[#1e1e1e]">
            <Search className="h-4 w-4 text-amber-400" />
            <span>Elasticsearch 8.13</span>
          </div>
        </div>

        {/* Big Bottom CTA */}
        <div className="pt-8">
          <div className="rounded-3xl border border-[#303030] bg-[#1e1e1e] p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-5">
            <div className="h-12 w-12 rounded-2xl bg-[#262626] border border-[#383838] text-[#10a37f] flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to query your data without writing SQL?
            </h3>
            <p className="text-xs sm:text-sm text-[#8e8e8e] max-w-lg mx-auto">
              Ask natural language questions across PostgreSQL, MongoDB, and Elasticsearch with zero manual joins and total read-only safety.
            </p>
            <div className="pt-2">
              <Link href="/chat">
                <Button
                  size="lg"
                  className="bg-[#10a37f] hover:bg-[#0d8a6c] text-white font-medium text-sm h-11 px-8 rounded-xl gap-2 shadow-lg"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Launch Chat Assistant</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-[#262626] py-8 text-center text-xs text-[#737373]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#a3a3a3]">Enterprise NLP Query Engine</span>
            <span>·</span>
            <span>Local Instance (127.0.0.1)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <Link href="/schema" className="hover:text-white transition-colors">
              Topology
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
