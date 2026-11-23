import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DocsPage from "./page";

// Mock clipboard
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  });
});

describe("DocsPage Component", () => {
  it("renders documentation header and primary sections", () => {
    render(<DocsPage />);

    expect(screen.getByText("Nexus Query Engine Reference")).toBeInTheDocument();
    expect(screen.getByText("Why Nexus Query?")).toBeInTheDocument();
    expect(screen.getByText("The 4-Stage Execution Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Authentication & Security Model")).toBeInTheDocument();
    expect(screen.getByText("REST API Endpoints Reference")).toBeInTheDocument();
  });

  it("renders API endpoints with method badges and details", () => {
    render(<DocsPage />);

    // Check presence of key endpoints in document
    expect(screen.getAllByText("Register New Account").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("User Login").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Submit Natural Language Query").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("List Registered Databases").length).toBeGreaterThanOrEqual(1);
  });

  it("filters endpoints when typing in the search bar", () => {
    render(<DocsPage />);

    const searchInput = screen.getByPlaceholderText("Filter endpoints & guides...");
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "Submit Natural Language" } });

    expect(screen.getAllByText("Submit Natural Language Query").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Register New Account")).not.toBeInTheDocument();
  });

  it("allows switching code snippet languages", () => {
    render(<DocsPage />);

    const tsButtons = screen.getAllByRole("button", { name: "TypeScript" });
    expect(tsButtons.length).toBeGreaterThan(0);

    // Click first TypeScript button
    fireEvent.click(tsButtons[0]);

    // Check if fetch code is rendered
    expect(screen.getAllByText(/fetch\(/i).length).toBeGreaterThan(0);
  });
});
