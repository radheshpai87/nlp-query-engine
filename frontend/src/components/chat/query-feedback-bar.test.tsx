import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryFeedbackBar } from "./query-feedback-bar";
import * as feedbackApi from "@/lib/feedback-api";

vi.mock("@/lib/feedback-api", () => ({
  submitQueryFeedback: vi.fn().mockResolvedValue({ id: "fb-1" }),
}));

describe("QueryFeedbackBar Component", () => {
  it("renders Right and Not Right options", () => {
    render(
      <QueryFeedbackBar
        workspaceId="ws-1"
        queryText="List top 5 products"
      />
    );

    expect(screen.getByText("Was this result right?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Right$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Not Right$/i })).toBeInTheDocument();
  });

  it("submits positive feedback when clicking Right", async () => {
    render(
      <QueryFeedbackBar
        workspaceId="ws-1"
        queryText="List top 5 products"
      />
    );

    const rightBtn = screen.getByRole("button", { name: /^Right$/i });
    fireEvent.click(rightBtn);

    await waitFor(() => {
      expect(feedbackApi.submitQueryFeedback).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({
          query_text: "List top 5 products",
          is_correct: true,
          category: "accurate",
        })
      );
    });

    expect(screen.getByText(/Marked as Right • Reinforced as verified learning example/i)).toBeInTheDocument();
  });

  it("opens correction form when clicking Not Right and submits learning feedback", async () => {
    render(
      <QueryFeedbackBar
        workspaceId="ws-1"
        queryText="Count customers by country"
      />
    );

    const notRightBtn = screen.getByRole("button", { name: /Not Right/i });
    fireEvent.click(notRightBtn);

    expect(screen.getByText(/Help the system learn from this mistake/i)).toBeInTheDocument();
    expect(screen.getByText("Wrong Table")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/What went wrong/i);
    fireEvent.change(input, { target: { value: "Used orders table instead of customers table" } });

    const submitBtn = screen.getByRole("button", { name: /Submit & Learn/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(feedbackApi.submitQueryFeedback).toHaveBeenCalledWith(
        "ws-1",
        expect.objectContaining({
          query_text: "Count customers by country",
          is_correct: false,
          category: "wrong_table",
          user_notes: "Used orders table instead of customers table",
        })
      );
    });

    expect(screen.getByText(/Marked as Not Right • Correction saved for future queries/i)).toBeInTheDocument();
  });
});
