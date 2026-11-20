import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OnboardingPage from "./page";
import * as authApi from "@/lib/auth-api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("OnboardingPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates through the onboarding wizard steps", async () => {
    vi.spyOn(authApi, "updateUserProfile").mockResolvedValue({
      id: "usr_1",
      email: "test@company.com",
      full_name: "Test User",
      is_superuser: false,
      default_workspace_id: "ws-1",
      onboarding_completed: true,
    });

    render(<OnboardingPage />);

    // Step 1: Welcome & persona
    expect(screen.getByText("Welcome to Nexus Query")).toBeInTheDocument();
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2: Name your workspace
    expect(screen.getByText("Name your workspace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next Step/i }));

    // Step 3: Connect your databases
    expect(screen.getByText("Connect your databases")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Preview First Query/i }));

    // Step 4: First Query Walkthrough
    expect(screen.getByText("How to ask your first question")).toBeInTheDocument();
    const finishBtn = screen.getByRole("button", { name: /Enter Workspace & Start Querying/i });
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/chat");
    });
  });
});
