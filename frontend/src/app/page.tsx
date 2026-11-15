"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Database,
  Network,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Layers,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTimeRange, setActiveTimeRange] = useState<"30d" | "7d" | "all">("30d");

  const exampleQueries = [
    {
      query: "Show me the top five products by revenue this month.",
      type: "PostgreSQL & Mongo",
      ambiguity: "Clear / Direct Execution",
      badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      query: "Show me high-value customers who recently purchased electronics.",
      type: "Cross-Database",
      ambiguity: "Requires Clarification ('high-value' threshold, 'recently' timeframe)",
      badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
    {
      query: "Which customers have placed orders but have not paid?",
      type: "PostgreSQL",
      ambiguity: "Clear / Direct Execution",
      badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      query: "Compare monthly sales across all connected databases.",
      type: "Multi-Source Federation",
      ambiguity: "Federated Query Plan",
      badgeClass: "text-teal-300 bg-teal-500/10 border-teal-500/30",
    },
  ];

  const recentOrders = [
    {
      id: "ORD-00100",
      customer: "Tony Stark",
      email: "tony.stark@example.com",
      country: "US",
      amount: "$2,599.98",
      items: "UltraBook Pro 15 (x2)",
      status: "Completed",
      date: "Today, 14:20",
    },
    {
      id: "ORD-00098",
      customer: "Sarah Connor",
      email: "sarah.c@example.com",
      country: "US",
      amount: "$1,299.99",
      items: "Gaming Console 1TB",
      status: "Completed",
      date: "Yesterday",
    },
    {
      id: "ORD-00095",
      customer: "Bruce Wayne",
      email: "bruce.w@example.com",
      country: "US",
      amount: "$1,748.00",
      items: "4K Monitor + Air Purifier",
      status: "Processing",
      date: "2 days ago",
    },
    {
      id: "ORD-00091",
      customer: "Vito Corleone",
      email: "vito.c@example.it",
      country: "IT",
      amount: "$899.50",
      items: "SmartPhone Prime X",
      status: "Pending",
      date: "3 days ago",
    },
    {
      id: "ORD-00087",
      customer: "Hermione Granger",
      email: "hermione.g@example.uk",
      country: "UK",
      amount: "$549.00",
      items: "Espresso Artisan Machine",
      status: "Completed",
      date: "4 days ago",
    },
  ];

  const categoryBreakdown = [
    { name: "Electronics & Computing", revenue: "$42,120.00", share: 50.0, color: "bg-emerald-500" },
    { name: "Kitchen & Appliances", revenue: "$21,480.00", share: 25.5, color: "bg-teal-500" },
    { name: "Furniture & Office", revenue: "$12,850.50", share: 15.2, color: "bg-cyan-500" },
    { name: "Wearables & Outdoor", revenue: "$7,840.00", share: 9.3, color: "bg-emerald-600" },
  ];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (typeof window !== "undefined") {
      window.location.href = `/chat?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleRunSample = (q: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/chat?q=${encodeURIComponent(q)}`;
    }
  };

  return (
    <div className="flex-1 p-5 md:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in-50 duration-300 text-foreground">
      {/* Top Header / CRM Live Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Natural Language Query Engine</span>
            </h1>
            <Badge variant="info" className="bg-emerald-950/80 text-emerald-400 border-emerald-800/50">
              Phase 1 Active
            </Badge>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Cluster Sync (3 DBs)
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
            Enterprise Customer & Revenue Intelligence across PostgreSQL, MongoDB & Elasticsearch with interactive ambiguity resolution and strict read-only safety guarantees.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center bg-[#171717] border border-border/80 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTimeRange("7d")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeTimeRange === "7d"
                  ? "bg-[#282828] text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setActiveTimeRange("30d")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeTimeRange === "30d"
                  ? "bg-[#282828] text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setActiveTimeRange("all")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeTimeRange === "all"
                  ? "bg-[#282828] text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Time
            </button>
          </div>

          <Link href="/connections">
            <Button variant="outline" size="sm" className="gap-2 border-border/80 bg-[#171717] hover:bg-[#252525] text-zinc-200 text-xs h-8">
              <Database className="h-3.5 w-3.5 text-zinc-400" />
              <span>Connections</span>
            </Button>
          </Link>

          <Link href="/chat">
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs font-medium text-xs h-8">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Start New Query</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent NLP Query Command Bar */}
      <div className="relative rounded-xl border border-emerald-500/30 bg-[#171717] p-4 shadow-xl">
        <form onSubmit={handleQuickSearch} className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask anything across customers, orders, revenue, or event touchpoints in natural language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 h-8 gap-1.5 shrink-0"
          >
            <span>Query Engine</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        <div className="mt-3 pt-3 border-t border-[#262626] flex items-center gap-2 overflow-x-auto text-[11px] text-zinc-400">
          <span className="shrink-0 text-zinc-500 font-medium">Quick Prompts:</span>
          <button
            onClick={() => handleRunSample("Show top 5 customers with most orders")}
            className="shrink-0 px-2.5 py-1 rounded-md bg-[#212121] border border-border/80 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            Top 5 Customers by Orders
          </button>
          <button
            onClick={() => handleRunSample("Show me the top five products by revenue this month.")}
            className="shrink-0 px-2.5 py-1 rounded-md bg-[#212121] border border-border/80 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            Top Products by Revenue
          </button>
          <button
            onClick={() => handleRunSample("Show high-value customers who purchased electronics recently")}
            className="shrink-0 px-2.5 py-1 rounded-md bg-[#212121] border border-border/80 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            High-Value Electronics Churn
          </button>
          <button
            onClick={() => handleRunSample("Compare monthly sales across all connected databases.")}
            className="shrink-0 px-2.5 py-1 rounded-md bg-[#212121] border border-border/80 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            Cross-DB Monthly Revenue
          </button>
        </div>
      </div>

      {/* Modern CRM Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers & Accounts */}
        <Card className="bg-[#171717] border-border/80 hover:border-zinc-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              CRM Accounts
            </span>
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">50 Customers</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <span className="text-emerald-400 font-medium flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5 inline" /> +12.5%
              </span>
              <span>·</span>
              <span>42 Active, 8 At-Risk</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>9 Global Countries</span>
              <span className="text-zinc-400">PostgreSQL</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gross Merchandise Value & Revenue */}
        <Card className="bg-[#171717] border-border/80 hover:border-zinc-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total GMV / Sales
            </span>
            <div className="h-7 w-7 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">$84,290.50</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <span className="text-emerald-400 font-medium flex items-center">
                <TrendingUp className="h-3 w-3 mr-0.5 inline" /> +18.2%
              </span>
              <span>·</span>
              <span>100 Orders placed</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Avg $842.90 / order</span>
              <span className="text-zinc-400">250 Line Items</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Connected Databases */}
        <Card className="bg-[#171717] border-border/80 hover:border-zinc-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Connected Databases
            </CardTitle>
            <div className="h-7 w-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">3 Active</div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusIndicator status="online" label="PostgreSQL" />
              <StatusIndicator status="online" label="MongoDB" />
              <StatusIndicator status="online" label="Elasticsearch" />
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>8 Entities Synced</span>
              <span className="text-emerald-400">● 100% Online</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Ambiguity Guardian & Safety */}
        <Card className="bg-[#171717] border-border/80 hover:border-zinc-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Ambiguity Guardian
            </CardTitle>
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">Protected</div>
            <p className="text-xs text-zinc-400 mt-1">
              Zero unclarified silent assumptions before SQL/MQL compilation.
            </p>
            <div className="mt-2.5 pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Strict Read-Only AST</span>
              <span className="text-emerald-400">Safe Execution</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Schema Canvas Banner & CRM Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: CRM Revenue Breakdown & Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Distribution Progress Card */}
          <Card className="bg-[#171717] border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  Revenue Distribution by Product Category
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cross-referenced from PostgreSQL order items & Elasticsearch product taxonomy
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-zinc-300 border-border">
                Live Aggregation
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stacked Progress Bar */}
              <div className="h-3 w-full bg-[#262626] rounded-full overflow-hidden flex">
                {categoryBreakdown.map((cat, i) => (
                  <div
                    key={i}
                    style={{ width: `${cat.share}%` }}
                    className={`${cat.color} h-full transition-all`}
                    title={`${cat.name}: ${cat.revenue}`}
                  />
                ))}
              </div>

              {/* Category Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[#212121] border border-[#2a2a2a]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                      <span className="text-[11px] text-zinc-400 truncate">{cat.name}</span>
                    </div>
                    <div className="text-xs font-semibold text-white">{cat.revenue}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{cat.share}% share</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent CRM Orders & Customers Table */}
          <Card className="bg-[#171717] border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  Recent High-Value CRM Transactions
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real customer records populated in PostgreSQL target database
                </p>
              </div>
              <button
                onClick={() => handleRunSample("Show top 10 recent orders with customer names and items")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
              >
                <span>Query All Orders</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#282828] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-2.5 font-normal">Customer</th>
                      <th className="pb-2.5 font-normal">Order</th>
                      <th className="pb-2.5 font-normal">Items</th>
                      <th className="pb-2.5 font-normal">Amount</th>
                      <th className="pb-2.5 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#202020] transition-colors">
                        <td className="py-2.5 pr-2">
                          <div className="font-medium text-white">{ord.customer}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {ord.email} ({ord.country})
                          </div>
                        </td>
                        <td className="py-2.5 pr-2 font-mono text-[11px] text-zinc-400">
                          {ord.id}
                        </td>
                        <td className="py-2.5 pr-2 text-zinc-300 text-xs truncate max-w-[160px]">
                          {ord.items}
                        </td>
                        <td className="py-2.5 pr-2 font-mono font-medium text-emerald-400">
                          {ord.amount}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              ord.status === "Completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : ord.status === "Processing"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Schema Canvas Card & Database Cluster Fabric */}
        <div className="space-y-6">
          {/* Schema Canvas Overview Card */}
          <Card className="bg-[#171717] border-border/80 hover:border-emerald-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-white">Schema Canvas</CardTitle>
              <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Network className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-white tracking-tight">Infinite Canvas</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Interactive visual graph of tables, collections, indices & relationships.
              </p>
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2a2a2a] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Visual Entities:</span>
                  <span className="font-mono text-white font-medium">8 Entities</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Relationship Links:</span>
                  <span className="font-mono text-emerald-400 font-medium">5 Edges (2 Cross-DB)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Canvas Canvas Theme:</span>
                  <span className="font-mono text-zinc-300">Pure Dark (#212121)</span>
                </div>
              </div>
              <Link href="/schema" className="w-full block">
                <Button variant="outline" size="sm" className="w-full text-xs border-border/80 text-zinc-200 hover:bg-[#252525] gap-1.5 h-8">
                  <span>Explore Schema Topology</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Database Cluster Health & Volume */}
          <Card className="bg-[#171717] border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">
                Cluster Topology & Health
              </CardTitle>
              <p className="text-xs text-zinc-400">Live target databases connected to query engine</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Target 1: PostgreSQL */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2a2a2a] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-white">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>PostgreSQL (E-Commerce)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    1.2ms
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  50 customers · 30 products · 100 orders · 250 items
                </div>
              </div>

              {/* Target 2: MongoDB */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2a2a2a] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-white">
                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                    <span>MongoDB (User Analytics)</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                    2.4ms
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  150 user events · 60 verified product reviews
                </div>
              </div>

              {/* Target 3: Elasticsearch */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2a2a2a] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-white">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Elasticsearch (Catalog & Logs)</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    3.1ms
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  30 catalog documents · 100 HTTP access logs
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example Queries & Ambiguity Decisioning Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Example Queries & Ambiguity Decisioning
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click any query below to run it through the interactive conversational assistant with ambiguity resolution.
            </p>
          </div>
          <Badge variant="outline" className="border-border text-zinc-400 text-xs">
            Interactive Flow
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {exampleQueries.map((ex, idx) => (
            <div
              key={idx}
              onClick={() => handleRunSample(ex.query)}
              className="group cursor-pointer flex flex-col justify-between rounded-xl border border-border/80 bg-[#171717] p-4 hover:border-emerald-500/50 hover:bg-[#1a1a1a] transition-all"
            >
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-white group-hover:text-emerald-300 transition-colors">
                    {ex.query}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-[#262626] text-[11px]">
                <span className="font-mono text-[10px] bg-[#212121] text-zinc-300 px-2 py-0.5 rounded border border-[#2a2a2a]">
                  {ex.type}
                </span>
                <span className={`font-medium px-2 py-0.5 rounded border text-[10px] ${ex.badgeClass} truncate max-w-[260px]`}>
                  {ex.ambiguity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
