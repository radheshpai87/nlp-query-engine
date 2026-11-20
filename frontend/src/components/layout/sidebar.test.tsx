import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sidebar } from "./sidebar";
import { useShellStore } from "@/lib/store";

describe("Sidebar Component", () => {
  it("renders the brand and grouped navigation", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    expect(screen.getByText("Nexus Query")).toBeInTheDocument();
    expect(screen.getByText("New chat")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(screen.getByText("Schema")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("toggles collapsed state when the toggle button is clicked", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    const toggleBtn = screen.getByTestId("sidebar-toggle-btn");
    fireEvent.click(toggleBtn);
    expect(useShellStore.getState().sidebarCollapsed).toBe(true);

    fireEvent.click(screen.getByTestId("sidebar-toggle-btn"));
    expect(useShellStore.getState().sidebarCollapsed).toBe(false);
  });

  it("does not show fabricated data sources when none are connected", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    expect(screen.queryByText("PostgreSQL Orders")).not.toBeInTheDocument();
    expect(screen.queryByText("MongoDB Events")).not.toBeInTheDocument();
  });
});
