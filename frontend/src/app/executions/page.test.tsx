import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExecutionsPage from "./page";
import * as executionApi from "@/lib/execution-api";

vi.mock("@/lib/execution-api", () => ({
  listQueryExecutions: vi.fn(),
  getQueryExecution: vi.fn(),
}));

describe("ExecutionsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no executions exist", async () => {
    vi.mocked(executionApi.listQueryExecutions).mockResolvedValueOnce([]);

    render(<ExecutionsPage />);

    expect(screen.getByText(/loading execution telemetry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No query executions recorded")).toBeInTheDocument();
    });
  });

  it("renders executions table when records exist and expands syntax preview", async () => {
    const mockExecutions: executionApi.QueryExecution[] = [
      {
        id: "exec_abc123456",
        workspace_id: "ws-default",
        user_id: "user_1",
        natural_query: "Show top products",
        generated_syntax: {
          postgres: 'SELECT * FROM "products" LIMIT 10;',
        },
        status: "success",
        row_count: 10,
        duration_ms: 18.5,
        created_at: "2026-10-22T10:00:00Z",
      },
    ];

    vi.mocked(executionApi.listQueryExecutions).mockResolvedValueOnce(mockExecutions);

    render(<ExecutionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Show top products")).toBeInTheDocument();
      expect(screen.getByText("18.5ms")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
    });

    // Click Syntax button
    const syntaxBtn = screen.getByRole("button", { name: /syntax/i });
    fireEvent.click(syntaxBtn);

    expect(
      screen.getByText('SELECT * FROM "products" LIMIT 10;')
    ).toBeInTheDocument();
  });
});
