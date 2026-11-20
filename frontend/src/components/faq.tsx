"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

export const FaqAccordion = React.memo(({ items, openFaq, setOpenFaq }: {
  items: FaqItem[];
  openFaq: number | null;
  setOpenFaq: (val: number | null) => void;
}) => {
  return (
    <div className="space-y-1 divide-y divide-border">
      {items.map((faq, index) => {
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
              <p
                className="mt-2 max-w-2xl pb-3 text-[12px] leading-relaxed text-muted-foreground"
              >
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

export const FaqSection = React.memo(() => {
  const faqs: FaqItem[] = [
    {
      question:
        "How is this different from asking a chatbot to write SQL?",
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

  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <FaqAccordion
      items={faqs}
      openFaq={openFaq}
      setOpenFaq={setOpenFaq}
    />
  );
});