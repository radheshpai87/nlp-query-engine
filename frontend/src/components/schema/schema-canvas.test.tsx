import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { TableNode, TableNodeProps } from "./table-node";
import { AddRelationshipDialog } from "./add-relationship-dialog";
import * as schemaApi from "@/lib/schema-api";

describe("TableNode Component", () => {
  it("renders table name, database badge, and columns", () => {
    const mockData: TableNodeProps["data"] = {
      id: "conn-1::orders",
      name: "orders",
      connection_id: "conn-1",
      connection_name: "Sales PostgreSQL",
      database_type: "postgres",
      schema_name: "public",
      object_type: "table",
      row_count_estimate: 42000,
      fields: [
        {
          name: "id",
          data_type: "integer",
          is_primary_key: true,
          is_foreign_key: false,
          is_nullable: false,
        },
        {
          name: "user_id",
          data_type: "integer",
          is_primary_key: false,
          is_foreign_key: true,
          is_nullable: false,
        },
        {
          name: "total_usd",
          data_type: "numeric",
          is_primary_key: false,
          is_foreign_key: false,
          is_nullable: false,
        },
      ],
    };

    render(
      <ReactFlowProvider>
        <TableNode
          id="test-node-1"
          data={mockData}
          type="tableNode"
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          deletable={false}
          selectable={true}
          draggable={true}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByText("orders")).toBeInTheDocument();
    expect(screen.getByText("Sales PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("postgres")).toBeInTheDocument();
    expect(screen.getByText("42,000 rows")).toBeInTheDocument();
    expect(screen.getByText("user_id")).toBeInTheDocument();
    expect(screen.getByText("total_usd")).toBeInTheDocument();
  });
});

describe("AddRelationshipDialog Component", () => {
  it("submits user-defined relationship between two nodes", async () => {
    const mockNodes: schemaApi.GraphNode[] = [
      {
        id: "conn-pg::orders",
        name: "orders",
        connection_id: "conn-pg",
        connection_name: "Postgres",
        database_type: "postgres",
        object_type: "table",
        fields: [
          { name: "id", data_type: "integer", is_primary_key: true, is_foreign_key: false, is_nullable: false },
          { name: "customer_id", data_type: "integer", is_primary_key: false, is_foreign_key: false, is_nullable: false },
        ],
      },
      {
        id: "conn-mongo::customers",
        name: "customers",
        connection_id: "conn-mongo",
        connection_name: "Mongo",
        database_type: "mongodb",
        object_type: "collection",
        fields: [
          { name: "_id", data_type: "objectId", is_primary_key: true, is_foreign_key: false, is_nullable: false },
          { name: "email", data_type: "string", is_primary_key: false, is_foreign_key: false, is_nullable: false },
        ],
      },
    ];

    const mockCreatedRel: schemaApi.UserDefinedRelationship = {
      id: "rel-new-123",
      workspace_id: "ws-1",
      name: "orders.customer_id → customers._id",
      source_connection_id: "conn-pg",
      source_table: "orders",
      source_fields: ["customer_id"],
      target_connection_id: "conn-mongo",
      target_table: "customers",
      target_fields: ["_id"],
      provenance: "user_defined",
      cardinality: "many_to_one",
      confidence: 1.0,
      created_at: new Date().toISOString(),
    };

    const spyCreate = vi
      .spyOn(schemaApi, "createUserDefinedRelationship")
      .mockResolvedValue(mockCreatedRel);

    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AddRelationshipDialog
        open={true}
        onOpenChange={onOpenChange}
        workspaceId="ws-1"
        nodes={mockNodes}
        onRelationshipCreated={onCreated}
      />
    );

    expect(screen.getByText("Define Relationship")).toBeInTheDocument();
    expect(
      screen.getByText("Cross-Database Relationship Detected")
    ).toBeInTheDocument();

    // Select source field
    const fieldSelects = screen.getAllByRole("combobox");
    // Source Field is the 2nd combobox
    fireEvent.change(fieldSelects[1], { target: { value: "customer_id" } });
    // Target Field is the 4th combobox
    fireEvent.change(fieldSelects[3], { target: { value: "_id" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "Create Link" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(spyCreate).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({
          source_connection_id: "conn-pg",
          source_table: "orders",
          source_fields: ["customer_id"],
          target_connection_id: "conn-mongo",
          target_table: "customers",
          target_fields: ["_id"],
        })
      );
      expect(onCreated).toHaveBeenCalledWith(mockCreatedRel);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
