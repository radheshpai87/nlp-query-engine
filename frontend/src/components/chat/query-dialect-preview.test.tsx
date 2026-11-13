import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryDialectPreview } from "./query-dialect-preview";
import { CompilationResult } from "@/lib/query-plan-api";

describe("QueryDialectPreview Component", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders PostgreSQL SQL query and parameter badges", () => {
    const mockPostgresResult: CompilationResult = {
      workspace_id: "ws-1",
      is_cross_database: false,
      dialect: "postgres",
      summary: "PostgreSQL SELECT query targeting customers.",
      single_query: {
        dialect: "postgres",
        connection_id: "conn-1",
        target_table: "customers",
        sql: 'SELECT "id", "name" FROM "customers" WHERE "city" = \'Bengaluru\';',
        parameterized_sql: 'SELECT "id", "name" FROM "customers" WHERE "city" = :p1;',
        parameters: { p1: "Bengaluru" },
        is_read_only: true,
      },
    };

    render(<QueryDialectPreview result={mockPostgresResult} />);

    expect(screen.getByText("PostgreSQL SQL")).toBeInTheDocument();
    expect(screen.getByText(/Target: customers/i)).toBeInTheDocument();
    expect(
      screen.getByText('SELECT "id", "name" FROM "customers" WHERE "city" = \'Bengaluru\';')
    ).toBeInTheDocument();
    expect(screen.getByText(":p1")).toBeInTheDocument();
    expect(screen.getByText(/=\s*"Bengaluru"/)).toBeInTheDocument();
  });

  it("renders MongoDB pipeline formatted JSON", () => {
    const mockMongoResult: CompilationResult = {
      workspace_id: "ws-1",
      is_cross_database: false,
      dialect: "mongodb",
      summary: "MongoDB aggregation pipeline on collection orders.",
      single_query: {
        dialect: "mongodb",
        connection_id: "conn-mongo",
        collection: "orders",
        pipeline: [
          { $match: { status: "completed" } },
          { $group: { _id: "$customer_id", total: { $sum: "$amount" } } },
        ],
        is_read_only: true,
      },
    };

    render(<QueryDialectPreview result={mockMongoResult} />);

    expect(screen.getByText("MongoDB MQL")).toBeInTheDocument();
    expect(screen.getByText(/Collection: orders/i)).toBeInTheDocument();
    expect(screen.getByText(/"status": "completed"/)).toBeInTheDocument();
  });

  it("renders Elasticsearch Query DSL", () => {
    const mockEsResult: CompilationResult = {
      workspace_id: "ws-1",
      is_cross_database: false,
      dialect: "elasticsearch",
      summary: "Elasticsearch Query DSL payload targeting index logs.",
      single_query: {
        dialect: "elasticsearch",
        connection_id: "conn-es",
        index: "logs",
        query_body: {
          query: { bool: { filter: [{ term: { level: "error" } }] } },
          size: 10,
        },
        is_read_only: true,
      },
    };

    render(<QueryDialectPreview result={mockEsResult} />);

    expect(screen.getByText("Elasticsearch Query DSL")).toBeInTheDocument();
    expect(screen.getByText(/Index: logs/i)).toBeInTheDocument();
    expect(screen.getByText(/"level": "error"/)).toBeInTheDocument();
  });

  it("renders cross-database federated plan with join steps and allows tab switching", () => {
    const mockCrossDbResult: CompilationResult = {
      workspace_id: "ws-1",
      is_cross_database: true,
      summary: "Federated cross-database plan joining 2 sources.",
      cross_database_plan: {
        is_cross_database: true,
        join_steps: [
          {
            left_source_id: "customers",
            right_source_id: "orders",
            left_key: "id",
            right_key: "customer_id",
            strategy: "hash_join",
          },
        ],
        sub_queries: [
          {
            dialect: "postgres",
            connection_id: "conn-pg",
            target_table: "customers",
            sql: 'SELECT "id", "name" FROM "customers";',
            parameterized_sql: 'SELECT "id", "name" FROM "customers";',
            parameters: {},
            is_read_only: true,
          },
          {
            dialect: "mongodb",
            connection_id: "conn-mongo",
            collection: "orders",
            pipeline: [{ $match: { total: { $gt: 100 } } }],
            is_read_only: true,
          },
        ],
      },
    };

    render(<QueryDialectPreview result={mockCrossDbResult} />);

    expect(screen.getByText("Federated Plan")).toBeInTheDocument();
    expect(screen.getByText("In-Memory Hash Join Strategy")).toBeInTheDocument();
    expect(screen.getByText("customers.id")).toBeInTheDocument();
    expect(screen.getByText("orders.customer_id")).toBeInTheDocument();
    expect(screen.getByText("hash_join")).toBeInTheDocument();

    // Tab 1 by default
    expect(screen.getByText('SELECT "id", "name" FROM "customers";')).toBeInTheDocument();

    // Click Tab 2
    fireEvent.click(screen.getByText(/Sub-Query 2 \(MONGODB\)/i));
    expect(screen.getByText(/"total":/)).toBeInTheDocument();
  });

  it("copies query text when clicking copy button", () => {
    const mockPostgresResult: CompilationResult = {
      workspace_id: "ws-1",
      is_cross_database: false,
      dialect: "postgres",
      summary: "PostgreSQL query.",
      single_query: {
        dialect: "postgres",
        connection_id: "conn-1",
        target_table: "users",
        sql: 'SELECT * FROM "users";',
        parameterized_sql: 'SELECT * FROM "users";',
        parameters: {},
        is_read_only: true,
      },
    };

    render(<QueryDialectPreview result={mockPostgresResult} />);

    const copyBtn = screen.getByRole("button", { name: /copy sql/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SELECT * FROM "users";');
  });
});
