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
  Zap,
  Code2,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  BarChart3,
  Users,
  Briefcase,
  TrendingUp,
  ChevronDown,
  ExternalLink,
  Search,
  Check,
  Sliders,
  Menu,
  X,
  Shield,
  Activity,
  Workflow,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();

  const [activeQueryIndex, setActiveQueryIndex] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<"results" | "sql" | "mql" | "provenance">("results");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  const demos = [
    {
      query: "Show me the top five products by revenue this month.",
      badge: "PostgreSQL 16 · In-Memory Join",
      latency: "4.2ms",
      status: "Execution Verified",
      dialects: ["SQL", "JSON Execution Plan"],
      rows: [
        { product: "Pro Noise-Cancelling Buds", category: "Audio", revenue: "$14,250.00", rating: "4.9 ★ (128 reviews)" },
        { product: 'Ultra-Wide 34" Curved Monitor', category: "Display", revenue: "$11,890.00", rating: "4.7 ★ (89 reviews)" },
        { product: "Mechanical Wireless Deck", category: "Peripherals", revenue: "$8,420.00", rating: "4.8 ★ (204 reviews)" },
        { product: "Ergonomic Desk Riser", category: "Office", revenue: "$6,150.00", rating: "4.6 ★ (62 reviews)" },
        { product: "Thunderbolt 4 Hub Pro", category: "Accessories", revenue: "$5,890.00", rating: "4.8 ★ (95 reviews)" },
      ],
      sql: `SELECT 
  p.name, 
  p.category, 
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_date >= '2025-01-01'
GROUP BY p.name, p.category
ORDER BY revenue DESC 
LIMIT 5;`,
      mql: `db.reviews.aggregate([
  { "$match": { "rating": { "$gte": 4.5 } } },
  { "$group": { "_id": "$product_id", "avg_rating": { "$avg": "$rating" }, "count": { "$sum": 1 } } },
  { "$sort": { "avg_rating": -1 } }
]);`,
      provenance: {
        sources: ["PostgreSQL (ecommerce_demo)", "MongoDB (reviews)"],
        tablesUsed: ["orders", "order_items", "products", "reviews"],
        strategy: "Hash Join on product_id with time-window filter",
        readOnlyStatus: "Verified 100% Read-Only AST",
      },
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      badge: "Ambiguity Clarification · 4-Table Path",
      latency: "Interactive",
      status: "Clarification Prompt",
      dialects: ["SQL", "Elasticsearch DSL"],
      rows: [
        { product: "Alice Smith (US)", category: "Orders: 8", revenue: "$4,250.00 LTV", rating: "Resolved: > $1,000 threshold" },
        { product: "Bob Jones (CA)", category: "Orders: 5", revenue: "$3,100.00 LTV", rating: "Resolved: > $1,000 threshold" },
        { product: "Diana Prince (US)", category: "Orders: 6", revenue: "$2,890.00 LTV", rating: "Resolved: > $1,000 threshold" },
        { product: "Evan Wright (DE)", category: "Orders: 4", revenue: "$2,450.00 LTV", rating: "Resolved: > $1,000 threshold" },
      ],
      sql: `SELECT 
  c.id,
  c.name, 
  c.country, 
  SUM(o.total_amount) AS ltv
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE p.category = 'Electronics'
  AND o.order_date >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name, c.country 
HAVING SUM(o.total_amount) >= 1000
ORDER BY ltv DESC;`,
      mql: `GET catalog/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "category.keyword": "Electronics" } },
        { "range": { "price": { "gte": 250 } } }
      ]
    }
  }
}`,
      provenance: {
        sources: ["PostgreSQL (customers, orders, order_items, products)"],
        tablesUsed: ["customers", "orders", "order_items", "products"],
        strategy: "Clarified: High-Value defined as Total Spend >= $1,000",
        readOnlyStatus: "Verified 100% Read-Only AST",
      },
    },
    {
      query: "Which buyers purchased goods cheaper than 30?",
      badge: "BFS Multi-Hop Path · Under $30",
      latency: "6.8ms",
      status: "Pathfinding Verified",
      dialects: ["SQL", "Cross-Source Plan"],
      rows: [
        { product: "Alice Smith", category: "TECH-AUD-003", revenue: "$19.99", rating: "Unit Price: $19.99 (< $30.00)" },
        { product: "Evan Wright", category: "HOME-MUG-001", revenue: "$14.50", rating: "Unit Price: $14.50 (< $30.00)" },
        { product: "Fiona Gallagher", category: "ACC-CAB-002", revenue: "$18.25", rating: "Unit Price: $18.25 (< $30.00)" },
        { product: "Hannah Abbott", category: "ACC-PAD-005", revenue: "$24.99", rating: "Unit Price: $24.99 (< $30.00)" },
      ],
      sql: `SELECT 
  c.name, 
  p.name AS item_name,
  oi.unit_price,
  oi.quantity,
  o.order_date
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE oi.unit_price < 30.00
ORDER BY oi.unit_price ASC 
LIMIT 20;`,
      mql: `// Multi-Hop Path Discovered via BFS:
// customers.id -> orders.customer_id
// orders.id -> order_items.order_id
// order_items.product_id -> products.id`,
      provenance: {
        sources: ["PostgreSQL (ecommerce_demo)"],
        tablesUsed: ["customers", "orders", "order_items", "products"],
        strategy: "Automated 3-Hop Relational Traversal",
        readOnlyStatus: "Verified 100% Read-Only AST",
      },
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
    <div className="min-h-screen bg-[#080A0D] text-[#F5F7FA] flex flex-col antialiased selection:bg-[#00D6A0]/30 font-sans relative overflow-x-hidden">
      {/* Ambient background lighting */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[1000px] h-[650px] bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,rgba(0,214,160,0.14),rgba(0,166,255,0.06),rgba(8,10,13,0))] blur-3xl opacity-80" />
        <div className="absolute top-[800px] -left-[200px] w-[600px] h-[600px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(0,166,255,0.08),rgba(8,10,13,0))] blur-3xl opacity-60" />
        <div className="absolute top-[1800px] -right-[200px] w-[700px] h-[700px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(0,214,160,0.08),rgba(8,10,13,0))] blur-3xl opacity-60" />
      </div>

      {/* 1. Sticky Navigation Bar */}
      <nav className="border-b border-white/[0.08] bg-[#080A0D]/85 backdrop-blur-xl sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-[#00D6A0]/10 border border-[#00D6A0]/25 flex items-center justify-center text-[#00D6A0] group-hover:scale-105 group-hover:border-[#00D6A0]/50 transition-all shadow-[0_0_12px_rgba(0,214,160,0.2)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white group-hover:text-white transition-colors">
                  Nexus Query
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/25 font-medium">
                  Enterprise
                </span>
              </div>
              <span className="text-[10px] text-[#929BA8] tracking-normal">
                Natural Language Query Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-medium text-[#929BA8]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#integrations" className="hover:text-white transition-colors">
              Databases
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#use-cases" className="hover:text-white transition-colors">
              Use Cases
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security & Audit
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <Link href="/chat">
                <Button className="bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#080A0D] text-xs font-semibold px-4 h-9 rounded-lg shadow-lg shadow-[#00D6A0]/20 transition-all flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Enter Console</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-xs text-[#929BA8] hover:text-white hover:bg-white/[0.04] h-9 px-3">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#080A0D] text-xs font-semibold px-4 h-9 rounded-lg shadow-lg shadow-[#00D6A0]/20 transition-all flex items-center gap-1.5">
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#929BA8] hover:text-white hover:bg-white/[0.05]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-white/[0.08] bg-[#0D1117] px-4 pt-3 pb-5 space-y-3">
            <div className="flex flex-col space-y-2 text-sm text-[#929BA8]">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                Features
              </a>
              <a 
                href="#integrations" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                Databases
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                How It Works
              </a>
              <a 
                href="#use-cases" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                Use Cases
              </a>
              <a 
                href="#security" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                Security & Audit
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white"
              >
                FAQ
              </a>
            </div>
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-3">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full text-xs border-white/[0.1] text-white bg-transparent h-9">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button className="w-full text-xs bg-[#00D6A0] text-[#080A0D] font-semibold h-9">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#11161D] border border-white/[0.08] text-[11px] font-mono tracking-wider text-[#929BA8] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
            <span>INTELLIGENT QUERYING · MULTI-DATABASE · ENTERPRISE SECURITY</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            Your Entire Data Infrastructure. <br />
            <span className="text-[#00D6A0] bg-clip-text">
              One Conversation.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#929BA8] leading-relaxed font-normal">
            Connect PostgreSQL, MongoDB, Elasticsearch and more. Ask questions in plain English and receive intelligent, explainable answers backed by real database queries.
          </p>

          {/* Prominent CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link href="/chat">
              <Button className="w-full sm:w-auto h-11 px-7 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#080A0D] text-xs font-semibold rounded-lg shadow-xl shadow-[#00D6A0]/20 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
                <span>Explore the Platform</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-7 border-white/[0.1] bg-[#11161D] hover:bg-[#171D25] text-white text-xs font-medium rounded-lg transition-colors"
              >
                <span>See How It Works</span>
              </Button>
            </a>
          </div>

          {/* Micro trust indicators */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#929BA8]">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#00D6A0]" />
              <span>Zero Silent Guessing</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#00A6FF]" />
              <span>Strict Read-Only Guardrails</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00D6A0]" />
              <span>SHA-256 Chained Audit</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Demonstration Window */}
      <section className="relative py-12 md:py-16 z-10 border-t border-b border-white/[0.08] bg-[#0D1117]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center mb-8 max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#00D6A0]/10 border border-[#00D6A0]/20 text-[#00D6A0] text-[11px] font-mono">
              <Terminal className="h-3.5 w-3.5" />
              <span>Interactive Architecture Preview</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Test Real Engine Translations
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8]">
              Select sample natural language inquiries to inspect plan synthesis, native dialect compilation, and verifiable data provenance.
            </p>
          </div>

          {/* Query Selector Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {demos.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveQueryIndex(idx);
                  setActiveTab("results");
                }}
                className={`text-left p-4 rounded-xl border text-xs transition-all ${
                  activeQueryIndex === idx
                    ? "bg-[#171D25] border-[#00D6A0]/50 text-white shadow-lg shadow-[#00D6A0]/5 ring-1 ring-[#00D6A0]/30"
                    : "bg-[#11161D] border-white/[0.06] text-[#929BA8] hover:border-white/[0.15] hover:text-[#F5F7FA]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
                    {d.badge}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#929BA8]">
                    {d.latency}
                  </span>
                </div>
                <p className="font-medium text-[13px] leading-snug line-clamp-2 text-white">
                  {d.query}
                </p>
              </button>
            ))}
          </div>

          {/* IDE-Style Application Window */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#11161D] overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Window Title Bar */}
            <div className="h-11 bg-[#080A0D] border-b border-white/[0.08] px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#FF5F56]/80" />
                  <div className="h-3 w-3 rounded-full bg-[#FFBD2E]/80" />
                  <div className="h-3 w-3 rounded-full bg-[#27C93F]/80" />
                </div>
                <span className="text-xs font-mono text-[#929BA8] border-l border-white/[0.08] pl-3 hidden sm:inline">
                  nexus-engine :: <span className="text-[#00D6A0]">{currentDemo.status}</span>
                </span>
              </div>

              {/* Dialect Tabs Switcher */}
              <div className="flex items-center gap-1 bg-[#171D25] p-0.5 rounded-lg border border-white/[0.06]">
                {(
                  [
                    { id: "results", label: "Results Table" },
                    { id: "sql", label: "Compiled SQL" },
                    { id: "mql", label: "MQL / DSL" },
                    { id: "provenance", label: "Provenance" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all ${
                      activeTab === tab.id
                        ? "bg-[#080A0D] text-[#00D6A0] font-semibold shadow-xs border border-white/[0.08]"
                        : "text-[#929BA8] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Interface: Left Database Sidebar + Right Work Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              {/* Left Sidebar: Connected Topology */}
              <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0D1117] p-4 text-xs space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#929BA8] font-semibold mb-2 flex items-center justify-between">
                    <span>Active Clusters</span>
                    <span className="h-2 w-2 rounded-full bg-[#00D6A0]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2.5 rounded-lg bg-[#11161D] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-[#00A6FF]" />
                        <span className="text-white font-medium text-[11px]">PostgreSQL 16</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#00D6A0]">online</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#11161D] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-[#00D6A0]" />
                        <span className="text-white font-medium text-[11px]">MongoDB 7.0</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#00D6A0]">online</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#11161D] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-white font-medium text-[11px]">Elasticsearch 8.13</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#00D6A0]">online</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#929BA8] font-semibold mb-2">
                    Engine State
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-[#929BA8]">
                    <div className="flex justify-between">
                      <span>Execution:</span>
                      <span className="text-[#00D6A0]">Read-Only</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audit Chaining:</span>
                      <span className="text-white">SHA-256</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ambiguity Pass:</span>
                      <span className="text-[#00D6A0]">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content Work Area */}
              <div className="lg:col-span-9 p-5 flex flex-col justify-between">
                {/* Natural Language Query Bar */}
                <div className="mb-4 pb-3 border-b border-white/[0.08] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <div className="h-6 w-6 rounded-md bg-[#00D6A0]/10 flex items-center justify-center text-[#00D6A0] shrink-0">
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium text-sm text-white">&gt; {currentDemo.query}</span>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/20">
                    Validated Plan
                  </span>
                </div>

                {/* View: Results Table */}
                {activeTab === "results" && (
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[#929BA8] font-medium font-sans">
                          <th className="pb-2.5">Entity / Record</th>
                          <th className="pb-2.5">Category / Path</th>
                          <th className="pb-2.5">Computed Metric</th>
                          <th className="pb-2.5">Provenance Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {currentDemo.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 text-white font-medium">{r.product}</td>
                            <td className="py-2.5 text-[#929BA8] font-mono text-[11px]">{r.category}</td>
                            <td className="py-2.5 text-[#00D6A0] font-semibold font-mono">{r.revenue}</td>
                            <td className="py-2.5 text-[11px] text-[#929BA8]">{r.rating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* View: Compiled SQL */}
                {activeTab === "sql" && (
                  <div className="flex-1 flex flex-col justify-start">
                    <pre className="p-4 rounded-xl bg-[#080A0D] border border-white/[0.06] text-[#00D6A0] font-mono text-xs leading-relaxed overflow-x-auto select-all">
                      {currentDemo.sql}
                    </pre>
                  </div>
                )}

                {/* View: Compiled MQL / DSL */}
                {activeTab === "mql" && (
                  <div className="flex-1 flex flex-col justify-start">
                    <pre className="p-4 rounded-xl bg-[#080A0D] border border-white/[0.06] text-[#00A6FF] font-mono text-xs leading-relaxed overflow-x-auto select-all">
                      {currentDemo.mql}
                    </pre>
                  </div>
                )}

                {/* View: Provenance Inspector */}
                {activeTab === "provenance" && (
                  <div className="flex-1 p-4 rounded-xl bg-[#080A0D] border border-white/[0.06] space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-2 text-[#00D6A0] font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Tamper-Evident Cryptographic Ledger Entry</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                      <div className="p-3 rounded-lg bg-[#11161D] border border-white/[0.06] space-y-1">
                        <span className="text-[#929BA8]">Participating Databases</span>
                        <div className="text-white font-medium">
                          {currentDemo.provenance.sources.join(", ")}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#11161D] border border-white/[0.06] space-y-1">
                        <span className="text-[#929BA8]">Entity Lineage</span>
                        <div className="text-white font-medium">
                          {currentDemo.provenance.tablesUsed.join(" ➔ ")}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#11161D] border border-white/[0.06] space-y-1 sm:col-span-2">
                        <span className="text-[#929BA8]">Join Strategy & Security</span>
                        <div className="text-white font-medium">
                          {currentDemo.provenance.strategy} · {currentDemo.provenance.readOnlyStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Status Bar in IDE */}
                <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#929BA8]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[#00D6A0]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00D6A0]" />
                      AST Safety Verified
                    </span>
                    <span>·</span>
                    <span>Single Logical IR Plan</span>
                  </div>
                  <div className="text-[#929BA8]">
                    Dialects: {currentDemo.dialects.join(" + ")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Connected Databases Integration Showcase */}
      <section id="integrations" className="relative py-20 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
              Heterogeneous Federation
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Connected Databases
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed">
              Query relational schemas, document stores, and inverted search indices simultaneously without configuring manual ETL pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PostgreSQL Card */}
            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-4 hover:border-[#00A6FF]/40 transition-all group">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-[#00A6FF]/10 border border-[#00A6FF]/20 flex items-center justify-center text-[#00A6FF] group-hover:scale-105 transition-transform">
                  <Database className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00A6FF]/10 text-[#00A6FF] border border-[#00A6FF]/20">
                  SQL Engine
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white">PostgreSQL 16</h3>
                <p className="text-xs text-[#929BA8] mt-1.5 leading-relaxed">
                  Relational transactional core for customers, orders, order items, and products with multi-hop foreign-key joins.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#00A6FF]">
                <span className="px-2 py-0.5 rounded bg-[#00A6FF]/10 border border-[#00A6FF]/20">customers</span>
                <span className="px-2 py-0.5 rounded bg-[#00A6FF]/10 border border-[#00A6FF]/20">orders</span>
                <span className="px-2 py-0.5 rounded bg-[#00A6FF]/10 border border-[#00A6FF]/20">order_items</span>
                <span className="px-2 py-0.5 rounded bg-[#00A6FF]/10 border border-[#00A6FF]/20">products</span>
              </div>
            </div>

            {/* MongoDB Card */}
            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-4 hover:border-[#00D6A0]/40 transition-all group">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-[#00D6A0]/10 border border-[#00D6A0]/20 flex items-center justify-center text-[#00D6A0] group-hover:scale-105 transition-transform">
                  <Layers className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/20">
                  MQL Pipeline
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white">MongoDB 7.0</h3>
                <p className="text-xs text-[#929BA8] mt-1.5 leading-relaxed">
                  Semi-structured document collections for product reviews, user telemetry events, and audit metadata storage.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-[#00D6A0]">
                <span className="px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/20">reviews</span>
                <span className="px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/20">events</span>
                <span className="px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/20">conversations</span>
              </div>
            </div>

            {/* Elasticsearch Card */}
            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-4 hover:border-amber-400/40 transition-all group">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Zap className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  Query DSL
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Elasticsearch 8.13</h3>
                <p className="text-xs text-[#929BA8] mt-1.5 leading-relaxed">
                  Full-text search catalog with fuzzy matching and server access logs for performance response time analysis.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-amber-400">
                <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">catalog</span>
                <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">access_logs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Engine Capabilities Bento Grid */}
      <section id="features" className="relative py-20 z-10 border-t border-white/[0.08] bg-[#0D1117]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
              Deterministic Query Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Engine Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed">
              Designed specifically to eliminate the silent hallucination and ungrounded guesswork of conventional LLMs.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Ambiguity Guardian (Large 2-column) */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] flex flex-col justify-between hover:border-[#00D6A0]/40 transition-all group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#00D6A0]/10 border border-[#00D6A0]/20 flex items-center justify-center text-[#00D6A0]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Ambiguity Guardian</h3>
                <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed max-w-xl">
                  Detects underspecified entities, conflicting cross-database column names, and vague timeframes with interactive clarification cards. Never guesses silently.
                </p>
              </div>

              {/* Clarification Simulation Mockup */}
              <div className="mt-6 p-4 rounded-xl bg-[#080A0D] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#929BA8]">Ambiguity Interception</span>
                  <span className="text-[#00D6A0]">Confidence: 65% · Clarification Required</span>
                </div>
                <div className="p-3 rounded-lg bg-[#171D25] border border-white/[0.06] text-xs">
                  <p className="text-white font-medium mb-2">
                    Parameter: <span className="text-[#00D6A0]">customer_identifier</span> — &quot;Which customer would you like to check?&quot;
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40">
                      ✓ Alice Smith
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.05] text-[#929BA8] border border-white/[0.08]">
                      Bob Jones
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.05] text-[#929BA8] border border-white/[0.08]">
                      All Customers Under $100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Schema Canvas */}
            <div className="p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] flex flex-col justify-between hover:border-[#00A6FF]/40 transition-all group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#00A6FF]/10 border border-[#00A6FF]/20 flex items-center justify-center text-[#00A6FF]">
                  <Network className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Schema Canvas</h3>
                <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed">
                  Interactive ReactFlow graph displaying native foreign keys, user-defined cross-database links, and automated BFS multi-hop joins.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-[#080A0D] border border-white/[0.06] text-center font-mono text-[11px] text-[#00A6FF]">
                customers ➔ orders ➔ items ➔ products
              </div>
            </div>

            {/* Bento Card 3: Polyglot Dialect Generation */}
            <div className="p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-3 hover:border-emerald-400/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00D6A0]">
                <Code2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Polyglot Dialect Generation</h3>
              <p className="text-xs text-[#929BA8] leading-relaxed">
                Synthesizes parameterized PostgreSQL SQL, MongoDB aggregation pipelines, and Elasticsearch Query DSL safely from an IR Logical Plan.
              </p>
            </div>

            {/* Bento Card 4: Strict Read-Only Guardrails */}
            <div className="p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-3 hover:border-[#00A6FF]/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-[#00A6FF]/10 border border-[#00A6FF]/20 flex items-center justify-center text-[#00A6FF]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Strict Read-Only Guardrails</h3>
              <p className="text-xs text-[#929BA8] leading-relaxed">
                Multi-layer AST validation prevents any modification to connected production data. Write operations are architecturally prohibited.
              </p>
            </div>

            {/* Bento Card 5: SHA-256 Audit Ledger */}
            <div className="p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-3 hover:border-purple-400/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">SHA-256 Audit Ledger</h3>
              <p className="text-xs text-[#929BA8] leading-relaxed">
                Tamper-evident cryptographically chained ledger logging every question, translation, and execution outcome with verifiable integrity.
              </p>
            </div>

            {/* Bento Card 6: Provenance & Visualization (Full width on bottom or 3rd column) */}
            <div className="md:col-span-3 p-8 rounded-2xl bg-[#11161D] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-amber-400/40 transition-all">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 text-amber-400 font-semibold text-xs font-mono">
                  <BarChart3 className="h-4 w-4" />
                  <span>Interactive Intelligence</span>
                </div>
                <h3 className="text-lg font-bold text-white">Provenance & Visualization</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">
                  Automated Chart.js suggestions, downloadable CSV/JSON exports, and clear provenance showing which tables and columns produced every number.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-xs text-[#00D6A0]">
                <span className="px-3 py-1.5 rounded-lg bg-[#00D6A0]/10 border border-[#00D6A0]/20">
                  CSV Export
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[#00D6A0]/10 border border-[#00D6A0]/20">
                  JSON Export
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[#00D6A0]/10 border border-[#00D6A0]/20">
                  Chart.js
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Timeline */}
      <section id="how-it-works" className="relative py-20 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
              Execution Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed">
              Four deterministic steps from natural language to verified multi-database execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              <div 
                key={s.step} 
                className="p-6 rounded-2xl bg-[#11161D] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#00D6A0]/40 transition-all"
              >
                <div className="text-3xl font-extrabold text-[#00D6A0] font-mono tracking-tight">
                  {s.step}
                </div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">{s.desc}</p>
                <div className="absolute top-0 right-0 h-16 w-16 bg-[radial-gradient(ellipse_50%_50%_at_100%_0%,rgba(0,214,160,0.1),transparent)] pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Enterprise Use Cases */}
      <section id="use-cases" className="relative py-20 z-10 border-t border-white/[0.08] bg-[#0D1117]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
              Tailored for Cross-Functional Teams
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Tailored for Enterprise Teams
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8] leading-relaxed">
              Empowering technical and non-technical stakeholders across the organization without compromising database governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] flex items-start gap-5 hover:border-[#00D6A0]/30 transition-all">
              <div className="h-11 w-11 rounded-xl bg-[#00D6A0]/10 border border-[#00D6A0]/20 flex items-center justify-center text-[#00D6A0] shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Business Executives & Leaders</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">
                  Get instant conversational summaries of sales KPIs, product demand, and regional performance without waiting on data team tickets.
                </p>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] flex items-start gap-5 hover:border-[#00A6FF]/30 transition-all">
              <div className="h-11 w-11 rounded-xl bg-[#00A6FF]/10 border border-[#00A6FF]/20 flex items-center justify-center text-[#00A6FF] shrink-0">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Data & BI Analysts</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">
                  Verify auto-generated SQL and MongoDB pipelines, inspect relationship paths on the Schema Canvas, and export CSV/JSON datasets.
                </p>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] flex items-start gap-5 hover:border-purple-400/30 transition-all">
              <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Product Managers</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">
                  Cross-reference product catalog ratings in Elasticsearch with user telemetry events in MongoDB to understand feature adoption.
                </p>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#11161D] border border-white/[0.08] flex items-start gap-5 hover:border-amber-400/30 transition-all">
              <div className="h-11 w-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Operations & Support</h3>
                <p className="text-xs text-[#929BA8] leading-relaxed">
                  Query customer order status, shipment tracking, and access log latency without needing database administrator credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Frequently Asked Questions (FAQ) */}
      <section id="faq" className="relative py-20 z-10 border-t border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-mono text-[#00D6A0] uppercase tracking-wider font-semibold">
              Transparency & Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#929BA8]">
              Learn how our ambiguity-first architecture compares to standard query tools.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-xl border border-white/[0.08] bg-[#11161D] overflow-hidden transition-colors hover:border-white/[0.15]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-[#00D6A0] transition-colors"
                >
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#929BA8] transition-transform duration-200 shrink-0 ${
                      openFaq === idx ? "rotate-180 text-[#00D6A0]" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-[#929BA8] leading-relaxed border-t border-white/[0.06] pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action */}
      <section className="relative py-24 z-10 border-t border-white/[0.08] bg-[#0D1117] overflow-hidden text-center">
        {/* Glow behind final CTA */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(0,214,160,0.18),rgba(8,10,13,0))] blur-3xl opacity-80" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D6A0]/10 border border-[#00D6A0]/20 text-[#00D6A0] text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Enterprise-Ready Deployment</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Your Data Has Answers. <br />
            <span className="text-[#00D6A0]">Start Asking.</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#929BA8] max-w-md mx-auto leading-relaxed">
            Connect your databases and experience a smarter way to explore your data.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button className="h-11 px-7 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#080A0D] text-xs font-semibold rounded-lg shadow-xl shadow-[#00D6A0]/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5">
                <span>Create Your Free Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/chat">
              <Button
                variant="outline"
                className="h-11 px-7 border-white/[0.1] bg-[#11161D] hover:bg-[#171D25] text-white text-xs font-medium rounded-lg"
              >
                <span>Explore Demo Console</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Polished Minimalist Footer */}
      <footer className="py-12 bg-[#080A0D] border-t border-white/[0.08] text-[#929BA8] text-xs z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="h-7 w-7 rounded-lg bg-[#00D6A0]/10 border border-[#00D6A0]/25 flex items-center justify-center text-[#00D6A0]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-white font-semibold">Nexus Query Engine</span>
              <span className="mx-2 text-white/[0.2]">·</span>
              <span>&copy; 2026 All rights reserved.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#929BA8]">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat Console
            </Link>
            <Link href="/connections" className="hover:text-white transition-colors">
              Databases
            </Link>
            <Link href="/schema" className="hover:text-white transition-colors">
              Schema Canvas
            </Link>
            <Link href="/audit" className="hover:text-white transition-colors">
              Audit Ledger
            </Link>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
