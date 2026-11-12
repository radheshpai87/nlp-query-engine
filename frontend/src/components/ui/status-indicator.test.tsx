import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusIndicator } from "./status-indicator";

describe("StatusIndicator Component", () => {
  it("renders status text and online indicator", () => {
    render(<StatusIndicator status="online" label="PostgreSQL 16" />);
    expect(screen.getByText("PostgreSQL 16")).toBeInTheDocument();
  });

  it("falls back to default status text if label is omitted", () => {
    render(<StatusIndicator status="error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });
});
