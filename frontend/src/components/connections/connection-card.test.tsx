import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConnectionCard, type DatabaseConnectionItem } from "./connection-card";

describe("ConnectionCard Component", () => {
  const mockConn: DatabaseConnectionItem = {
    id: "conn-101",
    name: "Orders PostgreSQL",
    db_type: "postgres",
    host: "localhost",
    port: 5432,
    database: "orders_db",
    status: "online",
    status_message: "PostgreSQL 16.4 ready",
    last_verified_at: "2026-10-21T12:00:00Z",
    is_enabled: true,
  };

  it("renders connection details and status indicator", () => {
    render(<ConnectionCard connection={mockConn} />);

    expect(screen.getByText("Orders PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("localhost:5432 / orders_db")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL 16.4 ready")).toBeInTheDocument();
  });

  it("triggers onTest callback when Test button is clicked", () => {
    const handleTest = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionCard connection={mockConn} onTest={handleTest} />);

    const testBtn = screen.getByRole("button", { name: /test/i });
    fireEvent.click(testBtn);
    expect(handleTest).toHaveBeenCalledWith("conn-101");
  });

  it("handles delete flow with confirmation toggle", async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionCard connection={mockConn} onDelete={handleDelete} />);

    const deleteBtn = screen.getByLabelText("Delete connection");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);
    expect(handleDelete).toHaveBeenCalledWith("conn-101");
  });
});
