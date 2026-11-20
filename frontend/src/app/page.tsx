"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Database,
  Layers,
  LockKeyhole,
  Menu,
  Network,
  Search,
  ShieldCheck,
  Sparkle,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth-api";
import { useShellStore } from "@/lib/store";

const SOURCES = [
  {
    name: "PostgreSQL",
    kind: "Relational",
    description: "Joins, constraints and foreign keys mapped automatically.",
    icon: Database,
  },
  {
    name: "MongoDB",
    kind: "Document",
    description: "Collections and nested fields, with inferred links labelled honestly.",
    icon: Layers,
  },
  {
    name: "Elasticsearch",
    kind: "Search",
    description: "Index mappings and full-text fields, queried with read-only DSL.",
    icon: Zap,
  },
];

const FEATURES = [
  {
    icon: Search,
    title: "Ask in plain language",
    body: "No SQL, no JSON, no knowledge of table names required. Ask the question the way you would ask a colleague.",
  },
  {
    icon: Sparkle,
    title: "Clarify before guessing",
    body: "Vague thresholds, loose date ranges and competing columns are surfaced as a short, answerable question.",
  },
  {
    icon: Network,
    title: "See the whole schema",
    body: "An infinite canvas maps every connected database, table and relationship in one navigable view.",
  },
  {
    icon: ShieldCheck,
    title: "Read-only by construction",
    body: "Generated queries are parsed and validated against a read-only policy before a connection is ever touched.",
  },
  {
    icon: Layers,
    title: "Provenance on every answer",
    body: "Each result shows the sources, fields, filters and plan behind it — so the number can be defended.",
  },
  {
    icon: LockKeyhole,
    title: "Credentials stay server-side",
    body: "Connection secrets are encrypted at rest and never returned to the browser after they are saved.",
  },
];

const FAQS = [
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
];

function Preview() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]">
        {/* Window chrome */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-background/60 px-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
          </div>
          <span className="text-[11px] text-muted-foreground">Nexus Query · New conversation</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            <LockKeyhole className="h-2.5 w-2.5" />
            Read-only
          </span>
        </div>

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[190px_1fr]">
          {/* App rail */}
          <div className="hidden flex-col gap-5 border-r border-border bg-sidebar p-3 md:flex">
            <div className="flex items-center gap-2 px-1.5 py-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background">
                N
              </span>
              <span className="text-xs font-medium">Nexus</span>
            </div>
            <div className="space-y-0.5">
              {["Assistant", "Schema", "Connections"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] ${
                    index === 0
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-auto space-y-1.5">
              <p className="px-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Sources
              </p>
              {["Production PG", "Events", "Search"].map((source) => (
                <div
                  key={source}
                  className="flex items-center justify-between px-2 text-[10px] text-muted-foreground"
                >
                  <span className="truncate">{source}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                </div>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex justify-end">
              <p className="max-w-md rounded-2xl rounded-tr-sm bg-secondary px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
                Show me high-value customers who bought electronics recently.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background text-[9px] font-semibold">
                  N
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">Nexus</span>
              </div>
              <p className="max-w-lg text-[13px] leading-relaxed text-foreground/90">
                Before I run this, two values need a definition. High-value and recently
                are not specified in your schema.
              </p>

              <div className="max-w-lg rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-[11px] font-medium">Define high-value</span>
                  <span className="text-[10px] text-muted-foreground">1 of 2</span>
                </div>
                <div className="space-y-1.5 p-3">
                  {["Lifetime spend above $1,000", "Single order above $1,000", "Top 10% of spend"].map(
                    (option, index) => (
                      <div
                        key={option}
                        className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${
                          index === 0
                            ? "border-brand/40 bg-brand-muted text-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full border ${
                            index === 0 ? "border-brand bg-brand" : "border-border"
                          }`}
                        />
                        {option}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Result preview */}
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground">
                  <span>Result preview · customers</span>
                  <span>Read-only</span>
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead className="border-y border-border bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Customer</th>
                      <th className="px-3 py-1.5 font-medium">Spend</th>
                      <th className="hidden px-3 py-1.5 font-medium sm:table-cell">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {[
                      ["A. Sharma", "$4,250", "PostgreSQL"],
                      ["M. Okafor", "$3,100", "PostgreSQL"],
                      ["L. Chen", "$2,890", "PostgreSQL"],
                    ].map(([name, spend, source]) => (
                      <tr key={name}>
                        <td className="px-3 py-1.5 text-foreground/90">{name}</td>
                        <td className="px-3 py-1.5 tabular-nums text-foreground/90">{spend}</td>
                        <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">
                          {source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Illustrative interface. Figures are example data, not results from your databases.
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { currentUser, setCurrentUser } = useShellStore();
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, [setCurrentUser]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background">
              N
            </span>
            <span className="text-[13px] font-medium tracking-tight">Nexus Query</span>
          </Link>

          <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
            <a href="#product" className="transition-colors hover:text-foreground">
              Product
            </a>
            <a href="#sources" className="transition-colors hover:text-foreground">
              Sources
            </a>
            <a href="#security" className="transition-colors hover:text-foreground">
              Security
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {currentUser ? (
              <Link href="/chat">
                <Button size="sm" className="h-8 gap-1.5 px-3 text-xs">
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="h-8 gap-1.5 px-3 text-xs">
                    Get started
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-4 border-t border-border px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a href="#product" onClick={() => setMobileMenuOpen(false)}>
                Product
              </a>
              <a href="#sources" onClick={() => setMobileMenuOpen(false)}>
                Sources
              </a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)}>
                Security
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
            </div>
            <div className="flex gap-2 pt-1">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button size="sm" className="w-full">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-wash relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-6 sm:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Ambiguity-aware, read-only querying
              </span>

              <h1 className="mt-6 text-4xl font-medium leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-[64px]">
                Ask your data a question.
                <br />
                <span className="text-muted-foreground">Get an answer you can trust.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                Nexus turns plain English into validated, read-only queries across
                PostgreSQL, MongoDB and Elasticsearch — and asks before it assumes.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link href={currentUser ? "/chat" : "/register"} className="w-full sm:w-auto">
                  <Button className="h-9 w-full gap-2 px-4 text-[13px] sm:w-auto">
                    {currentUser ? "Open workspace" : "Start querying"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <a href="#product" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-9 w-full px-4 text-[13px] text-muted-foreground sm:w-auto"
                  >
                    See how it works
                  </Button>
                </a>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground">
                No pipelines to build. No schema exports. Read-only by default.
              </p>
            </div>

            <Preview />
          </div>
        </section>

        {/* Sources */}
        <section id="sources" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-[22px] font-medium tracking-[-0.02em]">
                  One question, every store
                </h2>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Connect the databases you already run. Nexus introspects them and keeps
                  the schema map current.
                </p>
              </div>
              <Link
                href="/connections"
                className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Manage connections
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              {SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <div key={source.name} className="bg-card p-5">
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {source.kind}
                      </span>
                    </div>
                    <h3 className="mt-6 text-sm font-medium">{source.name}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">
                Built for questions that don&apos;t fit a dashboard
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A query engine that shows its work: what it understood, which schema it
                used, and where every number came from.
              </p>
            </div>

            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-[13px] font-medium">{feature.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Two-up detail */}
            <div className="mt-14 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-6">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Clarification
                </span>
                <h3 className="mt-3 text-lg font-medium tracking-[-0.01em]">
                  &ldquo;Recently&rdquo; is not a date range
                </h3>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  When a request leaves a threshold, period or join path undefined, the
                  engine pauses the workflow and asks one targeted question. Your answer
                  is merged into the pending query, and the context survives a refresh.
                </p>

                <div className="mt-6 space-y-2">
                  {[
                    { label: "Last 30 days", active: true },
                    { label: "Last 90 days", active: false },
                    { label: "Calendar month to date", active: false },
                  ].map((option) => (
                    <div
                      key={option.label}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-[12px] ${
                        option.active
                          ? "border-brand/40 bg-brand-muted"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <span>{option.label}</span>
                      {option.active && <span className="text-[10px] text-brand">Selected</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg border border-border bg-background p-6">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Schema explorer
                </span>
                <h3 className="mt-3 text-lg font-medium tracking-[-0.01em]">
                  The data model, in one view
                </h3>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Pan, zoom and search an infinite canvas of databases, tables and
                  relationships. Foreign keys are distinguished from inferred or
                  user-defined links.
                </p>

                <div className="dot-grid relative mt-6 h-44 rounded-md border border-border">
                  <div className="absolute left-4 top-5 rounded border border-border bg-card px-2.5 py-1.5 text-[10px]">
                    customers
                  </div>
                  <div className="absolute right-4 top-12 rounded border border-border bg-card px-2.5 py-1.5 text-[10px]">
                    orders
                  </div>
                  <div className="absolute bottom-5 left-16 rounded border border-border bg-card px-2.5 py-1.5 text-[10px]">
                    order_items
                  </div>
                  <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <line x1="104" y1="45" x2="228" y2="76" stroke="var(--border)" strokeWidth="1" />
                    <line x1="228" y1="88" x2="130" y2="146" stroke="var(--border)" strokeWidth="1" />
                  </svg>
                  <div className="absolute bottom-3 right-4 rounded border border-brand/30 bg-brand-muted px-2 py-1 text-[9px] text-brand">
                    inferred
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">
              Three steps, no new pipeline
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Connect a source",
                  body: "Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving.",
                },
                {
                  step: "02",
                  title: "Ask a question",
                  body: "Write it the way you speak. Resolve any clarification the engine raises in the same conversation.",
                },
                {
                  step: "03",
                  title: "Review the answer",
                  body: "Inspect the table, the plan and its provenance. Reuse the query later from history or saved queries.",
                },
              ].map((item) => (
                <div key={item.step} className="border-t border-border pt-4">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-[13px] font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-t border-border bg-card/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
            <div>
              <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Security model
              </span>
              <h2 className="mt-3 text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">
                Read-only is a policy, not a prompt
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Model output is never trusted with execution. Every plan is checked
                against schema metadata and an independent validation layer that rejects
                writes, administrative statements and unsafe operators.
              </p>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-foreground transition-opacity hover:opacity-70"
              >
                Create a workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <ul className="space-y-3">
              {[
                ["Read-only execution", "Writes and DDL are denied before the database is contacted."],
                ["Encrypted secrets", "Passwords and API keys are encrypted at rest and never echoed back."],
                ["Bounded queries", "Timeouts, row limits and result caps apply to every source."],
                ["Traceable answers", "Plan, sources, filters and execution metadata are retained per query."],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-lg border border-border bg-background p-4"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-medium">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
            <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">
              Questions worth asking
            </h2>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-[13px] font-medium transition-colors hover:text-muted-foreground"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="max-w-2xl pb-5 text-[13px] leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:px-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[22px] font-medium tracking-[-0.02em]">
                Ready to ask your first question?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Create a workspace and connect a database in a couple of minutes.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline" className="h-9 px-4 text-[13px] text-muted-foreground">
                  Sign in
                </Button>
              </Link>
              <Link href={currentUser ? "/chat" : "/register"}>
                <Button className="h-9 gap-2 px-4 text-[13px]">
                  {currentUser ? "Open workspace" : "Get started"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-[9px] font-semibold text-background">
              N
            </span>
            <span>Nexus Query — ambiguity-aware data access.</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/connections" className="transition-colors hover:text-foreground">
              Connections
            </Link>
            <Link href="/schema" className="transition-colors hover:text-foreground">
              Schema
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              API docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
