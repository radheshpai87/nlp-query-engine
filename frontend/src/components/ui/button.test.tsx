import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";

describe("Button UI Component", () => {
  it("renders with default styling and triggers click handler", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Run Query</Button>);

    const btn = screen.getByRole("button", { name: "Run Query" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("handles disabled state correctly", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Action</Button>);

    const btn = screen.getByRole("button", { name: "Disabled Action" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies variant classes correctly", () => {
    render(<Button variant="destructive">Delete Connection</Button>);
    const btn = screen.getByRole("button", { name: "Delete Connection" });
    expect(btn.className).toContain("bg-destructive");
  });
});
