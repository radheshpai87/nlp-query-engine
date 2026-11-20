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
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080A0F]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-zinc-950 text-xs font-bold">
            N
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Nexus Query
          </span>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-7 md:flex text-xs text-slate-400">
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

        {/* Right: Auth CTA */}
        <div className="hidden items-center gap-2.5 md:flex">
          {currentUser ? (
            <Link href="/chat">
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium"
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
                  className="h-8 px-3 text-xs border-white/10 text-slate-300 hover:text-white"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium"
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
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <MenuX className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#090D14] px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-2.5 text-xs text-slate-300">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex gap-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                  Sign in
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button size="sm" className="w-full h-8 text-xs bg-emerald-500 text-zinc-950">
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
    <section id="product" className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Ambiguity-aware, read-only querying</span>
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-[-0.03em] text-slate-100 leading-[1.1]">
            Your data.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              One conversation.
            </span>
          </h1>

          {/* Clean concise copy */}
          <p className="mt-4 mx-auto max-w-xl text-sm sm:text-base leading-relaxed text-slate-400">
            Ask questions across all your databases in plain English. Get precise,
            explainable answers without writing a single query. Your data, one
            conversation.
          </p>

          {/* CTA Row */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={currentUser ? "/chat" : "/register"}>
              <Button className="h-10 px-5 text-xs sm:text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm">
                {currentUser ? "Open workspace" : "Get started"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>

            <Link href="#capabilities">
              <Button
                variant="outline"
                className="h-10 px-5 text-xs sm:text-sm font-medium rounded-lg border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
              >
                See how it works
              </Button>
            </Link>
          </div>

          {/* Minimal trust indicator */}
          <p className="mt-6 text-xs text-slate-500 font-mono">
            PostgreSQL · MongoDB · Elasticsearch
          </p>
        </div>

        {/* Simple Product Preview */}
        <Preview />
      </div>
    </section>
  );
};

/* ── Database Integration ────────────────────────────────────────────────── */
const DatabaseIntegration = () => {
  return (
    <section className="border-t border-white/5 bg-[#090D14]/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
            One interface. Every data source.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Connect the databases you already run without migration or ETL.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">PostgreSQL</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Connected</span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
              Joins, constraints and foreign keys mapped automatically.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">MongoDB</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Connected</span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
              Collections and nested fields with inferred links.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">Elasticsearch</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Connected</span>
            </div>
            <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
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
    <section id="capabilities" className="border-t border-white/5 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
            Complex data. Simple conversations.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
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
    <section className="border-t border-white/5 bg-[#090D14]/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
            From question to insight.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <span className="text-xs font-mono font-medium text-emerald-400">01</span>
            <h3 className="mt-2 text-sm font-semibold text-slate-100">Connect your data</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <span className="text-xs font-mono font-medium text-teal-400">02</span>
            <h3 className="mt-2 text-sm font-semibold text-slate-100">Ask naturally</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Write it the way you speak. Resolve any clarification the engine raises in the same conversation.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1017] p-5">
            <span className="text-xs font-mono font-medium text-cyan-400">03</span>
            <h3 className="mt-2 text-sm font-semibold text-slate-100">Understand your data</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
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
    <section id="security" className="border-t border-white/5 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
              Read-only is a policy, not a prompt
            </h2>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-400">
              Model output is never trusted with execution. Every plan is checked
              against schema metadata and an independent validation layer that rejects
              writes, administrative statements and unsafe operators.
            </p>
            <div className="mt-5">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Create a workspace
                <ShieldCheck className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="rounded-lg border border-white/10 bg-[#0C1017] p-3.5">
              <h3 className="text-xs font-semibold text-slate-100">Validate plan</h3>
              <p className="mt-0.5 text-xs text-slate-400">Rejected: writes, DDL, unsafe operators.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0C1017] p-3.5">
              <h3 className="text-xs font-semibold text-slate-100">Execute read-only</h3>
              <p className="mt-0.5 text-xs text-slate-400">Queries run against live databases with row-level caps.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0C1017] p-3.5">
              <h3 className="text-xs font-semibold text-slate-100">Return results</h3>
              <p className="mt-0.5 text-xs text-slate-400">With provenance, plan and source metadata.</p>
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
    <section id="faq" className="border-t border-white/5 bg-[#090D14]/50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-center text-slate-100 mb-8">
          Questions worth asking
        </h2>

        <div className="space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.question}
                className="rounded-lg border border-white/10 bg-[#0C1017] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-medium text-slate-200 hover:text-white"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-white/5">
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
    <section className="border-t border-white/5 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100">
          Your data is ready to talk.
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Connect your databases and ask your first question.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href={currentUser ? "/chat" : "/register"}>
            <Button className="h-10 px-5 text-xs sm:text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              {currentUser ? "Open workspace" : "Get started"}
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
    <footer className="border-t border-white/5 bg-[#06080C] py-8">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-zinc-950 text-[10px] font-bold">
            N
          </span>
          <span>Nexus Query — ambiguity-aware data access.</span>
        </div>

        <div className="flex gap-4">
          <Link href="#product" className="hover:text-white">Product</Link>
          <Link href="#security" className="hover:text-white">Security</Link>
          <Link href="/docs" className="hover:text-white">API docs</Link>
        </div>

        <div className="text-[10px] text-slate-500">© 2026 Nexus Query.</div>
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
    <div className="min-h-screen bg-[#080A0F] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-white">
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
