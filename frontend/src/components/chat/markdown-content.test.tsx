import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent Component", () => {
  it("renders bold text and inline code", () => {
    render(<MarkdownContent content="There are **3 connected databases** with `customers` table." />);

    expect(screen.getByText("3 connected databases")).toBeInTheDocument();
    expect(screen.getByText("customers")).toBeInTheDocument();
  });

  it("renders ordered list items", () => {
    render(
      <MarkdownContent
        content={`1. PostgreSQL
2. MongoDB
3. Elasticsearch`}
      />
    );

    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("MongoDB")).toBeInTheDocument();
    expect(screen.getByText("Elasticsearch")).toBeInTheDocument();
  });
});
