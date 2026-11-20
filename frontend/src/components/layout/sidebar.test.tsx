import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./sidebar";
import { useShellStore } from "@/lib/store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Sidebar Component", () => {
  it("renders the brand, new chat button, search input, and core links", () => {
    useShellStore.setState({ sidebarCollapsed: false });
    render(<Sidebar />);

    expect(screen.getByText("Nexus Query")).toBeInTheDocument();
    expect(screen.getByText("New chat")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search chats...")).toBeInTheDocument();
    expect(screen.getByText("Schema")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
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

  it("opens account dropdown menu with settings and audit log on click", () => {
    useShellStore.setState({
      sidebarCollapsed: false,
      currentUser: {
        id: "usr-1",
        email: "admin@example.com",
        full_name: "Demo Admin",
        is_superuser: true,
        default_workspace_id: "ws-1",
      },
    });
    render(<Sidebar />);

    const accountBtn = screen.getByRole("button", { name: /account menu/i });
    fireEvent.click(accountBtn);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Audit log")).toBeInTheDocument();
    expect(screen.getByText("Executions")).toBeInTheDocument();
    expect(screen.getByText("Saved queries")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });
});
