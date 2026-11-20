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
  Copy,
  Clock,
  ArrowUpRight,
  Cpu,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();

  const [activeQueryIndex, setActiveQueryIndex] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<"results" | "sql" | "mql" | "graph">("results");
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  const demos = [
    {
      id: "demo-revenue",
      title: "Revenue Leaders",
      query: "Show me the top five products by revenue this month.",
      executionTime: "4.2 ms",
      engineStrategy: "PostgreSQL 16 + In-Memory Hash Join",
      entities: ["orders", "order_items", "products"],
      columns: [
        { key: "product", label: "Product Name", type: "VARCHAR" },
        { key: "category", label: "Category", type: "VARCHAR" },
        { key: "units", label: "Units Sold", type: "INT" },
        { key: "revenue", label: "Revenue", type: "DECIMAL", align: "right" },
        { key: "rating", label: "Customer Sentiment", type: "MQL JOIN" },
      ],
      rows: [
        { product: "Pro Noise-Cancelling Buds", category: "Audio", units: "420", revenue: "$14,250.00", rating: "4.9 ★ (128 reviews)" },
        { product: 'Ultra-Wide 34" Curved Monitor', category: "Display", units: "119", revenue: "$11,890.00", rating: "4.7 ★ (89 reviews)" },
        { product: "Mechanical Wireless Deck", category: "Peripherals", units: "210", revenue: "$8,420.00", rating: "4.8 ★ (204 reviews)" },
        { product: "Ergonomic Desk Riser", category: "Office", units: "95", revenue: "$6,150.00", rating: "4.6 ★ (62 reviews)" },
        { product: "Thunderbolt 4 Hub Pro", category: "Accessories", units: "148", revenue: "$5,890.00", rating: "4.8 ★ (95 reviews)" },
      ],
      sql: `-- Compiled PostgreSQL SQL (Strict Read-Only Cursor)
SELECT 
  p.name AS product_name,
  p.category,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_date >= '2025-01-01'
GROUP BY p.id, p.name, p.category
ORDER BY total_revenue DESC
LIMIT 5;`,
      mql: `// Parallel Subquery: MongoDB Customer Sentiment
db.reviews.aggregate([
  { "$match": { "rating": { "$gte": 4.5 } } },
  { "$group": { 
      "_id": "$product_id", 
      "avg_rating": { "$avg": "$rating" },
      "total_reviews": { "$sum": 1 }
    }
  },
  { "$sort": { "avg_rating": -1 } }
]);`,
      graphPath: [
        { from: "orders", to: "order_items", on: "orders.id = order_items.order_id", cost: "FK Direct" },
        { from: "order_items", to: "products", on: "order_items.product_id = products.id", cost: "FK Direct" },
        { from: "products", to: "mongo.reviews", on: "products.id = reviews.product_id", cost: "Federated Hash Join" },
      ],
    },
    {
      id: "demo-high-value",
      title: "High-Value Buyers",
      query: "Show me high-value customers who recently purchased electronics.",
      executionTime: "5.8 ms",
      engineStrategy: "Ambiguity Clarified: High-Value Threshold >= $1,000",
      entities: ["customers", "orders", "order_items", "products"],
      columns: [
        { key: "product", label: "Customer Name", type: "VARCHAR" },
        { key: "category", label: "Orders Placed", type: "INT" },
        { key: "units", label: "Country", type: "CHAR(2)" },
        { key: "revenue", label: "Lifetime Value", type: "DECIMAL", align: "right" },
        { key: "rating", label: "Ambiguity Resolution", type: "PROVENANCE" },
      ],
      rows: [
        { product: "Alice Smith", category: "8", units: "US", revenue: "$4,250.00", rating: "Verified: threshold >= $1,000" },
        { product: "Bob Jones", category: "5", units: "CA", revenue: "$3,100.00", rating: "Verified: threshold >= $1,000" },
        { product: "Diana Prince", category: "6", units: "US", revenue: "$2,890.00", rating: "Verified: threshold >= $1,000" },
        { product: "Evan Wright", category: "4", units: "DE", revenue: "$2,450.00", rating: "Verified: threshold >= $1,000" },
        { product: "Fiona Gallagher", category: "4", units: "FR", revenue: "$2,100.00", rating: "Verified: threshold >= $1,000" },
      ],
      sql: `-- Ambiguity Parameter Injected: high_value_threshold = 1000
SELECT 
  c.id,
  c.name AS customer_name,
  c.country,
  COUNT(DISTINCT o.id) AS total_orders,
  SUM(o.total_amount) AS customer_ltv
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE p.category = 'Electronics'
  AND o.order_date >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name, c.country
HAVING SUM(o.total_amount) >= 1000
ORDER BY customer_ltv DESC;`,
      mql: `// Cross-Checked with Elasticsearch Catalog Index:
GET catalog/_search
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
      graphPath: [
        { from: "customers", to: "orders", on: "customers.id = orders.customer_id", cost: "FK Direct" },
        { from: "orders", to: "order_items", on: "orders.id = order_items.order_id", cost: "FK Direct" },
        { from: "order_items", to: "products", on: "order_items.product_id = products.id", cost: "FK Direct" },
      ],
    },
    {
      id: "demo-purchases",
      title: "Sub-$30 Purchases",
      query: "Which buyers purchased goods cheaper than 30?",
      executionTime: "3.7 ms",
      engineStrategy: "Automated 4-Hop Relational Traversal",
      entities: ["customers", "orders", "order_items", "products"],
      columns: [
        { key: "product", label: "Buyer Name", type: "VARCHAR" },
        { key: "category", label: "Item Purchased", type: "VARCHAR" },
        { key: "units", label: "SKU", type: "VARCHAR" },
        { key: "revenue", label: "Unit Price", type: "DECIMAL", align: "right" },
        { key: "rating", label: "Predicate Check", type: "FILTER" },
      ],
      rows: [
        { product: "Alice Smith", category: "USB-C Braided Cable", units: "ACC-CAB-002", revenue: "$19.99", rating: "unit_price < $30.00" },
        { product: "Evan Wright", category: "Ceramic Coffee Mug", units: "HOME-MUG-001", revenue: "$14.50", rating: "unit_price < $30.00" },
        { product: "Fiona Gallagher", category: "Ergonomic Mousepad", units: "ACC-PAD-005", revenue: "$18.25", rating: "unit_price < $30.00" },
        { product: "Hannah Abbott", category: "Screen Cleaning Kit", units: "ACC-CLN-001", revenue: "$12.99", rating: "unit_price < $30.00" },
        { product: "Ian Malcolm", category: "Cable Organizer Set", units: "ACC-ORG-003", revenue: "$24.99", rating: "unit_price < $30.00" },
      ],
      sql: `-- Multi-Hop Path Discovered via BFS Traversal
SELECT 
  c.name AS buyer_name,
  p.name AS item_name,
  p.sku,
  oi.unit_price,
  oi.quantity
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE oi.unit_price < 30.00
ORDER BY oi.unit_price ASC
LIMIT 20;`,
      mql: `// Graph Routing Summary:
// Path Cost: 3 edges (0 cross-source barriers)
// Traversal: customers [c] -> orders [o] -> order_items [oi] -> products [p]
// Filter: oi.unit_price < 30.00 applied during inner scan`,
      graphPath: [
        { from: "customers", to: "orders", on: "c.id = o.customer_id", cost: "FK Direct" },
        { from: "orders", to: "order_items", on: "o.id = oi.order_id", cost: "FK Direct" },
        { from: "order_items", to: "products", on: "oi.product_id = p.id", cost: "FK Direct" },
      ],
    },
  ];

  const currentDemo = demos[activeQueryIndex];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="min-h-screen bg-[#090A0E] text-[#F3F4F6] flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. Refined Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#090A0E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-xs">
              <Boxes className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">Nexus Query</span>
              <span className="text-[11px] font-mono text-zinc-500 border-l border-zinc-800 pl-2">
                Natural Language Query Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-xs text-zinc-400">
            <a href="#demo" className="hover:text-white transition-colors">
              Live Engine
            </a>
            <a href="#integrations" className="hover:text-white transition-colors">
              Databases
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#use-cases" className="hover:text-white transition-colors">
              Teams
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <Link href="/chat">
                <Button className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium px-3.5 h-8.5 rounded-lg shadow-xs transition-all flex items-center gap-1.5">
                  <span>Enter Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-xs text-zinc-400 hover:text-white h-8.5 px-3">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs px-3.5 h-8.5 rounded-lg shadow-xs transition-colors flex items-center gap-1.5">
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white sm:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-zinc-800 bg-[#0F1117] px-4 py-4 space-y-3 text-xs">
            <div className="flex flex-col space-y-2 text-zinc-300">
              <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Live Engine</a>
              <a href="#integrations" onClick={() => setMobileMenuOpen(false)}>Databases</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#use-cases" onClick={() => setMobileMenuOpen(false)}>Teams</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </div>
            <div className="pt-3 border-t border-zinc-800 flex gap-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full text-xs h-8 border-zinc-700 bg-transparent text-white">Sign In</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button className="w-full text-xs h-8 bg-emerald-500 text-zinc-950 font-semibold">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-12 md:pt-24 md:pb-20 border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] tracking-wide uppercase">
              Production-Grade Federated Querying
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.12] max-w-4xl mx-auto">
            Your entire data infrastructure. <br />
            <span className="text-zinc-400 font-normal">One natural language interface.</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
            Connect PostgreSQL, MongoDB, Elasticsearch and more. Ask questions in plain English and receive intelligent, explainable answers backed by real database queries.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link href="/chat">
              <Button className="w-full sm:w-auto h-10 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2">
                <span>Explore the Platform</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10 px-6 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
              >
                <span>See How It Works</span>
              </Button>
            </a>
          </div>

          {/* Core Security Callouts */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-8 text-xs text-zinc-400 border-t border-zinc-800/60 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-zinc-400" />
              <span>Strict Read-Only Guardrails</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>Ambiguity Interception</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <span>Cryptographic Audit Ledger</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Real Product Experience / Interactive Demo */}
      <section id="demo" className="py-16 md:py-20 border-b border-zinc-800/80 bg-[#0B0D13]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                Deterministic Execution Preview
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Inspect Real Engine Translations
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-md">
              See how natural language inquiries are grounded into schema graphs, compiled into native dialect ASTs, and returned as structured datasets.
            </p>
          </div>

          {/* The Workspace Interface Container */}
          <div className="rounded-xl border border-zinc-800 bg-[#0F1117] shadow-xl overflow-hidden">
            {/* Top Workspace Header Bar */}
            <div className="px-4 py-3 bg-[#131620] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Database className="h-4 w-4 text-emerald-400" />
                <span className="text-white font-medium">Workspace:</span>
                <span className="font-mono text-zinc-300">Production Heterogeneous Cluster</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400">Read-Only Session</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-[11px] text-zinc-400">
                  Latency: <span className="text-white font-medium">{currentDemo.executionTime}</span>
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Strategy: <span className="text-zinc-300">{currentDemo.engineStrategy}</span>
                </span>
              </div>
            </div>

            {/* Query Selector Tabs (Clean IDE query presets) */}
            <div className="px-4 py-3 bg-[#0F1117] border-b border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {demos.map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setActiveQueryIndex(idx);
                    setActiveTab("results");
                  }}
                  className={`text-left p-3 rounded-lg text-xs transition-all ${
                    activeQueryIndex === idx
                      ? "bg-zinc-800/90 text-white shadow-xs border border-zinc-700"
                      : "bg-zinc-900/40 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-[11px]">{d.title}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{d.executionTime}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{d.query}</p>
                </button>
              ))}
            </div>

            {/* Natural Language Prompt Composer */}
            <div className="p-4 bg-[#11141D] border-b border-zinc-800">
              <div className="flex items-center gap-3 bg-[#0A0C12] border border-zinc-800 rounded-lg px-3.5 py-2.5">
                <Search className="h-4 w-4 text-zinc-500 shrink-0" />
                <div className="flex-1 text-xs text-white font-medium select-all">
                  &gt; {currentDemo.query}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Schema Grounded
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Area: Dialect Switcher + Output Views */}
            <div className="p-4 sm:p-5">
              {/* Dialect Tabs */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: "results", label: "Structured Results" },
                      { id: "sql", label: "PostgreSQL SQL" },
                      { id: "mql", label: "Document / Search DSL" },
                      { id: "graph", label: "Schema Graph Path" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-zinc-800 text-white font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
                  <span>Entities:</span>
                  <div className="flex gap-1">
                    {currentDemo.entities.map((e) => (
                      <span key={e} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* View 1: Results Table */}
              {activeTab === "results" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        {currentDemo.columns.map((c) => (
                          <th
                            key={c.key}
                            className={`pb-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}
                          >
                            <span>{c.label}</span>
                            <span className="ml-1.5 text-[9px] font-mono text-zinc-600 font-normal">
                              {c.type}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {currentDemo.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 text-white font-medium">{row.product}</td>
                          <td className="py-2.5 text-zinc-300 font-mono text-[11px]">{row.category}</td>
                          <td className="py-2.5 text-zinc-400 font-mono text-[11px]">{row.units}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-zinc-100 font-medium">
                            {row.revenue}
                          </td>
                          <td className="py-2.5 text-zinc-400 text-[11px]">{row.rating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Generated SQL */}
              {activeTab === "sql" && (
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0A0C12] border border-zinc-800 text-zinc-200 font-mono text-xs leading-relaxed overflow-x-auto select-all">
                    {currentDemo.sql}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(currentDemo.sql)}
                    className="absolute top-3 right-3 p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                    title="Copy SQL"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {/* View 3: Document / Search MQL */}
              {activeTab === "mql" && (
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0A0C12] border border-zinc-800 text-zinc-200 font-mono text-xs leading-relaxed overflow-x-auto select-all">
                    {currentDemo.mql}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(currentDemo.mql)}
                    className="absolute top-3 right-3 p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                    title="Copy Code"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {/* View 4: Schema Graph Path */}
              {activeTab === "graph" && (
                <div className="p-4 rounded-lg bg-[#0A0C12] border border-zinc-800 space-y-3 font-mono text-xs">
                  <div className="text-zinc-400 text-xs mb-2">
                    BFS Schema Traversal Graph Path:
                  </div>
                  <div className="space-y-2">
                    {currentDemo.graphPath.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded bg-zinc-900 border border-zinc-800/80">
                        <span className="text-emerald-400 font-bold">{i + 1}.</span>
                        <div className="flex-1 flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium">{step.from}</span>
                          <span className="text-zinc-500">➔</span>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium">{step.to}</span>
                          <span className="text-zinc-500 text-[11px]">({step.on})</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded bg-zinc-800/50">
                          {step.cost}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Audit Bar */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-zinc-400">AST Validation Passed</span>
                  <span className="text-zinc-700">·</span>
                  <span>Read-Only Execution Enforced</span>
                </div>
                <div>
                  Audit Hash: <span className="text-zinc-400">sha256:7f8a42...e91c</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Connected Databases Integration Grid */}
      <section id="integrations" className="py-20 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Supported Data Topologies
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Connected Databases
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Direct introspection across relational engines, document collections, and inverted search indices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PostgreSQL */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  ANSI SQL
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">PostgreSQL 16</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Relational transactional core for customers, orders, order items, and products with multi-hop foreign-key joins.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">customers</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">orders</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">order_items</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">products</span>
              </div>
            </div>

            {/* MongoDB */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  Aggregation MQL
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">MongoDB 7.0</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Semi-structured document collections for product reviews, user telemetry events, and audit metadata storage.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">reviews</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">events</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">conversations</span>
              </div>
            </div>

            {/* Elasticsearch */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  Inverted Search DSL
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Elasticsearch 8.13</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Full-text search catalog with fuzzy matching and server access logs for performance response time analysis.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">catalog</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">access_logs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Capabilities Section */}
      <section id="features" className="py-20 border-b border-zinc-800/80 bg-[#0B0D13]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Engine Subsystems
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Engine Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Deterministic query planning and security controls engineered for mission-critical enterprise environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Ambiguity Guardian */}
            <div className="md:col-span-2 p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Ambiguity Guardian</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                  Detects underspecified entities, conflicting cross-database column names, and vague timeframes with interactive clarification cards.
                </p>
              </div>
              {/* Clean inline clarification inspector */}
              <div className="p-3.5 rounded-lg bg-[#0A0C12] border border-zinc-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Query Ambiguity Analysis</span>
                  <span className="text-emerald-400">Interception Confidence: 65%</span>
                </div>
                <div className="text-zinc-300 text-[11px]">
                  &quot;customer_identifier&quot; parameter requires user confirmation:
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-white border border-zinc-700">
                    Alice Smith
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    Bob Jones
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    All Customers
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Schema Canvas */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                <Network className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Schema Canvas</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interactive ReactFlow graph displaying native foreign keys, user-defined cross-database links, and automated BFS multi-hop joins.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0C12] border border-zinc-800 font-mono text-[11px] text-zinc-400">
                customers ➔ orders ➔ items ➔ products
              </div>
            </div>

            {/* Card 3: Polyglot Dialect Generation */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                <Code2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Polyglot Dialect Generation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Synthesizes parameterized PostgreSQL SQL, MongoDB aggregation pipelines, and Elasticsearch Query DSL safely from an IR Logical Plan.
              </p>
            </div>

            {/* Card 4: Strict Read-Only Guardrails */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Strict Read-Only Guardrails</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Multi-layer AST validation prevents any modification to connected production data. Write operations are architecturally prohibited.
              </p>
            </div>

            {/* Card 5: SHA-256 Audit Ledger */}
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">SHA-256 Audit Ledger</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tamper-evident cryptographically chained ledger logging every question, translation, and execution outcome with verifiable integrity.
              </p>
            </div>

            {/* Card 6: Provenance & Visualization */}
            <div className="md:col-span-3 p-6 rounded-xl bg-[#0F1117] border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <h3 className="text-base font-bold text-white">Provenance & Visualization</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automated Chart.js suggestions, downloadable CSV/JSON exports, and clear provenance showing which tables and columns produced every number.
                </p>
              </div>
              <div className="flex gap-2 font-mono text-[11px] text-zinc-300">
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">CSV Export</span>
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">JSON Export</span>
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">Chart.js</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Timeline */}
      <section id="how-it-works" className="py-20 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Execution Lifecycle
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Four deterministic steps from raw natural language to verified execution.
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
              <div key={s.step} className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 space-y-3">
                <div className="text-2xl font-bold text-emerald-400 font-mono">{s.step}</div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Teams Use Cases */}
      <section id="use-cases" className="py-20 border-b border-zinc-800/80 bg-[#0B0D13]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Enterprise Stakeholders
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Tailored for Enterprise Teams
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Empowering technical and non-technical stakeholders across the organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Business Executives & Leaders</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Get instant conversational summaries of sales KPIs, product demand, and regional performance without waiting on data team tickets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Data & BI Analysts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Verify auto-generated SQL and MongoDB pipelines, inspect relationship paths on the Schema Canvas, and export CSV/JSON datasets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Product Managers</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cross-reference product catalog ratings in Elasticsearch with user telemetry events in MongoDB to understand feature adoption.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0F1117] border border-zinc-800 flex items-start gap-4">
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                <Briefcase className="h-4 w-4" />
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

      {/* 8. FAQ Accordion */}
      <section id="faq" className="py-20 border-b border-zinc-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Learn how our ambiguity-first architecture compares to standard query tools.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-[#0F1117] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-emerald-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform ${
                      openFaq === idx ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-20 text-center bg-[#090A0E] border-b border-zinc-800/80">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Your Data Has Answers. <br />
            <span className="text-zinc-400">Start Asking.</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Connect your databases and experience a smarter way to explore your data.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href="/register">
              <Button className="h-10 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2">
                <span>Create Your Free Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Minimalist Footer */}
      <footer className="py-10 bg-[#07080B] text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300 font-semibold">Nexus Query Engine</span>
            <span>&copy; 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/chat" className="hover:text-zinc-300 transition-colors">
              Chat Console
            </Link>
            <Link href="/connections" className="hover:text-zinc-300 transition-colors">
              Databases
            </Link>
            <Link href="/schema" className="hover:text-zinc-300 transition-colors">
              Schema Canvas
            </Link>
            <Link href="/audit" className="hover:text-zinc-300 transition-colors">
              Audit Ledger
            </Link>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-zinc-300 transition-colors flex items-center gap-1"
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
