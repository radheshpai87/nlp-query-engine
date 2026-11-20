"use client";

import * as React from "react";

export const HowItWorks = React.memo(() => {
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

          <div className="grid gap-10 sm:grid-cols-3 md:grid-cols-3">
            <div className="border-t border-border pt-6 text-center">
              <span className="text-[11px] tabular-nums font-medium text-muted-foreground">01</span>
              <h3 className="mt-2 text-[14px] font-medium tracking-[-0.01em]">Connect your data</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Add PostgreSQL, MongoDB or Elasticsearch. We test the connection and introspect the schema before saving.
              </p>
            </div>

            <div className="border-t border-border pt-6 text-center">
              <span className="text-[11px] tabular-nums font-medium text-muted-foreground">02</span>
              <h3 className="mt-2 text-[14px] font-medium tracking-[-0.01em]">Ask naturally</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Write it the way you speak. Resolve any clarification the engine raises in the same conversation.
              </p>
            </div>

            <div className="border-t border-border pt-6 text-center">
              <span className="text-[11px] tabular-nums font-medium text-muted-foreground">03</span>
              <h3 className="mt-2 text-[14px] font-medium tracking-[-0.01em]">Understand your data</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Resolve ambiguity and receive structured, traceable answers with full provenance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});