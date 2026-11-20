import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterPage from "./page";
import * as authApi from "@/lib/auth-api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("RegisterPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders registration inputs and password strength checklist", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("jane@company.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Minimum 8 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  });

  it("submits registration with valid fields and redirects to onboarding", async () => {
    vi.spyOn(authApi, "registerWithCredentials").mockResolvedValue({
      access_token: "mock-jwt-token",
      token_type: "bearer",
      user: {
        id: "usr_new",
        email: "newuser@company.com",
        full_name: "New User",
        is_superuser: false,
        default_workspace_id: "ws_new",
        onboarding_completed: false,
      },
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), {
      target: { value: "New User" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@company.com"), {
      target: { value: "newuser@company.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Minimum 8 characters"), {
      target: { value: "SuperSecret123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "SuperSecret123!" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Account/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.registerWithCredentials).toHaveBeenCalledWith(
        "New User",
        "newuser@company.com",
        "SuperSecret123!"
      );
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });
  });
});
