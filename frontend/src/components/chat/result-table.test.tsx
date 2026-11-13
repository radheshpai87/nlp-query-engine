import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResultTable } from "./result-table";
import { ExecutionResult } from "@/lib/execution-api";

describe("ResultTable Component", () => {
  const mockResult: ExecutionResult = {
    execution_id: "exec_123456789",
    workspace_id: "ws-1",
    columns: [
      { name: "id", data_type: "integer" },
      { name: "name", data_type: "string" },
      { name: "revenue", data_type: "float" },
    ],
    rows: [
      {"id": 1, "name": "Alpha", "revenue": 100.5},
      {"id": 2, "name": "Beta", "revenue": 250.0},
      {"id": 3, "name": "Gamma", "revenue": 50.25},
    ],
    row_count: 3,
    duration_ms: 12.4,
    is_truncated: false,
    status: "success",
    sources_involved: ["customers"],
    generated_queries: {},
  };

  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("renders table columns with data type badges and rows", () => {
    render(<ResultTable result={mockResult} />);

    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("revenue")).toBeInTheDocument();
    expect(screen.getByText("integer")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
    expect(screen.getByText("float")).toBeInTheDocument();

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.getByText("12.4ms")).toBeInTheDocument();
    expect(screen.getByText("3 rows")).toBeInTheDocument();
  });

  it("filters rows using search input", () => {
    render(<ResultTable result={mockResult} />);

    const searchInput = screen.getByPlaceholderText(/filter results/i);
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
  });

  it("sorts rows when clicking column headers", () => {
    render(<ResultTable result={mockResult} />);

    // Click "revenue" to sort ASC
    const revHeader = screen.getByText("revenue");
    fireEvent.click(revHeader);

    const cellsBefore = screen.getAllByRole("cell").map((c) => c.textContent);
    // In ASC: Gamma (50.25) should appear first
    expect(cellsBefore.indexOf("Gamma")).toBeLessThan(cellsBefore.indexOf("Beta"));

    // Click "revenue" again to sort DESC
    fireEvent.click(revHeader);
    const cellsAfter = screen.getAllByRole("cell").map((c) => c.textContent);
    // In DESC: Beta (250.0) should appear first
    expect(cellsAfter.indexOf("Beta")).toBeLessThan(cellsAfter.indexOf("Gamma"));
  });

  it("triggers CSV export", () => {
    render(<ResultTable result={mockResult} />);

    const csvBtn = screen.getByRole("button", { name: /csv/i });
    fireEvent.click(csvBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
