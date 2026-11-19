"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Database,
  Network,
  ShieldCheck,
  Code2,
  GitBranch,
  Layers,
  CheckCircle2,
  HelpCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");

  const promptSuggestions = [
    {
      text: "Show me the top five products by revenue this month.",
      tag: "PostgreSQL & Mongo",
      isAmbiguous: false,
    },
    {
      text: "Show me high-value customers who recently purchased electronics.",
      tag: "Cross-Database",
      isAmbiguous: true,
    },
    {
      text: "Which customers have placed orders but have not paid?",
      tag: "PostgreSQL",
      isAmbiguous: false,
    },
    {
      text: "Compare monthly sales across all connected databases.",
      tag: "Federated Hash Join",
      isAmbiguous: false,
    },
  ];

  const handleLaunchQuery = (queryText: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/chat?q=${encodeURIComponent(queryText)}`;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    handleLaunchQuery(prompt.trim());
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-12 animate-in fade-in-50 duration-300 text-foreground">
      {/* AI-First Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#1e1e1e] border border-border text-zinc-300 shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Natural Language Query Engine</span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400 font-mono text-[11px]">v0.1.0</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Query your databases in plain English.
        </h1>

        <p className="text-sm text-zinc-400 leading-relaxed">
          Ask questions across PostgreSQL, MongoDB, and Elasticsearch. The engine detects ambiguous terms and asks clarifying questions before compiling safe, read-only queries.
        </p>
      </div>

      {/* Modern AI Command / Prompt Box (Perplexity / ChatGPT style) */}
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleFormSubmit}
          className="relative rounded-2xl bg-[#181818] border border-[#303030] shadow-2xl p-3 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
        >
          <div className="flex items-start gap-3 px-2 pt-1">
            <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-1" />
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
              placeholder="Ask anything... e.g. 'Show me the top five products by revenue this month.'"
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#262626] mt-2 px-1">
            {/* Source selector chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedSource("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  selectedSource === "all"
                    ? "bg-[#282828] text-white font-medium border border-[#383838]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Sources (3)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("postgres")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  selectedSource === "postgres"
                    ? "bg-[#282828] text-white font-medium border border-[#383838]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                PostgreSQL
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("mongo")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  selectedSource === "mongo"
                    ? "bg-[#282828] text-white font-medium border border-[#383838]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                MongoDB
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("es")}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  selectedSource === "es"
                    ? "bg-[#282828] text-white font-medium border border-[#383838]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Elasticsearch
              </button>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!prompt.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs px-4 h-8 gap-1.5 font-medium rounded-lg"
            >
              <span>Ask Engine</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-medium">Try asking:</span>
          {promptSuggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLaunchQuery(item.text)}
              className="text-[11px] text-zinc-300 bg-[#181818] hover:bg-[#222222] border border-[#2d2d2d] hover:border-emerald-500/40 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5"
            >
              <span>{item.text}</span>
              {item.isAmbiguous ? (
                <span className="text-[9px] text-amber-400 font-mono">⚡ Ambiguity</span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-mono">✓ Clear</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visual 4-Step Pipeline (Minimalist & Graphic) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            End-to-End Query Execution Pipeline
          </h2>
          <span className="text-[11px] text-emerald-400 font-mono">
            Zero-Hallucination AST Grounding
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400">01</div>
            <div className="text-sm font-semibold text-white">Introspect Schema</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Crawls tables, collections, and search mappings into a unified schema graph.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] space-y-2">
            <div className="text-xs font-mono font-bold text-teal-400">02</div>
            <div className="text-sm font-semibold text-white">Clarify Ambiguity</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Detects under-specified metrics or timeframes and clarifies with interactive choices.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-400">03</div>
            <div className="text-sm font-semibold text-white">Compile & AST Guard</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generates safe SQL, MQL, or ES DSL with strict read-only AST constraint enforcement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400">04</div>
            <div className="text-sm font-semibold text-white">Federate & Trace</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Runs in-memory hash joins across drivers with full timing and provenance traces.
            </p>
          </div>
        </div>
      </div>

      {/* Core Architecture Cards: Connected Databases, Ambiguity Guardian, Schema Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Connected Databases */}
        <Link href="/connections" className="block group">
          <Card className="bg-[#181818] border-[#2c2c2c] group-hover:border-emerald-500/50 transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Connected Databases
              </CardTitle>
              <Database className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-white tracking-tight">3 Active</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusIndicator status="online" label="PostgreSQL" />
                <StatusIndicator status="online" label="MongoDB" />
                <StatusIndicator status="online" label="Elasticsearch" />
              </div>
              <p className="text-xs text-zinc-400 pt-1">
                8 entities fingerprinted · SHA-256 schema verification
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Ambiguity Guardian */}
        <Link href="/chat" className="block group">
          <Card className="bg-[#181818] border-[#2c2c2c] group-hover:border-amber-500/50 transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Ambiguity Guardian
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-white tracking-tight">Protected</div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <CheckCircle2 className="h-3 w-3" />
                <span>Zero Silent Assumptions</span>
              </div>
              <p className="text-xs text-zinc-400 pt-1">
                Zero unclarified silent assumptions before SQL/MQL compilation.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Schema Canvas */}
        <Link href="/schema" className="block group">
          <Card className="bg-[#181818] border-[#2c2c2c] group-hover:border-teal-500/50 transition-all h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Schema Canvas
              </CardTitle>
              <Network className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-white tracking-tight">Infinite Canvas</div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/30">
                <GitBranch className="h-3 w-3" />
                <span>2 Heterogeneous Links</span>
              </div>
              <p className="text-xs text-zinc-400 pt-1">
                Interactive visual graph of tables, collections, indices & relationships.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Interactive Ambiguity Decisioning Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Ambiguity Decisioning Matrix
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compare how the engine handles clear vs. under-specified natural language requests.
            </p>
          </div>
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300 gap-1">
              <span>Open Query Assistant</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Example 1: Direct Execution */}
          <div
            onClick={() => handleLaunchQuery("Show me the top five products by revenue this month.")}
            className="group cursor-pointer p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] hover:border-emerald-500/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Clear Intent</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                Direct Execution
              </Badge>
            </div>
            <div className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
              &quot;Show me the top five products by revenue this month.&quot;
            </div>
            <div className="text-xs text-zinc-400 pt-1 border-t border-[#262626] flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-500">PostgreSQL + MongoDB</span>
              <span className="text-emerald-400 text-xs font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Run Query</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Example 2: Ambiguity Detected */}
          <div
            onClick={() => handleLaunchQuery("Show me high-value customers who recently purchased electronics.")}
            className="group cursor-pointer p-4 rounded-xl bg-[#181818] border border-[#2c2c2c] hover:border-amber-500/50 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Ambiguity Detected</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                Interactive Resolution
              </Badge>
            </div>
            <div className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
              &quot;Show me high-value customers who recently purchased electronics.&quot;
            </div>
            <div className="text-xs text-zinc-400 pt-1 border-t border-[#262626] flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-500">Clarifies: spend threshold &amp; time</span>
              <span className="text-amber-400 text-xs font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Test Clarifier</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
