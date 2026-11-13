import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResultChart } from "./result-chart";
import { ExecutionResult } from "@/lib/execution-api";

describe("ResultChart Component", () => {
  const mockResult: ExecutionResult = {
    execution_id: "exec_12345",
    workspace_id: "ws-1",
    columns: [
      { name: "category", data_type: "varchar" },
      { name: "revenue", data_type: "numeric" },
    ],
    rows: [
      { category: "Electronics", revenue: 12000 },
      { category: "Furniture", revenue: 4500 },
      { category: "Apparel", revenue: 8300 },
    ],
    row_count: 3,
    duration_ms: 38,
    is_truncated: false,
    status: "success",
    sources_involved: ["postgres-target"],
    generated_queries: {
      "postgres-target": "SELECT category, SUM(revenue) FROM products GROUP BY category",
    },
  };

  it("renders chart KPI summary badges with formatted metrics", () => {
    render(<ResultChart result={mockResult} />);

    expect(screen.getByText("Total Sum")).toBeInTheDocument();
    expect(screen.getByText("24,800")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("Distinct Items")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("switches between Bar, Line, and Donut chart types", () => {
    const { container } = render(<ResultChart result={mockResult} />);

    // Default is Bar
    expect(screen.getByTitle("Bar Chart")).toBeInTheDocument();
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);

    // Switch to Line
    fireEvent.click(screen.getByTitle("Line Chart"));
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);

    // Switch to Donut
    fireEvent.click(screen.getByTitle("Donut Chart"));
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("renders fallback message when no numeric columns exist", () => {
    const textOnlyResult: ExecutionResult = {
      execution_id: "exec_text",
      workspace_id: "ws-1",
      columns: [
        { name: "username", data_type: "varchar" },
        { name: "email", data_type: "varchar" },
      ],
      rows: [
        { username: "alice", email: "alice@example.com" },
        { username: "bob", email: "bob@example.com" },
      ],
      row_count: 2,
      duration_ms: 12,
      is_truncated: false,
      status: "success",
      sources_involved: ["postgres-target"],
      generated_queries: {},
    };

    render(<ResultChart result={textOnlyResult} />);

    expect(screen.getByText("No numeric metrics detected")).toBeInTheDocument();
    expect(
      screen.getByText(/Visual charting requires at least one numeric column/)
    ).toBeInTheDocument();
  });
});
