import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage Component", () => {
  it("renders the primary value proposition", () => {
    render(<HomePage />);
  });

  it("explains the supported data sources and security model", () => {
    render(<HomePage />);

    expect(screen.getByText("One interface. Every data source.")).toBeInTheDocument();
    expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MongoDB").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Elasticsearch").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Read-only is a policy, not a prompt/i)).toBeInTheDocument();
  });

  it("shows the product capabilities grid", () => {
    render(<HomePage />);

    expect(screen.getByText("Complex data. Simple conversations.")).toBeInTheDocument();
    expect(screen.getByText("Natural Language Queries")).toBeInTheDocument();
    expect(screen.getByText("Ambiguity Resolution")).toBeInTheDocument();
    expect(screen.getByText("Unified Schema Explorer")).toBeInTheDocument();
    expect(screen.getByText("Evidence-backed Answers")).toBeInTheDocument();
    expect(screen.getByText("Multi-database Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Read-only Security")).toBeInTheDocument();
  });

  it("shows the how it works section", () => {
    render(<HomePage />);

    expect(screen.getByText("From question to insight.")).toBeInTheDocument();
    expect(screen.getByText("Connect your data")).toBeInTheDocument();
    expect(screen.getByText("Ask naturally")).toBeInTheDocument();
    expect(screen.getByText("Understand your data")).toBeInTheDocument();
  });

  it("shows the security section", () => {
    render(<HomePage />);

    expect(screen.getByText("Read-only is a policy, not a prompt")).toBeInTheDocument();
    expect(screen.getByText("Validate plan")).toBeInTheDocument();
    expect(screen.getByText("Execute read-only")).toBeInTheDocument();
    expect(screen.getByText("Return results")).toBeInTheDocument();
  });

  it("shows the FAQ section", () => {
    render(<HomePage />);

    expect(screen.getByText("Questions worth asking")).toBeInTheDocument();
    expect(screen.getByText("How is this different from asking a chatbot to write SQL?")).toBeInTheDocument();
  });

  it("shows the final CTA", () => {
    render(<HomePage />);

    expect(screen.getByText("Your data is ready to talk.")).toBeInTheDocument();
    expect(screen.getByText("Connect your databases and ask your first question.")).toBeInTheDocument();
  });

  it("shows the footer", () => {
    render(<HomePage />);

    expect(screen.getByText(/Nexus Query — ambiguity-aware data access./i)).toBeInTheDocument();
  });
});