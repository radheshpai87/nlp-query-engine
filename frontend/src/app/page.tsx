"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShellStore } from "@/lib/store";
import { getStoredToken, getStoredUser } from "@/lib/auth-api";
import {
  X as MenuX,
  Menu,
  ChevronDown,
  ShieldCheck,
  Database,
  Layers,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Preview } from "@/components/preview";
import { BentoGridContent } from "@/components/bento-grid";
import { NexusLogo } from "@/components/ui/nexus-logo";

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
    if (typeof window !== "undefined") {
      localStorage.removeItem("stored-user");
      const token = getStoredToken();
      const user = getStoredUser();
      if (!token || !user) {
        if (useShellStore.getState().currentUser) {
          setCurrentUser(null);
        }
      } else if (!useShellStore.getState().currentUser) {
        setCurrentUser(user);
      }
    }
  }, [setCurrentUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080A0E]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <NexusLogo size={28} className="group-hover:scale-105 transition-transform" />
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Nexus Query
          </span>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-8 md:flex text-xs font-medium text-slate-400">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-amber-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Auth CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {currentUser ? (
            <Link href="/chat">
              <Button
                size="sm"
                className="h-9 gap-1.5 px-4 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              >
                Launch App
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 text-xs border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-9 gap-1.5 px-4 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
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
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <MenuX className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#090D14] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-slate-300">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-amber-300"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 flex gap-3">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full h-9 text-xs border-white/10">
                  Sign in
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button size="sm" className="w-full h-9 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
                  Get started
                </Button>
              </Link>
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
    <section id="product" className="hero-wash relative overflow-hidden pt-24 pb-24 sm:pt-32 sm:pb-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.12)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Ambiguity-aware, read-only querying</span>
          </div>

          {/* Headline */}
          <h1 className="mt-8 text-4xl sm:text-6xl font-semibold tracking-[-0.035em] text-slate-100 leading-[1.12]">
            Your data.
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              One conversation.
            </span>
          </h1>

          {/* Clean concise copy */}
          <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
            Ask questions across all your databases in plain English. Get precise,
            explainable answers without writing a single query. Your data, one
            conversation.
          </p>

          {/* CTA Row */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={currentUser ? "/chat" : "/register"}>
              <Button className="h-11 px-6 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0">
                {currentUser ? "Launch App" : "Get started"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>

            <Link href="#capabilities">
              <Button
                variant="outline"
                className="h-11 px-6 text-sm font-medium rounded-lg border-white/10 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
              >
                See how it works
              </Button>
            </Link>
          </div>

          {/* Minimal trust indicator */}
          <p className="mt-8 text-xs text-slate-500 font-mono">
            PostgreSQL · MongoDB · Elasticsearch
          </p>
        </div>

        {/* Product Preview */}
        <Preview />
      </div>
    </section>
  );
};

/* ── Unstop-Style Metrics Showcase ───────────────────────────────────────── */
const UnstopMetricsShowcase = () => {
  return (
    <section className="relative border-y border-white/5 bg-[#0A0E17]/80 backdrop-blur-md py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Header ticker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Live Engine Telemetry & Benchmarks
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300">
              Zero Silent Assumptions
            </span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="hidden sm:inline">SHA-256 Merkle Ledger</span>
          </div>
        </div>

        {/* 4 High-Impact Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#101622] to-[#0A0E17] p-6 transition-all hover:border-amber-500/50 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span>AST Precision</span>
              <span className="text-amber-400 text-xs font-mono">Guaranteed</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                99.8
              </span>
              <span className="text-2xl font-bold text-amber-400">%</span>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Every SQL statement passes abstract syntax tree verification before touching data.
            </p>
          </div>

          <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#101622] to-[#0A0E17] p-6 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Planning Latency</span>
              <span className="text-emerald-400 text-xs font-mono">Real-time</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                &lt;45
              </span>
              <span className="text-lg font-bold text-emerald-400 font-mono">ms</span>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Sub-second response parsing, intent validation, and federated query generation.
            </p>
          </div>

          <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#101622] to-[#0A0E17] p-6 transition-all hover:border-blue-500/50 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Multi-Table Links</span>
              <span className="text-blue-400 text-xs font-mono">Healthcare DB</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                10+
              </span>
              <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider ml-1">Tables</span>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Patients, admissions, diagnoses, appointments, and procedures linked in one view.
            </p>
          </div>

          <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#101622] to-[#0A0E17] p-6 transition-all hover:border-rose-500/50 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.2)]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Read-Only Guard</span>
              <span className="text-rose-400 text-xs font-mono">Zero Mutations</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                100
              </span>
              <span className="text-2xl font-bold text-rose-400">%</span>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Destructive mutations (DROP, DELETE, UPDATE) are blocked at the engine core.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Database Integration ────────────────────────────────────────────────── */
const DatabaseIntegration = () => {
  return (
    <section className="border-t border-white/5 bg-[#090D14]/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
            One interface. Every data source.
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
            Connect the databases you already run without migration or ETL.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-100">PostgreSQL</h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-medium">Connected</span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Joins, constraints and foreign keys mapped automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-100">MongoDB</h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-medium">Connected</span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Collections and nested fields with inferred links.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7 transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4.5 w-4.5 text-amber-400" />
                <h3 className="text-base font-semibold text-slate-100">Elasticsearch</h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-medium">Connected</span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Index mappings and full-text fields queried with read-only DSL.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Capabilities Bento Grid ─────────────────────────────────────────────── */
const BentoGrid = () => {
  return (
    <section id="capabilities" className="border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
            Complex data. Simple conversations.
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
            Features built for how humans ask and how databases work.
          </p>
        </div>

        <BentoGridContent />
      </div>
    </section>
  );
};

/* ── How It Works ────────────────────────────────────────────────────────── */
const HowItWorks = () => {
  return (
    <section className="border-t border-white/5 bg-[#090D14]/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
            From question to insight.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7">
            <span className="text-xs font-mono font-semibold text-amber-400">01</span>
            <h3 className="mt-3 text-base font-semibold text-slate-100">Connect your data</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7">
            <span className="text-xs font-mono font-semibold text-amber-400">02</span>
            <h3 className="mt-3 text-base font-semibold text-slate-100">Ask naturally</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Write it the way you speak. Resolve any clarification the engine raises in the same conversation.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-7">
            <span className="text-xs font-mono font-semibold text-amber-400">03</span>
            <h3 className="mt-3 text-base font-semibold text-slate-100">Understand your data</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Resolve ambiguity and receive structured, traceable answers with full provenance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Security ──────────────────────────────────────────────────────────── */
const SecuritySection = () => {
  return (
    <section id="security" className="border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 leading-tight">
              Read-only is a policy, not a prompt
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Model output is never trusted with execution. Every plan is checked
              against schema metadata and an independent validation layer that rejects
              writes, administrative statements and unsafe operators.
            </p>
            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                Connect your database
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="rounded-xl border border-white/10 bg-[#0C1017] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Validate plan</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">Rejected: writes, DDL, unsafe operators.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0C1017] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Execute read-only</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">Queries run against live databases with row-level caps.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0C1017] p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Return results</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">With provenance, plan and source metadata.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── FAQ ───────────────────────────────────────────────────────────────── */
const FaqSection = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      question: "How is this different from asking a chatbot to write SQL?",
      answer:
        "The assistant never sends raw model output to a database. A typed intermediate plan is validated against real schema metadata, compiled per dialect, and passed through a read-only policy layer.",
    },
    {
      question: "Can a query modify or delete my data?",
      answer:
        "No. Write and administrative statements are rejected by the validation layer rather than trusted to the model.",
    },
    {
      question: "Does it really query across databases?",
      answer:
        "Yes. The engine executes bounded read-only subqueries per source and combines them in memory.",
    },
    {
      question: "What happens when the model is unavailable?",
      answer:
        "The pipeline fails visibly with a retryable error without fabricating answers.",
    },
    {
      question: "Can I use this with my existing BI tools?",
      answer:
        "Nexus exposes read-only query results that can be connected to downstream reporting tools.",
    },
  ];

  return (
    <section id="faq" className="border-t border-white/5 bg-[#090D14]/50 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        {/* Generous spacing above cards */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
            Questions worth asking
          </h2>
        </div>

        {/* Spacious FAQ Cards */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.question}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-amber-500/30 bg-[#0C1017] shadow-[0_0_20px_-5px_rgba(245,158,11,0.08)]"
                    : "border-white/10 bg-[#0C1017] hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left text-sm sm:text-base font-medium text-slate-200 hover:text-white transition-colors"
                >
                  <span className={isOpen ? "text-amber-200 font-semibold" : ""}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-amber-400" : "text-slate-400"
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pt-3 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ── Final CTA ──────────────────────────────────────────────────────────── */
const FinalCTA = () => {
  const { currentUser } = useShellStore();

  return (
    <section className="border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
          Your data is ready to talk.
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Connect your databases and ask your first question.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href={currentUser ? "/chat" : "/register"}>
            <Button className="h-11 px-6 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_24px_rgba(245,158,11,0.35)]">
              {currentUser ? "Launch App" : "Get started"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ── Footer ──────────────────────────────────────────────────────────────── */
const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-[#06080C] py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <NexusLogo size={20} />
          <span>Nexus Query — ambiguity-aware data access.</span>
        </div>

        <div className="flex gap-6">
          <Link href="#product" className="hover:text-amber-300 transition-colors">Product</Link>
          <Link href="#security" className="hover:text-amber-300 transition-colors">Security</Link>
          <Link href="/docs" className="hover:text-amber-300 transition-colors">API docs</Link>
        </div>

        <div className="text-[11px] font-mono text-slate-500">© 2026 Nexus Query.</div>
      </div>
    </footer>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stored-user");
      const token = getStoredToken();
      const user = getStoredUser();
      if (!token || !user) {
        if (useShellStore.getState().currentUser) {
          setCurrentUser(null);
        }
      } else if (!useShellStore.getState().currentUser) {
        setCurrentUser(user);
      }
    }
  }, [setCurrentUser]);

  return (
    <div className="min-h-screen bg-[#080A0E] text-slate-100 antialiased selection:bg-amber-500/20 selection:text-white">
      <Navbar />
      <Hero />
      <UnstopMetricsShowcase />
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
