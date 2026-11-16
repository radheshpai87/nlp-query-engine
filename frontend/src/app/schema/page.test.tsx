import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SchemaPage from "./page";
import type { SchemaSnapshot, SchemaGraphResponse } from "@/lib/schema-api";

// Mock ResizeObserver for React Flow in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockSnapshots: SchemaSnapshot[] = [
  {
    id: "snap-1",
    workspace_id: "ws-default",
    connection_id: "conn-pg-1",
    fingerprint: "a9f8e4b7c2d1e0f3456789abcdef0123456789abcdef0123456789abcdef0123",
    total_objects: 3,
    created_at: new Date().toISOString(),
    objects: [
      {
        connection_id: "conn-pg-1",
        name: "customers",
        schema_name: "public",
        object_type: "table",
        row_count_estimate: 24500,
        fields: [
          { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
          { name: "email", data_type: "character varying", is_primary_key: false, is_foreign_key: false, is_nullable: false },
        ],
        relationships: [],
      },
      {
        connection_id: "conn-pg-1",
        name: "orders",
        schema_name: "public",
        object_type: "table",
        row_count_estimate: 158200,
        fields: [
          { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
          { name: "customer_id", data_type: "integer", is_primary_key: false, is_foreign_key: true, is_nullable: false },
        ],
        relationships: [
          {
            source_table: "orders",
            source_fields: ["customer_id"],
            target_table: "customers",
            target_fields: ["id"],
            provenance: "foreign_key",
            cardinality: "many_to_one",
            confidence: 1.0,
          },
        ],
      },
      {
        connection_id: "conn-pg-1",
        name: "products",
        schema_name: "public",
        object_type: "table",
        row_count_estimate: 4200,
        fields: [
          { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
          { name: "sku", data_type: "varchar", is_primary_key: false, is_foreign_key: false, is_nullable: false },
        ],
        relationships: [],
      },
    ],
  },
];

const mockGraphResponse: SchemaGraphResponse = {
  workspace_id: "ws-default",
  nodes: [
    {
      id: "conn-pg-1::customers",
      name: "customers",
      connection_id: "conn-pg-1",
      connection_name: "PostgreSQL Primary",
      database_type: "postgres",
      schema_name: "public",
      object_type: "table",
      row_count_estimate: 24500,
      fields: [
        { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
        { name: "email", data_type: "character varying", is_primary_key: false, is_foreign_key: false, is_nullable: false },
      ],
    },
    {
      id: "conn-pg-1::orders",
      name: "orders",
      connection_id: "conn-pg-1",
      connection_name: "PostgreSQL Primary",
      database_type: "postgres",
      schema_name: "public",
      object_type: "table",
      row_count_estimate: 158200,
      fields: [
        { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
        { name: "customer_id", data_type: "integer", is_primary_key: false, is_foreign_key: true, is_nullable: false },
      ],
    },
  ],
  edges: [
    {
      id: "disc::orders-cust",
      source_node_id: "conn-pg-1::orders",
      source_field: "customer_id",
      target_node_id: "conn-pg-1::customers",
      target_field: "id",
      provenance: "foreign_key",
      cardinality: "many_to_one",
      confidence: 1.0,
      is_cross_database: false,
    },
  ],
  statistics: {
    total_nodes: 2,
    total_edges: 1,
    foreign_keys_count: 1,
    inferred_count: 0,
    user_defined_count: 0,
    cross_database_count: 0,
  },
};

vi.mock("@/lib/schema-api", () => ({
  fetchWorkspaceSchemas: vi.fn(() => Promise.resolve(mockSnapshots)),
  fetchSchemaGraph: vi.fn(() => Promise.resolve(mockGraphResponse)),
  refreshConnectionSchema: vi.fn(() => Promise.resolve(mockSnapshots[0])),
  fetchConnectionSchema: vi.fn(() => Promise.resolve(mockSnapshots[0])),
  searchSchema: vi.fn(() => Promise.resolve([])),
  createUserDefinedRelationship: vi.fn(() =>
    Promise.resolve({
      id: "rel-1",
      workspace_id: "ws-default",
      name: "Custom Link",
      source_connection_id: "conn-pg-1",
      source_table: "orders",
      source_fields: ["customer_id"],
      target_connection_id: "conn-pg-1",
      target_table: "customers",
      target_fields: ["id"],
      provenance: "user_defined",
      cardinality: "many_to_one",
      confidence: 1.0,
      created_at: new Date().toISOString(),
    })
  ),
  deleteUserDefinedRelationship: vi.fn(() => Promise.resolve()),
}));

describe("SchemaPage Component", () => {
  it("renders schema explorer header and default canvas controls", async () => {
    render(<SchemaPage />);

    expect(screen.getByText("Schema Explorer")).toBeInTheDocument();
    expect(screen.getByText("Visual Canvas")).toBeInTheDocument();
    expect(screen.getByText("Table Details")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Connect Tables")).toBeInTheDocument();
    });
  });

  it("switches to table details mode and displays columns with key constraints", async () => {
    render(<SchemaPage />);

    // Switch view mode to table details
    const tableModeBtn = screen.getByText("Table Details");
    fireEvent.click(tableModeBtn);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search tables & fields...")
      ).toBeInTheDocument();
    });

    // Inspect columns of default entity (customers)
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("character varying")).toBeInTheDocument();
    expect(screen.getByText("PK")).toBeInTheDocument();

    // Click on orders from the entity list
    const orderButtons = screen.getAllByText("orders");
    fireEvent.click(orderButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("customer_id")).toBeInTheDocument();
      expect(screen.getByText("FK")).toBeInTheDocument();
      expect(
        screen.getByText("Discovered Relationships (1)")
      ).toBeInTheDocument();
    });
  });

  it("filters entities when typing in search input in table view", async () => {
    render(<SchemaPage />);

    // Switch to table details view
    fireEvent.click(screen.getByText("Table Details"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /customers/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search tables & fields...");
    fireEvent.change(searchInput, { target: { value: "sku" } });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /customers/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /products/i })).toBeInTheDocument();
    });
  });
});
