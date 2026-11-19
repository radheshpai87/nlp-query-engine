import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";
import * as authApi from "@/lib/auth-api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and demo credentials box", () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign in to Nexus Query")).toBeInTheDocument();
    expect(screen.getByText("Demo Credentials")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin123!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1-Click Sign In/i })).toBeInTheDocument();
  });

  it("autofills demo credentials when clicking autofill button", () => {
    render(<LoginPage />);

    const autofillBtn = screen.getByRole("button", { name: /Autofill Fields/i });
    fireEvent.click(autofillBtn);

    const emailInput = screen.getByPlaceholderText("name@example.com") as HTMLInputElement;
    expect(emailInput.value).toBe("admin@example.com");
  });

  it("submits login with credentials successfully", async () => {
    vi.spyOn(authApi, "loginWithCredentials").mockResolvedValue({
      access_token: "mock-jwt-token",
      token_type: "bearer",
      user: {
        id: "usr_admin",
        email: "admin@example.com",
        full_name: "Demo Administrator",
        is_superuser: true,
        default_workspace_id: "ws_default",
      },
    });

    render(<LoginPage />);

    const signInBtn = screen.getByRole("button", { name: /1-Click Sign In/i });
    fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(authApi.loginWithCredentials).toHaveBeenCalledWith(
        "admin@example.com",
        "Admin123!"
      );
    });
  });
});
