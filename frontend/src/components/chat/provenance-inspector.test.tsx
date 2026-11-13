import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProvenanceInspector } from "./provenance-inspector";
import { ExecutionResult } from "@/lib/execution-api";
import { CompilationResult } from "@/lib/query-plan-api";

describe("ProvenanceInspector Component", () => {
  const mockExecutionResult: ExecutionResult = {
    execution_id: "exec_provenance_99",
    workspace_id: "ws-demo",
    columns: [
      { name: "id", data_type: "integer" },
      { name: "product_name", data_type: "varchar" },
      { name: "total_revenue", data_type: "numeric" },
    ],
    rows: [{ id: 1, product_name: "UltraBook", total_revenue: 1548.99 }],
    row_count: 1,
    duration_ms: 45,
    is_truncated: false,
    status: "success",
    sources_involved: ["postgres-target", "mongo-target"],
    generated_queries: {
      "postgres-target": "SELECT id, product_name FROM products",
      "mongo-target": "db.reviews.aggregate([{$match: {rating: 5}}])",
    },
  };

  const mockCompilation: CompilationResult = {
    workspace_id: "ws-demo",
    is_cross_database: true,
    summary: "Federated query spanning PostgreSQL and MongoDB with hash join",
  };

  const mockResolvedContext = {
    high_value_threshold: 1000,
    time_window: "last_30_days",
  };

  it("renders collapsed trigger button with latency and safety badge", () => {
    render(
      <ProvenanceInspector
        naturalQuery="Show top revenue products"
        executionResult={mockExecutionResult}
        compilation={mockCompilation}
        resolvedContext={mockResolvedContext}
      />
    );

    expect(screen.getByText("How did you get this result?")).toBeInTheDocument();
    expect(screen.getByText("45ms")).toBeInTheDocument();
    expect(screen.getByText("Read-Only Verified")).toBeInTheDocument();
  });

  it("expands on click and navigates across inspection tabs", () => {
    render(
      <ProvenanceInspector
        naturalQuery="Show top revenue products"
        executionResult={mockExecutionResult}
        compilation={mockCompilation}
        resolvedContext={mockResolvedContext}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("How did you get this result?"));

    // Pipeline tab active by default
    expect(screen.getByText("Execution Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Schema Grounding & Intent Mapping")).toBeInTheDocument();
    expect(screen.getByText("Safe Read-Only Pushdown & Execution")).toBeInTheDocument();

    // Switch to Grounded Schema tab
    fireEvent.click(screen.getByText("Grounded Schema"));
    expect(screen.getByText("postgres-target")).toBeInTheDocument();
    expect(screen.getByText("mongo-target")).toBeInTheDocument();

    // Switch to Ambiguity Resolutions tab
    fireEvent.click(screen.getByText("Ambiguity Resolutions"));
    expect(screen.getByText("high_value_threshold")).toBeInTheDocument();
    expect(screen.getByText("time_window")).toBeInTheDocument();

    // Switch to Executed Dialects tab
    fireEvent.click(screen.getByText("Executed Dialects"));
    expect(screen.getByText("Compilation Summary:")).toBeInTheDocument();
    expect(screen.getByText(/SELECT id, product_name FROM products/)).toBeInTheDocument();

    // Switch to Plan IR tab
    fireEvent.click(screen.getByText("Plan IR"));
    expect(screen.getByText(/exec_provenance_99/)).toBeInTheDocument();
  });

  it("handles copy provenance report to clipboard", () => {
    const clipboardSpy = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });

    render(
      <ProvenanceInspector
        naturalQuery="Show top revenue products"
        executionResult={mockExecutionResult}
        compilation={mockCompilation}
        resolvedContext={mockResolvedContext}
      />
    );

    fireEvent.click(screen.getByText("How did you get this result?"));
    fireEvent.click(screen.getByText("Copy Provenance"));

    expect(clipboardSpy).toHaveBeenCalled();
    expect(screen.getByText("Copied Report")).toBeInTheDocument();
  });
});
