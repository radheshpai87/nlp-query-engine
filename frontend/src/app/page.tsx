"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShellStore } from "@/lib/store";
import { X as MenuX, Menu, ChevronDown, ShieldCheck, Database, Layers, Zap } from "lucide-react";import { Preview } from "@/components/preview";
import { BentoGridContent } from "@/components/bento-grid";

/* feature sections data */
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
    <header
      className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* Left: brand */}
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground text-[10px] font-semibold"
          >
            N
          </span>
          <span className="text-[13px] font-medium tracking-tight">Nexus Query</span>
        </Link>

        {/* Centre: navigation */}
        <nav
          className="hidden items-center gap-8 md:flex text-[13px] text-muted-foreground"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: auth CTA */}
        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? (
            <Link href="/chat">
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
              >
                Open workspace
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs"
                >
                  Get started
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <MenuX className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-background px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {currentUser ? (
                <Link href="/chat">
                  <Button size="sm" className="w-full h-8 text-xs">Open workspace</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">Sign in</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="w-full h-8 text-xs">Get started</Button>
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
    <section
      className="hero-wash relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[10px] text-muted-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Ambiguity-aware, read-only querying
          </span>

          {/* Headline */}
          <h1
            className="mt-8 text-5xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-6xl lg:text-[72px]"
          >
            Your data.
            <br />
            One conversation.
          </h1>

          {/* Supporting copy */}
          <p className="mt-6 mx-auto max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Ask questions across all your databases in plain English. Get precise,
            explainable answers without writing a single query. Your data, one
            conversation.
          </p>

          {/* CTA row */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={currentUser ? "/chat" : "/register"}
              className="relative"
            >
              <Button
                className="h-10 w-full sm:w-auto gap-2 px-5 text-[13px] sm:w-auto"
              >
                {currentUser ? "Open workspace" : "Get started"}
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Button>
            </Link>

            <Link href="#product" className="relative">
              <Button
                variant="outline"
                className="h-10 w-full sm:w-auto gap-2 px-5 text-[13px] text-muted-foreground sm:w-auto"
              >
                See how it works
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <p className="mt-6 text-[11px] text-muted-foreground">
            PostgreSQL · MongoDB · Elasticsearch
          </p>
        </div>

        {/* Main visual: product preview */}
        <Preview />
      </div>
    </section>
  );
};

/* ── Database Integration Section ────────────────────────────────────────── */
const DatabaseIntegration = () => {
  return (
    <section
      className="border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2
              className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]"
            >
              One interface. Every data source.
            </h2>
            <p
              className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground"
            >
              Connect the databases you already run. Nexus introspects them and keeps
              the schema map current. No migration, no ETL — just direct access.
            </p>
          </div>

          <div className="grid gap-3 overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <DatabaseIntegrationCard
              kind="Relational"
              name="PostgreSQL"
              description="Joins, constraints and foreign keys mapped automatically"
            />
            <DatabaseIntegrationCard
              kind="Document"
              name="MongoDB"
              description="Collections and nested fields with inferred links"
            />
            <DatabaseIntegrationCard
              kind="Search"
              name="Elasticsearch"
              description="Index mappings and full-text fields queried with read-only DSL"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ── Database card ──────────────────────────────────────────────────────── */
const DatabaseIntegrationCard = React.memo(({ kind, name, description }: { kind: string; name: string; description: string }) => {
  const [isConnected, setIsConnected] = React.useState(false);

  return (
    <div
      className="bg-card p-6 rounded-xl border border-border group:hover:border-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-5 rounded-md flex items-center justify-center bg-muted/50">
          {kind === "Relational" && <Database />}
          {kind === "Document" && <Layers />}
          {kind === "Search" && <Zap />}
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
        >
          {kind}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-medium">{name}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-accent" : "bg-muted"} inline-block`}
        />
        <span className="text-[10px] text-muted-foreground connected">
          {"Connected"}
        </span>
      </div>
    </div>
  );
});

/* ── Bento Grid ──────────────────────────────────────────────────────────── */
const BentoGrid = () => {
  return (
    <section
      id="capabilities"
      className="border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2
              className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]"
            >
              Complex data. Simple conversations.
            </h2>
            <p
              className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
            >
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

/* ── How It Works ──────────────────────────────────────────────────────── */
const HowItWorks = () => {
  return (
    <section
      className="border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2
              className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]"
            >
              From question to insight.
            </h2>
          </div>

          <HowItSteps />
        </div>
      </div>
    </section>
  );
};

const HowItSteps = React.memo(() => {
  return (
    <div className="grid gap-10 sm:grid-cols-3 md:grid-cols-3">
      <StepCard number="01" title="Connect your data" body="Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving." />
      <StepCard number="02" title="Ask naturally" body="Write it the way you speak. Resolve any clarification the engine raises in the same conversation." />
      <StepCard number="03" title="Understand your data" body="Resolve ambiguity and receive structured, traceable answers with full provenance." />
    </div>
  );
});

const StepCard = React.memo(({ number, title, body }: { number: string; title: string; body: string }) => {
  return (
    <div className="border-t border-border pt-6 text-center">
      <span className="text-[11px] tabular-nums font-medium text-muted-foreground">{number}</span>

      <h3 className="mt-2 text-[14px] font-medium tracking-[-0.01em]">{title}</h3>

      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
});

/* ── Security Section ──────────────────────────────────────────────────── */
const SecuritySection = () => {
  return (
    <section
      id="security"
      className="border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <SecurityContent />
            <SecurityVisual />
          </div>
        </div>
      </div>
    </section>
  );
};

const SecurityContent = React.memo(() => {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">Security model</span>

      <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px] mb-4">Read-only is a policy, not a prompt</h2>

      <p className="mb-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Model output is never trusted with execution. Every plan is checked
        against schema metadata and an independent validation layer that rejects
        writes, administrative statements and unsafe operators.
      </p>

      <div className="flex gap-2">
        <a
          href="/register"
          className="inline-flex items-center gap-1.5 text-[13px] text-foreground transition-opacity hover:opacity-70"
        >
          Create a workspace
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 me-2" />
        </a>
      </div>
    </div>
  );
});

const SecurityVisual = React.memo(() => {
  return (
    <div className="space-y-4">
      <SecurityPipelineStep title="Validate plan" description="Rejected: writes, DDL, unsafe operators" />
      <SecurityPipelineStep title="Execute read-only" description="Queries run against live databases with row-level caps" />
      <SecurityPipelineStep title="Return results" description="With provenance, plan and source metadata" />
    </div>
  );
});

const SecurityPipelineStep = React.memo(({ title, description }: { title: string; description: string }) => {
  return (
    <div className="flex items-start gap-4 bg-card p-6 rounded-xl border border-border max-w-sm">
      <div className="h-8 w-8 rounded-md flex-shrink-0 flex items-center justify-center bg-muted/50">
        <ShieldCheck className="h-4 w-4 text-accent" />
      </div>

      <div className="flex-1">
        <h3 className="text-[13px] font-medium tracking-[-0.01em] mb-1">{title}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
});

/* ── FAQ Section ──────────────────────────────────────────────────────── */
const FaqSection = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <section
      id="faq"
      className="border-t border-border bg-card/50"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">Questions worth asking</h2>
          </div>

          <FaqAccordion openFaq={openFaq} setOpenFaq={setOpenFaq} />
        </div>
      </div>
    </section>
  );
};

const FaqAccordion = React.memo(({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: React.Dispatch<React.SetStateAction<number | null>> }) => {
  const faqs = [
    {
      question: "How is this different from asking a chatbot to write SQL?",
      answer: "The assistant never sends raw model output to a database. A typed intermediate plan is validated against real, introspected schema metadata, compiled per dialect, and passed through a read-only policy layer before execution. If the request is underspecified, the engine asks instead of inventing a filter.",
    },
    {
      question: "Can a query modify or delete my data?",
      answer: "No. Write and administrative statements are rejected by the validation layer rather than trusted to the model. We still recommend connecting with a database user that only holds read privileges, so the boundary does not depend on application code alone.",
    },
    {
      question: "Does it really query across databases?",
      answer: "Yes, for the cases the engine can express explicitly. It runs bounded read-only subqueries per source and combines them in memory. Cross-source relationships are shown as inferred or user-defined, never as guaranteed foreign keys.",
    },
    {
      question: "What happens when the model is unavailable?",
      answer: "The pipeline fails visibly with a retryable error. It does not fall back to fabricated answers or silently execute a guessed plan.",
    },
    {
      question: "Can I use this with my existing BI tools?",
      answer: "Nexus exposes read-only query results that can be connected to downstream BI platforms. The data never leaves your environment, and queries are scoped to the connected databases' read privileges.",
    },
  ];

  return (
    <div className="space-y-1 divide-y divide-border">
      {faqs.map((faq, index) => {
        const isOpen = openFaq === index;
        return (
          <div key={faq.question} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpenFaq(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-3 text-left text-[13px] font-medium transition-colors hover:text-muted-foreground"
            >
              <span>{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <p className="mt-2 max-w-2xl pb-3 text-[12px] leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

/* ── Final CTA ──────────────────────────────────────────────────────────── */
const FinalCTA = () => {
  const { currentUser } = useShellStore();

  return (
    <section
      className="border-t border-border bg-gradient-to-b from-black via-black/80 to-black/95"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-[22px] font-medium tracking-[-0.02em]">Your data is ready to talk.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Connect your databases and ask your first question.</p>
        </div>

        <div className="flex gap-3">
          <Link href={currentUser ? "/chat" : "/register"} className="relative">
            <Button className="h-10 gap-2 px-5 text-[13px] sm:w-auto">
              {currentUser ? "Open workspace" : "Get started"}
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Button>
          </Link>

          <Link href="#product" className="relative">
            <Button variant="outline" className="h-10 gap-2 px-5 text-[13px] text-muted-foreground sm:w-auto">See how it works</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ── Footer ──────────────────────────────────────────────────────────────── */
const Footer = () => {
  return (
    <footer className="border-t border-border pt-12">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-accent-foreground text-[9px] font-semibold">N</span>
            <span className="text-[12px]">Nexus Query — ambiguity-aware data access.</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="#product" className="transition-colors hover:text-foreground text-[12px]">Product</Link>
            <Link href="#security" className="transition-colors hover:text-foreground text-[12px]">Security</Link>
            <Link href="/docs" className="transition-colors hover:text-foreground text-[12px]">API docs</Link>
          </div>

          <div className="text-[10px] text-muted-foreground">© 2026 Nexus Query. All rights reserved.</div>
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
    <div className="min-h-screen bg-background text-foreground antialiased">
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