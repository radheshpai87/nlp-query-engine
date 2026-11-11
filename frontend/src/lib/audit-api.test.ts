import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAuditTrail,
  verifyAuditIntegrity,
  exportAuditTrail,
} from "./audit-api";

describe("audit-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches filtered audit events", async () => {
    const mockResponse = {
      items: [
        {
          id: "aud-1",
          workspace_id: "ws-1",
          sequence: 1,
          action: "QUERY_EXECUTION",
          resource_type: "query",
          details: {},
          status: "SUCCESS",
          created_at: "2026-10-22T10:00:00Z",
        },
      ],
      total: 1,
      limit: 50,
      skip: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const res = await getAuditTrail("ws-1", { status: "SUCCESS", limit: 50 }, "token-1");
    expect(res).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/audit?status=SUCCESS&limit=50"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      })
    );
  });

  it("verifies audit integrity chain", async () => {
    const mockIntegrity = {
      is_valid: true,
      total_events_checked: 10,
      tampered_event_ids: [],
      message: "Chain valid",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIntegrity,
    });

    const res = await verifyAuditIntegrity("ws-1");
    expect(res.is_valid).toBe(true);
    expect(res.total_events_checked).toBe(10);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/audit/integrity"),
      expect.anything()
    );
  });

  it("exports audit trail blob", async () => {
    const mockBlob = new Blob(["id,action\n1,TEST"], { type: "text/csv" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    const res = await exportAuditTrail("ws-1", "csv");
    expect(res).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/audit/export?format=csv"),
      expect.anything()
    );
  });
});
