import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ClarificationPrompt } from "./clarification-prompt";
import { PendingClarification } from "@/lib/ambiguity-api";

describe("ClarificationPrompt Component", () => {
  const mockClarification: PendingClarification = {
    id: "clarif_123",
    ambiguity_type: "vague_predicate",
    parameter_name: "high_value_threshold",
    question: "What minimum purchase amount should be considered high-value?",
    options: [
      { label: "Orders above $500", value: 500, is_recommended: true },
      { label: "Orders above $1,000", value: 1000 },
      { label: "Top 10% highest spenders", value: "top_10_percent" },
    ],
    allow_custom_input: true,
    default_value: 500,
    resolved: false,
    explanation: "High-value is subjective across departments.",
  };

  it("renders clarification question, options, and recommended badge", () => {
    const handleResolve = vi.fn();
    render(<ClarificationPrompt clarification={mockClarification} onResolve={handleResolve} />);

    expect(
      screen.getByText("What minimum purchase amount should be considered high-value?")
    ).toBeInTheDocument();
    expect(screen.getByText("Orders above $500")).toBeInTheDocument();
    expect(screen.getByText("Orders above $1,000")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("submits selected option on confirm", () => {
    const handleResolve = vi.fn();
    render(<ClarificationPrompt clarification={mockClarification} onResolve={handleResolve} />);

    // Click option 2
    fireEvent.click(screen.getByText("Orders above $1,000"));

    // Click confirm
    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(handleResolve).toHaveBeenCalledWith("clarif_123", 1000);
  });

  it("submits custom input when typed", () => {
    const handleResolve = vi.fn();
    render(<ClarificationPrompt clarification={mockClarification} onResolve={handleResolve} />);

    const input = screen.getByPlaceholderText(/or type a custom value/i);
    fireEvent.change(input, { target: { value: "750" } });

    fireEvent.click(screen.getByRole("button", { name: /confirm & continue/i }));

    expect(handleResolve).toHaveBeenCalledWith("clarif_123", undefined, "750");
  });

  it("renders resolved view when clarification is marked resolved", () => {
    const resolvedClarification: PendingClarification = {
      ...mockClarification,
      resolved: true,
      user_response: 1000,
    };

    render(<ClarificationPrompt clarification={resolvedClarification} onResolve={vi.fn()} />);

    expect(screen.getByText(/Resolved: 1000/i)).toBeInTheDocument();
    expect(screen.getByText("Clarified")).toBeInTheDocument();
  });
});
