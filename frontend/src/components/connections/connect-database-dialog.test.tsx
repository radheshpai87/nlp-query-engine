import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConnectDatabaseDialog } from "./connect-database-dialog";

describe("ConnectDatabaseDialog Component", () => {
  it("renders database type selection and PostgreSQL fields by default", () => {
    const handleOpenChange = vi.fn();
    render(
      <ConnectDatabaseDialog
        open={true}
        onOpenChange={handleOpenChange}
        workspaceId="ws-test"
      />
    );

    expect(screen.getByText("Connect Target Database")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("MongoDB")).toBeInTheDocument();
    expect(screen.getByText("Elasticsearch")).toBeInTheDocument();

    // Default postgres fields
    expect(screen.getByDisplayValue("5432")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ecommerce_demo")).toBeInTheDocument();
  });

  it("switches to Elasticsearch endpoint input when Elasticsearch is selected", () => {
    const handleOpenChange = vi.fn();
    render(
      <ConnectDatabaseDialog
        open={true}
        onOpenChange={handleOpenChange}
        workspaceId="ws-test"
      />
    );

    const esBtn = screen.getByRole("button", { name: "Elasticsearch" });
    fireEvent.click(esBtn);

    expect(screen.getByText("Cluster Endpoint URL")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http://localhost:9200")).toBeInTheDocument();
  });

  it("switches to MongoDB and supports URI toggle", () => {
    const handleOpenChange = vi.fn();
    render(
      <ConnectDatabaseDialog
        open={true}
        onOpenChange={handleOpenChange}
        workspaceId="ws-test"
      />
    );

    const mongoBtn = screen.getByRole("button", { name: "MongoDB" });
    fireEvent.click(mongoBtn);

    expect(screen.getByText("Connect using Mongo Connection URI string")).toBeInTheDocument();
    const uriCheckbox = screen.getByLabelText("Connect using Mongo Connection URI string");
    fireEvent.click(uriCheckbox);

    expect(screen.getByText("Connection URI")).toBeInTheDocument();
  });
});
