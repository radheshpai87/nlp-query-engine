"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

export const SecuritySection = React.memo(() => {
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
});

const SecurityContent = React.memo(() => {
  return (
    <div>
      <span
        className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3"
      >
        Security model
      </span>

      <h2
        className="text-[22px] font-medium tracking-[-0.02em] sm:text-[28px] mb-4"
      >
        Read-only is a policy, not a prompt
      </h2>

      <p
        className="mb-6 max-w-lg text-sm leading-relaxed text-muted-foreground"
      >
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
      <SecurityPipelineStep
        title="Validate plan"
        description="Rejected: writes, DDL, unsafe operators"
      />
      <SecurityPipelineStep
        title="Execute read-only"
        description="Queries run against live databases with row-level caps"
      />
      <SecurityPipelineStep
        title="Return results"
        description="With provenance, plan and source metadata"
      />
    </div>
  );
});

interface SecurityPipelineStepProps {
  title: string;
  description: string;
}

const SecurityPipelineStep = React.memo<SecurityPipelineStepProps>(({ title, description }) => {
  return (
    <div
      className="flex items-start gap-4 bg-card p-6 rounded-xl border border-border max-w-sm"
    >
      <div className="h-8 w-8 rounded-md flex-shrink-0 flex items-center justify-center bg-muted/50">
        <ShieldCheck className="h-4 w-4 text-accent" />
      </div>

      <div className="flex-1">
        <h3 className="text-[13px] font-medium tracking-[-0.01em] mb-1">{title}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
});