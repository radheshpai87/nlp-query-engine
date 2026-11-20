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

  it("renders production login form with empty input fields", () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign in to Nexus Query")).toBeInTheDocument();
    expect(screen.queryByText("Demo Credentials")).not.toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText("name@example.com") as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;

    expect(emailInput.value).toBe("");
    expect(passwordInput.value).toBe("");
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /Show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe("text");
  });

  it("submits login with entered credentials successfully", async () => {
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

    const emailInput = screen.getByPlaceholderText("name@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "admin@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Admin123!" } });

    const signInBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(authApi.loginWithCredentials).toHaveBeenCalledWith(
        "admin@example.com",
        "Admin123!"
      );
    });
  });
});
