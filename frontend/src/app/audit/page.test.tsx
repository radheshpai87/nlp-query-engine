import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuditPage from "./page";
import * as auditApi from "@/lib/audit-api";

vi.mock("@/lib/audit-api", () => ({
  getAuditTrail: vi.fn(),
  verifyAuditIntegrity: vi.fn(),
  exportAuditTrail: vi.fn(),
}));

describe("AuditPage Component", () => {
  const mockEvents = [
    {
      id: "evt-1",
      workspace_id: "default-workspace",
      sequence: 1,
      user_id: "user-alice",
      action: "USER_LOGIN",
      resource_type: "auth",
      details: { ip: "127.0.0.1" },
      status: "SUCCESS",
      previous_hash: "GENESIS",
      event_hash: "hash123456",
      created_at: "2026-10-22T10:00:00Z",
    },
    {
      id: "evt-2",
      workspace_id: "default-workspace",
      sequence: 2,
      user_id: "user-bob",
      action: "QUERY_EXECUTION",
      resource_type: "query",
      details: { sql: "SELECT * FROM orders" },
      status: "DENIED",
      previous_hash: "hash123456",
      event_hash: "hash789012",
      created_at: "2026-10-22T10:05:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(auditApi.getAuditTrail).mockResolvedValue({
      items: mockEvents,
      total: 2,
      limit: 15,
      skip: 0,
    });
  });

  it("renders audit page header and event rows", async () => {
    render(<AuditPage />);

    expect(screen.getByText("Security & Audit Trail")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("USER_LOGIN")).toBeInTheDocument();
      expect(screen.getByText("QUERY_EXECUTION")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
    });
  });

  it("verifies cryptographic audit integrity when clicking verify button", async () => {
    vi.mocked(auditApi.verifyAuditIntegrity).mockResolvedValue({
      is_valid: true,
      total_events_checked: 2,
      tampered_event_ids: [],
      message: "All audit events verified against cryptographic hash chain.",
    });

    render(<AuditPage />);

    const verifyBtn = screen.getByRole("button", { name: /Verify Integrity/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByTestId("integrity-banner")).toBeInTheDocument();
      expect(
        screen.getByText(/Cryptographic Hash Chain Verified/i)
      ).toBeInTheDocument();
    });
  });

  it("expands event details to display sanitized JSON payload", async () => {
    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("USER_LOGIN")).toBeInTheDocument();
    });

    const expandButtons = screen.getAllByTitle("View sanitized event details");
    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Event Details Payload & Cryptographic Proof/i)).toBeInTheDocument();
      expect(screen.getByText(/GENESIS/i)).toBeInTheDocument();
    });
  });
});
