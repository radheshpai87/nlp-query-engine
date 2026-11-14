import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sidebar } from "./sidebar";
import { useShellStore } from "@/lib/store";

describe("Sidebar Component", () => {
  it("renders workspace name and primary navigation links", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    expect(screen.getByText("Enterprise Analytics")).toBeInTheDocument();
    expect(screen.getByText("New Chat")).toBeInTheDocument();
    expect(screen.getByText("New Conversation")).toBeInTheDocument();
    expect(screen.getByText("Schema Explorer")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("toggles collapsed state when toggle button is clicked", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    const toggleBtn = screen.getByTestId("sidebar-toggle-btn");
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(useShellStore.getState().sidebarCollapsed).toBe(true);

    fireEvent.click(toggleBtn);
    expect(useShellStore.getState().sidebarCollapsed).toBe(false);
  });

  it("renders active target connection indicators", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    expect(screen.getByText("PostgreSQL Orders")).toBeInTheDocument();
    expect(screen.getByText("MongoDB Events")).toBeInTheDocument();
    expect(screen.getByText("Elasticsearch Logs")).toBeInTheDocument();
  });
});
