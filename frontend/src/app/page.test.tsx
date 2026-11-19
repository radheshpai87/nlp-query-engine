import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage Component", () => {
  it("renders the primary engine title and active databases card", () => {
    render(<HomePage />);

    expect(screen.getByText("Natural Language Query Engine")).toBeInTheDocument();
    expect(screen.getByText("Connected Databases")).toBeInTheDocument();
    expect(screen.getByText("Ambiguity Guardian")).toBeInTheDocument();
    expect(screen.getAllByText("Schema Canvas").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sample natural language questions", () => {
    render(<HomePage />);

    expect(
      screen.getByText("Show me the top five products by revenue this month.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Show me high-value customers who recently purchased electronics.")
    ).toBeInTheDocument();
  });
});
