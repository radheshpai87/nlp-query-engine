import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listConversations,
  createConversation,
  getConversation,
  updateConversationTitle,
  deleteConversation,
  getMessages,
  postMessage,
  resolveClarificationInConversation,
} from "./conversation-api";

describe("conversation-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists conversations for a workspace", async () => {
    const mockList = [{ id: "c-1", title: "Sales Analysis", workspace_id: "ws-1" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockList,
    });

    const res = await listConversations("ws-1", "mock-token");
    expect(res).toEqual(mockList);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/conversations"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );
  });

  it("creates a new conversation", async () => {
    const mockConv = { id: "c-2", title: "Revenue Deep Dive" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConv,
    });

    const res = await createConversation("ws-1", "Revenue Deep Dive", "token-xyz");
    expect(res).toEqual(mockConv);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/conversations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Revenue Deep Dive" }),
      })
    );
  });

  it("fetches a specific conversation by ID", async () => {
    const mockConv = { id: "c-3", title: "Customer Churn" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConv,
    });

    const res = await getConversation("ws-1", "c-3");
    expect(res).toEqual(mockConv);
  });

  it("renames conversation thread", async () => {
    const mockConv = { id: "c-3", title: "Renamed Thread" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConv,
    });

    const res = await updateConversationTitle("ws-1", "c-3", "Renamed Thread");
    expect(res.title).toBe("Renamed Thread");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/conversations/c-3"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Renamed Thread" }),
      })
    );
  });

  it("deletes a conversation thread", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await expect(deleteConversation("ws-1", "c-4")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/conversations/c-4"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("fetches messages history", async () => {
    const mockMsgs = [
      { id: "m-1", role: "user", content: "Show top products" },
      { id: "m-2", role: "assistant", content: "Here are top products" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMsgs,
    });

    const res = await getMessages("ws-1", "c-1");
    expect(res).toHaveLength(2);
    expect(res[0].role).toBe("user");
  });

  it("posts a message and receives assistant response", async () => {
    const mockTurn = {
      user_message: { id: "u-1", role: "user", content: "Top 5 products" },
      assistant_message: { id: "a-1", role: "assistant", content: "Found 5 products." },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTurn,
    });

    const res = await postMessage("ws-1", "c-1", "Top 5 products");
    expect(res.user_message.content).toBe("Top 5 products");
    expect(res.assistant_message.content).toBe("Found 5 products.");
  });

  it("submits clarification answer and continues execution", async () => {
    const mockClarificationTurn = {
      user_message: { id: "u-2", role: "user", content: "Selected: 500" },
      assistant_message: { id: "a-2", role: "assistant", content: "Retrieved 3 customers with spend > 500." },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClarificationTurn,
    });

    const res = await resolveClarificationInConversation("ws-1", "c-1", "clarif-1", 500);
    expect(res.user_message.content).toBe("Selected: 500");
    expect(res.assistant_message.content).toContain("Retrieved 3 customers");
  });

  it("throws friendly error on server failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
    });

    await expect(postMessage("ws-1", "c-1", "invalid query")).rejects.toThrow(
      "Failed to send message: Bad Request"
    );
  });
});
