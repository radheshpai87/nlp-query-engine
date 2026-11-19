import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatPage from "./page";
import * as ambiguityApi from "@/lib/ambiguity-api";
import * as executionApi from "@/lib/execution-api";

vi.mock("@/lib/ambiguity-api", () => ({
  evaluateQueryAmbiguity: vi.fn(),
  resolveQueryClarification: vi.fn(),
}));

vi.mock("@/lib/execution-api", () => ({
  executeQueryPlan: vi.fn(),
  listQueryExecutions: vi.fn(),
  getQueryExecution: vi.fn(),
}));

vi.mock("@/lib/query-plan-api", () => ({
  compileLogicalPlan: vi.fn(),
  synthesizeLogicalPlan: vi.fn().mockResolvedValue({
    workspace_id: "ws-default",
    query_text: "test",
    sources: [{ connection_id: "conn-1", source_name: "test_source", alias: "t" }],
    projections: [{ table: "t", column: "id" }],
    filters: [],
    limit: 20,
    offset: 0,
  }),
}));

describe("ChatPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ambiguityApi.evaluateQueryAmbiguity).mockResolvedValue({
      is_ambiguous: false,
      confidence: 0.95,
      clarifications: [],
      inferred_intent: {},
      suggested_action: "proceed_to_plan",
    });
  });

  it("renders empty state with sample queries initially", () => {
    render(<ChatPage />);
    expect(screen.getByText("What would you like to explore today?")).toBeInTheDocument();
    expect(screen.getByText("Suggested queries")).toBeInTheDocument();
    expect(
      screen.getByText("Show me top 5 products by revenue this month")
    ).toBeInTheDocument();
  });

  it("sends query and displays clarification prompt when ambiguous", async () => {
    const mockEvaluation: ambiguityApi.AmbiguityEvaluationResult = {
      is_ambiguous: true,
      confidence: 0.5,
      clarifications: [
        {
          id: "clarif_1",
          ambiguity_type: "vague_predicate",
          parameter_name: "high_value_threshold",
          question: "What purchase amount should count as high-value?",
          options: [
            { label: "Orders > $500", value: 500, is_recommended: true },
            { label: "Orders > $1,000", value: 1000 },
          ],
          allow_custom_input: true,
          default_value: 500,
          resolved: false,
          explanation: "High-value depends on category.",
        },
      ],
      inferred_intent: { domain: "customers" },
      suggested_action: "request_clarification",
    };

    vi.mocked(ambiguityApi.evaluateQueryAmbiguity).mockResolvedValueOnce(mockEvaluation);

    render(<ChatPage />);

    // Click sample query
    fireEvent.click(
      screen.getByText("High-value customers who purchased electronics recently")
    );

    // Should call API
    await waitFor(() => {
      expect(ambiguityApi.evaluateQueryAmbiguity).toHaveBeenCalledWith(
        "ws-default",
        "High-value customers who purchased electronics recently"
      );
    });

    // Should render clarification prompt
    expect(
      await screen.findByText("What purchase amount should count as high-value?")
    ).toBeInTheDocument();
    expect(screen.getByText("Orders > $500")).toBeInTheDocument();
  });

  it("resolves clarification when user confirms selection", async () => {
    const mockEvaluation: ambiguityApi.AmbiguityEvaluationResult = {
      is_ambiguous: true,
      confidence: 0.6,
      clarifications: [
        {
          id: "clarif_time",
          ambiguity_type: "missing_time_window",
          parameter_name: "time_window_days",
          question: "What time period should recently mean?",
          options: [
            { label: "Last 30 days", value: 30, is_recommended: true },
            { label: "Last 90 days", value: 90 },
          ],
          allow_custom_input: true,
          default_value: 30,
          resolved: false,
        },
      ],
      inferred_intent: {},
      suggested_action: "request_clarification",
    };

    const mockResolution: ambiguityApi.ClarificationResolutionResponse = {
      resolved: true,
      clarification_id: "clarif_time",
      parameter_name: "time_window_days",
      resolved_value: 30,
      remaining_clarifications: [],
      ready_to_execute: true,
    };

    vi.mocked(ambiguityApi.evaluateQueryAmbiguity).mockResolvedValueOnce(mockEvaluation);
    vi.mocked(ambiguityApi.resolveQueryClarification).mockResolvedValueOnce(mockResolution);

    render(<ChatPage />);

    // Type query
    const input = screen.getByPlaceholderText(/e\.g\. Show me top 5 products/i);
    fireEvent.change(input, { target: { value: "Show recent sales" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // Wait for clarification
    expect(
      await screen.findByText("What time period should recently mean?")
    ).toBeInTheDocument();

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm & continue/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(ambiguityApi.resolveQueryClarification).toHaveBeenCalled();
    });

    // Should display resolved state
    expect(
      await screen.findByText(
        "All parameters clarified. Ready to construct the logical query plan across your data sources."
      )
    ).toBeInTheDocument();
  });

  it("resets conversation when clicking New Chat", async () => {
    render(<ChatPage />);

    // Type and send
    const input = screen.getByPlaceholderText(/e\.g\. Show me top 5 products/i);
    fireEvent.change(input, { target: { value: "Test Query" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Test Query")).toBeInTheDocument();

    // Click New Chat
    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));

    expect(screen.queryByText("Test Query")).not.toBeInTheDocument();
    expect(screen.getByText("What would you like to explore today?")).toBeInTheDocument();
  });

  it("executes query plan and renders result table when Run Query is clicked", async () => {
    const mockExecutionResult: executionApi.ExecutionResult = {
      execution_id: "exec_test_999",
      workspace_id: "ws-default",
      columns: [
        { name: "id", data_type: "integer" },
        { name: "status", data_type: "string" },
      ],
      rows: [
        { id: 1, status: "completed" },
        { id: 2, status: "pending" },
      ],
      row_count: 2,
      duration_ms: 8.2,
      is_truncated: false,
      status: "success",
      sources_involved: ["orders"],
      generated_queries: {},
    };

    vi.mocked(executionApi.executeQueryPlan).mockResolvedValueOnce(mockExecutionResult);

    render(<ChatPage />);

    // Type and send a clear query
    const input = screen.getByPlaceholderText(/e\.g\. Show me top 5 products/i);
    fireEvent.change(input, { target: { value: "Show completed orders" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // Wait for Ready status and Run Query button
    const runBtn = await screen.findByRole("button", { name: /run query/i });
    expect(runBtn).toBeInTheDocument();

    // Click Run Query
    fireEvent.click(runBtn);

    // Verify API called and table rendered
    await waitFor(() => {
      expect(executionApi.executeQueryPlan).toHaveBeenCalled();
    });

    expect(await screen.findByText("completed")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getAllByText("8.2ms").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("How did you get this result?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chart/i })).toBeInTheDocument();
  });

  it("handles metadata query conversationally without running table queries", async () => {
    vi.mocked(ambiguityApi.evaluateQueryAmbiguity).mockResolvedValueOnce({
      is_ambiguous: false,
      confidence: 1.0,
      clarifications: [],
      inferred_intent: { category: "metadata_databases" },
      suggested_action: "conversational_response",
      is_metadata_query: true,
      conversational_response: "There are 3 connected databases: PostgreSQL, MongoDB, Elasticsearch.",
    });

    render(<ChatPage />);

    const input = screen.getByPlaceholderText(/e\.g\. Show me top 5 products/i);
    fireEvent.change(input, { target: { value: "How many databases are present" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText("There are 3 connected databases: PostgreSQL, MongoDB, Elasticsearch.")
    ).toBeInTheDocument();
    expect(screen.getByText("Cluster Assistant")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run query/i })).not.toBeInTheDocument();
  });

  it("triggers guardrail notification for out-of-scope queries", async () => {
    vi.mocked(ambiguityApi.evaluateQueryAmbiguity).mockResolvedValueOnce({
      is_ambiguous: false,
      confidence: 1.0,
      clarifications: [],
      inferred_intent: { guardrail: "off_topic" },
      suggested_action: "guardrail_blocked",
      is_guardrail_blocked: true,
      conversational_response: "Guard Rail Notice: Query Out of Scope. I am strictly scoped to your databases.",
    });

    render(<ChatPage />);

    const input = screen.getByPlaceholderText(/e\.g\. Show me top 5 products/i);
    fireEvent.change(input, { target: { value: "What is the capital of France?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText("Guard Rail Notice: Query Out of Scope. I am strictly scoped to your databases.")
    ).toBeInTheDocument();
    expect(screen.getByText("Guard Rail Protected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run query/i })).not.toBeInTheDocument();
  });
});
