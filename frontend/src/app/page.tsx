"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShellStore } from "@/lib/store";
import {
  X as MenuX,
  Menu,
  ChevronDown,
  ShieldCheck,
  Database,
  Layers,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Preview } from "@/components/preview";
import { BentoGridContent } from "@/components/bento-grid";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

/* ── Navbar ──────────────────────────────────────────────────────────────── */
const Navbar = () => {
  const { currentUser, setCurrentUser } = useShellStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const existing = localStorage.getItem("stored-user");
    if (existing) setCurrentUser(JSON.parse(existing));
  }, [setCurrentUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080A0F]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* Left: brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
            N
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white transition-colors">
            Nexus Query
          </span>
        </Link>

        {/* Centre: navigation */}
        <nav className="hidden items-center gap-8 md:flex text-xs font-medium text-slate-400">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-slate-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: auth CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {currentUser ? (
            <Link href="/chat">
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                Open workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:bg-white/5 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <MenuX className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#090D14] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-slate-400">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="transition-colors hover:text-slate-100"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {currentUser ? (
                <Link href="/chat">
                  <Button size="sm" className="w-full h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold">
                    Open workspace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs border-white/10 text-slate-300">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="w-full h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold">
                      Get started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

/* ── Hero ────────────────────────────────────────────────────────────────── */
const Hero = () => {
  const { currentUser } = useShellStore();

  return (
    <section id="product" className="hero-wash relative overflow-hidden pt-20 pb-20 sm:pt-28 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Luminous Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>Ambiguity-aware, read-only querying</span>
          </div>

          {/* Majestic Hero Headline */}
          <h1 className="mt-8 text-4xl font-semibold tracking-[-0.035em] text-slate-100 sm:text-6xl lg:text-7xl leading-[1.08]">
            Your data.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              One conversation.
            </span>
          </h1>

          {/* Supporting Copy with high contrast and readable line height */}
          <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300">
            Ask questions across all your databases in plain English. Get precise,
            explainable answers without writing a single query. Your data, one
            conversation.
          </p>

          {/* CTA Row */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={currentUser ? "/chat" : "/register"}>
              <Button className="h-11 w-full sm:w-auto gap-2 px-6 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0">
                {currentUser ? "Open workspace" : "Get started"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="#capabilities">
              <Button
                variant="outline"
                className="h-11 w-full sm:w-auto gap-2 px-6 text-sm font-medium rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-slate-200 transition-all"
              >
                See how it works
              </Button>
            </Link>
          </div>

          {/* Database Brand Trust Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              PostgreSQL
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              MongoDB
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Elasticsearch
            </span>
          </div>
        </div>

        {/* The Interactive Product Showcase */}
        <Preview />
      </div>
    </section>
  );
};

/* ── Database Integration Section ────────────────────────────────────────── */
const DatabaseIntegration = () => {
  return (
    <section className="border-t border-white/10 bg-[#090D14]/70 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-400">
              Heterogeneous Introspection
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl text-slate-100">
              One interface. Every data source.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-relaxed text-slate-400">
              Connect the databases you already run. Nexus introspects them and keeps
              the schema map current. No migration, no ETL — just direct access.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <DatabaseIntegrationCard
              kind="Relational"
              name="PostgreSQL"
              accentColor="indigo"
              badge="PostgreSQL 16"
              description="Joins, constraints and foreign keys mapped automatically."
              techDetails="4 tables · 14 columns · 6 foreign key constraints"
            />
            <DatabaseIntegrationCard
              kind="Document"
              name="MongoDB"
              accentColor="emerald"
              badge="MongoDB 7.0"
              description="Collections and nested fields with inferred links."
              techDetails="2 collections · polymorphic reviews & events"
            />
            <DatabaseIntegrationCard
              kind="Search"
              name="Elasticsearch"
              accentColor="amber"
              badge="Elasticsearch 8.13"
              description="Index mappings and full-text fields queried with read-only DSL."
              techDetails="1 catalog index · BM25 search score rankings"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Database Card Component ────────────────────────────────────────────── */
const DatabaseIntegrationCard = React.memo(
  ({
    kind,
    name,
    badge,
    description,
    techDetails,
    accentColor,
  }: {
    kind: string;
    name: string;
    badge: string;
    description: string;
    techDetails: string;
    accentColor: "indigo" | "emerald" | "amber";
  }) => {
    return (
      <div className="group relative rounded-2xl border border-white/10 bg-[#0C1017] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.12)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                accentColor === "indigo"
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                  : accentColor === "emerald"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {kind === "Relational" && <Database className="h-4 w-4" />}
              {kind === "Document" && <Layers className="h-4 w-4" />}
              {kind === "Search" && <Zap className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">{name}</h3>
              <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-slate-500">
                {kind}
              </span>
            </div>
          </div>

          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          {description}
        </p>

        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>{techDetails}</span>
        </div>
      </div>
    );
  }
);
DatabaseIntegrationCard.displayName = "DatabaseIntegrationCard";

/* ── Bento Grid Capabilities Section ─────────────────────────────────────── */
const BentoGrid = () => {
  return (
    <section id="capabilities" className="border-t border-white/10 bg-[#080A0F] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
              Engine Subsystems
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl text-slate-100">
              Complex data. Simple conversations.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm leading-relaxed text-slate-400">
              Features built for how humans actually ask — and how databases
              actually work.
            </p>
          </div>

          <BentoGridContent />
        </div>
      </div>
    </section>
  );
};

/* ── How It Works Section ────────────────────────────────────────────────── */
const HowItWorks = () => {
  return (
    <section className="border-t border-white/10 bg-[#090D14]/70 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-400">
              End-to-End Execution
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl text-slate-100">
              From question to insight.
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-sm leading-relaxed text-slate-400">
              The query engine bridges natural language ambiguity and strict database schemas in three steps.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-emerald-400">01</span>
                <Database className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-100">Connect your data</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-teal-400">02</span>
                <Sparkles className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-100">Ask naturally</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Write it the way you speak. Resolve any clarification the engine raises in the same conversation.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400">03</span>
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-100">Understand your data</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Resolve ambiguity and receive structured, traceable answers with full provenance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Security Section ──────────────────────────────────────────────────── */
const SecuritySection = () => {
  return (
    <section id="security" className="border-t border-white/10 bg-[#080A0F] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Narrative */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300">
                <Lock className="h-3 w-3" />
                Security Model
              </span>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] sm:text-4xl text-slate-100 leading-tight">
                Read-only is a policy, not a prompt
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Model output is never trusted with execution. Every plan is checked
                against schema metadata and an independent validation layer that rejects
                writes, administrative statements and unsafe operators.
              </p>

              <div className="mt-6 space-y-3 font-mono text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Grammar AST AST-level validation denies mutating tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>SHA-256 hash-chained cryptographic ledger tracks every query</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Connection secrets encrypted at rest via Fernet AES-128-CBC</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  Create a workspace
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </Link>
              </div>
            </div>

            {/* Right Pipeline Cards */}
            <div className="space-y-3.5">
              <SecurityPipelineStep
                number="01"
                title="Validate plan"
                description="Rejected: writes, DDL, unsafe operators before execution."
                status="AST Verified"
              />
              <SecurityPipelineStep
                number="02"
                title="Execute read-only"
                description="Queries run against live databases with row-level caps and timeouts."
                status="Socket Sandboxed"
              />
              <SecurityPipelineStep
                number="03"
                title="Return results"
                description="With provenance, plan and source metadata chained into audit ledger."
                status="Cryptographically Signed"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SecurityPipelineStep = React.memo(
  ({
    number,
    title,
    description,
    status,
  }: {
    number: string;
    title: string;
    description: string;
    status: string;
  }) => {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-[#0C1017] p-5 hover:border-emerald-500/30 transition-all">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
          {number}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono text-emerald-300">
              {status}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>
    );
  }
);
SecurityPipelineStep.displayName = "SecurityPipelineStep";

/* ── FAQ Section ──────────────────────────────────────────────────────── */
const FaqSection = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      question: "How is this different from asking a chatbot to write SQL?",
      answer:
        "The assistant never sends raw model output to a database. A typed intermediate plan is validated against real, introspected schema metadata, compiled per dialect, and passed through a read-only policy layer before execution. If the request is underspecified, the engine asks instead of inventing a filter.",
    },
    {
      question: "Can a query modify or delete my data?",
      answer:
        "No. Write and administrative statements are rejected by the validation layer rather than trusted to the model. We still recommend connecting with a database user that only holds read privileges, so the boundary does not depend on application code alone.",
    },
    {
      question: "Does it really query across databases?",
      answer:
        "Yes, for the cases the engine can express explicitly. It runs bounded read-only subqueries per source and combines them in memory. Cross-source relationships are shown as inferred or user-defined, never as guaranteed foreign keys.",
    },
    {
      question: "What happens when the model is unavailable?",
      answer:
        "The pipeline fails visibly with a retryable error. It does not fall back to fabricated answers or silently execute a guessed plan.",
    },
    {
      question: "Can I use this with my existing BI tools?",
      answer:
        "Nexus exposes read-only query results that can be connected to downstream BI platforms. The data never leaves your environment, and queries are scoped to the connected databases' read privileges.",
    },
  ];

  return (
    <section id="faq" className="border-t border-white/10 bg-[#090D14]/70 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-slate-400">
              Technical Clarity
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl text-slate-100">
              Questions worth asking
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-xl border border-white/10 bg-[#0C1017] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium text-slate-200 hover:text-white transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-emerald-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-400 border-t border-white/5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Final CTA ──────────────────────────────────────────────────────────── */
const FinalCTA = () => {
  const { currentUser } = useShellStore();

  return (
    <section className="relative border-t border-white/10 bg-gradient-to-b from-[#080A0F] via-[#0D141F] to-[#080A0F] py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl text-slate-100">
            Your data is ready to talk.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            Connect your databases and ask your first question.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={currentUser ? "/chat" : "/register"}>
              <Button className="h-11 px-6 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                {currentUser ? "Open workspace" : "Get started"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="#product">
              <Button
                variant="outline"
                className="h-11 px-6 text-sm font-medium rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-slate-200 transition-all"
              >
                See how it works
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Footer ──────────────────────────────────────────────────────────────── */
const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#06080C] py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-zinc-950 text-xs font-bold">
              N
            </span>
            <span className="text-xs text-slate-300">
              Nexus Query — ambiguity-aware data access.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <Link href="#product" className="transition-colors hover:text-slate-100">
              Product
            </Link>
            <Link href="#security" className="transition-colors hover:text-slate-100">
              Security
            </Link>
            <Link href="/docs" className="transition-colors hover:text-slate-100">
              API docs
            </Link>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            © 2026 Nexus Query. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();

  React.useEffect(() => {
    const existing = localStorage.getItem("stored-user");
    if (existing) setCurrentUser(JSON.parse(existing));
  }, [setCurrentUser]);

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-white">
      <Navbar />
      <Hero />
      <DatabaseIntegration />
      <BentoGrid />
      <HowItWorks />
      <SecuritySection />
      <FaqSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
