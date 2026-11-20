import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage Component", () => {
  it("renders the primary value proposition", () => {
    render(<HomePage />);

    expect(screen.getByText(/Ask your data a question/i)).toBeInTheDocument();
    expect(screen.getByText(/Get an answer you can trust/i)).toBeInTheDocument();
    expect(screen.getAllByText("Nexus Query").length).toBeGreaterThanOrEqual(1);
  });

  it("explains the supported data sources and security model", () => {
    render(<HomePage />);

    expect(screen.getByText("One question, every store")).toBeInTheDocument();
    expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MongoDB").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Elasticsearch").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Read-only is a policy, not a prompt/i)).toBeInTheDocument();
  });

  it("shows the example query inside the product preview", () => {
    render(<HomePage />);

    expect(
      screen.getByText(/Show me high-value customers who bought electronics recently/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Illustrative interface/i)).toBeInTheDocument();
  });
});
